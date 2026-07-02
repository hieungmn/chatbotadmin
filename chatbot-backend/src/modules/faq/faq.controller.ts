import { Request, Response } from 'express';
import pool from '../../config/db';
import { ExcelFaqItem } from './faq.interface';

export const syncFaqDatabase = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { site_id, faq_list }: { site_id: string; faq_list: ExcelFaqItem[] } = req.body;

        if (!faq_list || !Array.isArray(faq_list)) {
            return res.status(400).json({ success: false, message: "Payload dữ liệu không hợp lệ!" });
        }

        await client.query('BEGIN');

        // 1. Xóa dữ liệu cũ trong bảng faq_master dựa trên phạm vi lựa chọn
        if (site_id === 'auto') {
            await client.query('DELETE FROM public.faq_master');
        } else {
            await client.query('DELETE FROM public.faq_master WHERE LOWER(site_id) = $1', [site_id.trim().toLowerCase()]);
        }

        // 2. Vòng lặp băm phân phối và nạp đè dữ liệu mới
        for (const item of faq_list) {
            let finalSiteId = site_id.trim().toLowerCase();

            // Nhận diện Kênh tự động theo mã tiền tố của file Excel (Auto-route)
            if (site_id === 'auto') {
                const idUpper = String(item.data_id || '').toUpperCase();
                if (idUpper.includes('CW')) finalSiteId = 'c-wing';
                else if (idUpper.includes('CS') || idUpper.includes('CANSUKE')) finalSiteId = 'cansuke';
                else if (idUpper.includes('AB') || idUpper.includes('ACCOUNT')) finalSiteId = 'account-business';
                else finalSiteId = 's-wing';
            }

            const queryInsert = `
                INSERT INTO public.faq_master (data_id, site_id, category, keywords, answer_text, redirect_url, is_draft)
                VALUES ($1, $2, $3, $4, $5, $6, FALSE)
                ON CONFLICT (site_id, data_id) 
                DO UPDATE SET 
                    category = EXCLUDED.category,
                    keywords = EXCLUDED.keywords,
                    answer_text = EXCLUDED.answer_text,
                    redirect_url = EXCLUDED.redirect_url,
                    is_draft = FALSE,
                    updated_at = NOW();
            `;

            await client.query(queryInsert, [
                String(item.data_id || '').trim(),
                finalSiteId,
                item.category || 'Chung',
                item.keywords || '',
                item.answer_text,
                item.redirect_url || null
            ]);
        }

        await client.query('COMMIT');
        return res.json({ success: true, message: "Đồng bộ cơ sở dữ liệu Schema V2 thành công!" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ LỖI ĐỒNG BỘ CSDL FAQ:", error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống khi đồng bộ SQL!" });
    } finally {
        client.release();
    }
};

export const getSearchAnalytics = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        // 🛡️ BỌC LÓT: Nếu allowed_site_ids bị undefined hoặc rỗng, tự động ép về mảng trống []
        const allowedSiteIds = (req.query.allowed_site_ids as string[]) || [];

        let queryStr = `
            SELECT site_id, query_text AS keyword, COUNT(*) AS hit_count 
            FROM public.search_logs 
            WHERE is_missed = TRUE 
        `;
        let queryParams: any[] = [];

        // PHÂN QUYỀN:
        // Nếu là ADMIN -> Cho qua luôn, lấy toàn bộ không cần check mảng site
        // Nếu là STAFF -> Mới bắt buộc lọc theo Site được cấp quyền
        if (user && user.role !== 'admin') {
            if (allowedSiteIds.length > 0) {
                queryStr += ' AND site_id = ANY($1)';
                queryParams.push(allowedSiteIds);
            } else {
                // Nhân viên chưa được cấp site nào -> Trả về mảng rỗng an toàn, không crash
                return res.json({ success: true, top_missed_keywords: [] });
            }
        }

        // Gom nhóm và sắp xếp
        queryStr += `
            GROUP BY site_id, query_text 
            ORDER BY hit_count DESC;
        `;

        const resDb = await pool.query(queryStr, queryParams);

        // Map dữ liệu chuẩn cấu trúc để trả về Frontend
        const formattedData = resDb.rows.map(row => ({
            site_id: row.site_id,
            keyword_missed: row.keyword,
            count: parseInt(row.hit_count, 10)
        }));

        return res.json({ success: true, top_missed_keywords: formattedData });
    } catch (error) {
        console.error("❌ LỖI TRUY VẤN ANALYTICS SCHEMA V2:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server khi thống kê lịch sử tìm kiếm!" });
    }
};
export const getSites = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        console.log("=== USER GỌI GET SITES ===", user);

        // 🚨 THÊM ĐOẠN CHECK AN TOÀN NÀY:
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Không tìm thấy thông tin xác thực. Vui lòng kiểm tra lại Middleware tại Router!" 
            });
        }

        let queryStr = 'SELECT * FROM public.sites WHERE 1 = 1';
        let queryParams: any[] = [];

        // NẾU LÀ ADMIN
        if (String(user.role).toLowerCase().trim() === 'admin') {
            queryStr += ' ORDER BY site_id ASC';
            const resDb = await pool.query(queryStr, queryParams);
            return res.json({ success: true, sites: resDb.rows });
        }

        // NẾU LÀ STAFF
        let allowedSiteIds: string[] = [];
        if (Array.isArray(req.query.allowed_site_ids)) {
            allowedSiteIds = req.query.allowed_site_ids as string[];
        } else if (typeof req.query.allowed_site_ids === 'string') {
            allowedSiteIds = [req.query.allowed_site_ids];
        }

        if (allowedSiteIds.length > 0) {
            queryStr += ' AND site_id = ANY($1)';
            queryParams.push(allowedSiteIds);
        } else {
            return res.json({ success: true, sites: [] });
        }

        queryStr += ' ORDER BY site_id ASC';
        const resDb = await pool.query(queryStr, queryParams);
        return res.json({ success: true, sites: resDb.rows });

    } catch (error) {
        console.error("❌ BIẾN CỐ NỔ LỖI 500 TẠI GETSITES:", error);
        return res.status(500).json({ success: false, message: "Lỗi xử lý Server nội bộ!" });
    }
};
export const getUsers = async (req: Request, res: Response) => {
    try {
        // Danh sách nhân viên (Chỉ phân hệ quản lý user của Admin mới sờ tới, giữ nguyên truy vấn gốc)
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
        const allowedSiteIds = req.query.allowed_site_ids as string[];

        let queryStr = 'SELECT * FROM public.admin_audit_logs';
        let queryParams: any[] = [];

        // Nếu không phải admin, lọc nhật ký hoạt động thuộc phạm vi các site được giao
        if (user && user.role !== 'admin') {
            if (allowedSiteIds && allowedSiteIds.length > 0) {
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
        console.error("❌ LỖI LẤY AUDIT LOGS:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
};