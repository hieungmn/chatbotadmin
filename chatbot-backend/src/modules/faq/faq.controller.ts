import { Request, Response } from 'express';
import pool from '../../config/db';
import { ExcelFaqItem } from './faq.interface';

/**
 * HÀM HỖ TRỢ CHUẨN HÓA ALLOWED SITE IDS TỪ QUERY REQ
 */
const parseAllowedSiteIds = (req: Request): string[] => {
    const rawIds = req.query.allowed_site_ids;
    if (!rawIds) return [];
    if (Array.isArray(rawIds)) return rawIds.map(String);
    // Nếu front-end truyền dạng chuỗi cắt nhau bằng dấu phẩy "s-wing,c-wing"
    if (typeof rawIds === 'string') {
        return rawIds.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

/**
 * ==========================================
 * 1. ĐỒNG BỘ FAQ DATABASE
 * ==========================================
 */
export const syncFaqDatabase = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { site_id, faq_list }: { site_id: string; faq_list: ExcelFaqItem[] } = req.body;

        if (!faq_list || !Array.isArray(faq_list)) {
            return res.status(400).json({ success: false, message: "Payload dữ liệu không hợp lệ!" });
        }

        await client.query('BEGIN');

        // Xóa dữ liệu cũ dựa trên phạm vi lựa chọn
        if (site_id === 'auto') {
            await client.query('DELETE FROM public.faq_master');
        } else {
            await client.query('DELETE FROM public.faq_master WHERE LOWER(site_id) = $1', [site_id.trim().toLowerCase()]);
        }

        // Vòng lặp nạp dữ liệu mới
        for (const item of faq_list) {
            let finalSiteId = site_id.trim().toLowerCase();

            if (site_id === 'auto') {
                const idUpper = String(item.data_id || '').toUpperCase();
                if (idUpper.startsWith('FAQ_CW_')) {
                    finalSiteId = 'c-wing';
                } else if (idUpper.startsWith('FAQ_SW_')) {
                    finalSiteId = 's-wing';
                } else if (idUpper.startsWith('FAQ_CAN_')) {
                    finalSiteId = 'cansuke';
                } else if (idUpper.startsWith('FAQ_AB_')) {
                    finalSiteId = 'account-business';
                } else {
                    finalSiteId = 's-wing';
                }
            }

            const dataId = String(item.data_id || '').trim();
            const category = String(item.category || '').trim();
            const question = String(item.question || '').trim(); 
            const keywords = String(item.keywords || '').trim();
            const answerText = String(item.answer_text || '').trim();
            const redirectUrl = String(item.redirect_url || '').trim();
            const isDraft = item.is_draft !== undefined ? Boolean(item.is_draft) : false;

            const insertQuery = `
                INSERT INTO public.faq_master (
                    data_id, site_id, category, question, keywords, answer_text, redirect_url, is_draft, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW());
            `;

            await client.query(insertQuery, [
                dataId,
                finalSiteId,
                category,
                question, 
                keywords,
                answerText,
                redirectUrl,
                isDraft
            ]);
        }

        await client.query('COMMIT');

        try {
            const user = (req as any).user;
            const actorName = user ? (user.full_name || user.username) : 'Hệ thống';
            const logMessage = `Người dùng [${actorName}] đã đồng bộ thành công danh sách gồm ${faq_list.length} câu hỏi FAQ cho trang [Site: ${site_id}] từ file Excel.`;

            await pool.query(`
                INSERT INTO public.admin_audit_logs (action, action_type, details, created_at)
                VALUES ('SYNC_FAQ', 'SYNC_FAQ', $1, NOW());
            `, [logMessage]);
        } catch (logErr) {
            console.warn("⚠️ Cảnh báo: Lỗi ghi log hệ thống, nhưng dữ liệu FAQ đã đồng bộ thành công.", logErr);
        }

        return res.json({
            success: true,
            message: `Đồng bộ hoàn tất cấu trúc dữ liệu ${faq_list.length} FAQ thành công!`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ LỖI ĐỒNG BỘ BẢNG FAQ MASTER:", error);
        return res.status(500).json({ success: false, message: "Đồng bộ dữ liệu thất bại!" });
    } finally {
        client.release();
    }
};

/**
 * ==========================================
 * 2. LẤY TOÀN BỘ DANH SÁCH FAQ MASTER
 * ==========================================
 */
export const getFaqMasterList = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const allowedSiteIds = parseAllowedSiteIds(req); // 🎯 Đã chuẩn hóa ép kiểu mảng chuỗi

        let queryStr = `
            SELECT f.id, f.data_id, f.site_id, f.category, f.question, f.keywords, f.answer_text, f.redirect_url, f.is_draft, f.created_at 
            FROM public.faq_master f
        `;
        let queryParams: any[] = [];

        if (user && user.role !== 'admin') {
            if (allowedSiteIds.length > 0) {
                queryStr += ' WHERE f.site_id = ANY($1)';
                queryParams.push(allowedSiteIds);
            } else {
                return res.json({ success: true, faqs: [] });
            }
        }

        queryStr += ' ORDER BY f.id DESC';
        const resDb = await pool.query(queryStr, queryParams);

        return res.json({ success: true, faqs: resDb.rows });
    } catch (error) {
        console.error("❌ LỖI LẤY DANH SÁCH FAQ:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

/**
 * ==========================================
 * 3. LẤY CHI TIẾT 1 BẢN GHI FAQ THEO ID
 * ==========================================
 */
export const getFaqMasterById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const resDb = await pool.query(`
            SELECT id, data_id, site_id, category, question, keywords, answer_text, redirect_url, is_draft, created_at, updated_at
            FROM public.faq_master 
            WHERE id = $1;
        `, [id]);

        if (resDb.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi dữ liệu!" });
        }

        return res.json({ success: true, faq: resDb.rows[0] });
    } catch (error) {
        console.error("❌ LỖI LẤY CHI TIẾT FAQ:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

/**
 * ==========================================
 * 4. CẬP NHẬT TRẠNG THÁI BẢN NHÁP
 * ==========================================
 */
export const updateFaqDraftStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_draft } = req.body;

        await pool.query(`
            UPDATE public.faq_master 
            SET is_draft = $1, updated_at = NOW() 
            WHERE id = $2;
        `, [Boolean(is_draft), id]);

        return res.json({ success: true, message: "Cập nhật trạng thái nháp thành công!" });
    } catch (error) {
        console.error("❌ LỖI CẬP NHẬT TRẠNG THÁI NHÁP:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

/**
 * ==========================================
 * 5. XÓA VĨNH VIỄN MỘT FAQ
 * ==========================================
 */
export const deleteFaqMasterItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM public.faq_master WHERE id = $1', [id]);

        return res.json({ success: true, message: "Xóa bản ghi dữ liệu FAQ thành công!" });
    } catch (error) {
        console.error("❌ LỖI XÓA BẢN GHI FAQ MASTER:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

/**
 * ==========================================
 * 6. LẤY DANH SÁCH SITES
 * ==========================================
 */
export const getSites = async (req: Request, res: Response) => {
    try {
        const resDb = await pool.query('SELECT * FROM public.sites ORDER BY site_id ASC');
        return res.json({ success: true, sites: resDb.rows });
    } catch (error) {
        console.error("❌ LỖI LẤY SITES:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

/**
 * ==========================================
 * 7. THỐNG KÊ PHÂN TÍCH SEARCH
 * ==========================================
 */
export const getSearchAnalytics = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const allowedSiteIds = req.query.allowed_site_ids as string[];

        // 🎯 ĐÃ SỬA: Bỏ cột created_at không tồn tại ở DB mới để tránh lỗi 42703 (errorMissingColumn)
        let queryStr = `
            SELECT id, site_id, session_id, query_text, matched_faq_id 
            FROM public.search_logs
        `;
        let queryParams: any[] = [];

        if (user && user.role !== 'admin') {
            if (allowedSiteIds && allowedSiteIds.length > 0) {
                queryStr += ' WHERE site_id = ANY($1)';
                queryParams.push(allowedSiteIds);
            } else {
                return res.json({ success: true, analytics: [] });
            }
        }

        // 🎯 ĐÃ SỬA: Sắp xếp theo id DESC thay vì gán created_at DESC
        queryStr += ' ORDER BY id DESC LIMIT 200';
        const resDb = await pool.query(queryStr, queryParams);
        return res.json({ success: true, analytics: resDb.rows });
    } catch (error) {
        console.error("❌ LỖI LẤY THỐNG KÊ SEARCH:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

export const getAdminUsers = async (req: Request, res: Response) => {
    try {
        const resDb = await pool.query('SELECT id, username, site_id, full_name, is_active FROM public.users ORDER BY id DESC');
        return res.json({ success: true, users: resDb.rows });
    } catch (error) {
        console.error("❌ LỖI LẤY USERS:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const allowedSiteIds = parseAllowedSiteIds(req); // 🎯 ĐÃ SỬA: Ép mảng chữ chuẩn hóa cho logs

        let queryStr = 'SELECT * FROM public.admin_audit_logs';
        let queryParams: any[] = [];

        if (user && user.role !== 'admin') {
            if (allowedSiteIds.length > 0) {
                queryStr += ' WHERE site_id = ANY($1)';
                queryParams.push(allowedSiteIds);
            } else {
                return res.json({ success: true, logs: [] });
            }
        }

        queryStr += ' ORDER BY created_at DESC LIMIT 100';
        const resDb = await pool.query(queryStr, queryParams);
        return res.json({ success: true, logs: resDb.rows });
    } catch (error) {
        console.error("❌ LỖI LẤY LOGS:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};