import { Request, Response } from 'express';
import pool from '../../config/db';

export const handleChatQuery = async (req: Request, res: Response) => {
    try {
        const { site_id, message, session_id } = req.body;
        if (!site_id || !message) return res.status(400).json({ success: false, message: "Thiếu tham số!" });

        const cleanSiteId = String(site_id).trim().toLowerCase();
        const cleanMsg = String(message).trim().toLowerCase();
        
        // Tạo mã phiên làm việc ngẫu nhiên nếu client chưa truyền session_id xuống
        const finalSessionId = session_id || 'sess_' + Date.now() + Math.random().toString(36).substring(2, 7);
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        // 1. ĐẢM BẢO CÓ BẢN GHI PHIÊN
        await pool.query(`
            INSERT INTO public.chat_sessions (session_id, site_id, ip_address, created_at, last_active_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `, [finalSessionId, cleanSiteId, String(clientIp)]);

        await pool.query(`
            UPDATE public.chat_sessions 
            SET last_active_at = NOW() 
            WHERE site_id = $1 AND session_id = $2;
        `, [cleanSiteId, finalSessionId]);

        // 2. Tìm link liên hệ dự phòng của Kênh từ bảng public.sites
        const siteRes = await pool.query(`SELECT contact_url FROM public.sites WHERE site_id = $1`, [cleanSiteId]);
        const targetContactUrl = siteRes.rows.length > 0 ? siteRes.rows[0].contact_url : 'https://support.s-wing.jp';

        const fallbackMsg = `申し訳ございません。該当する質問が見つかりませんでした。お手数ですが、こちらの <a href="${targetContactUrl}" target="_blank" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">お問い合わせページ (Trang liên hệ)</a> から直接お問い合わせください。`;

        if (cleanMsg.length < 2) {
            return res.json({ success: true, answer: fallbackMsg, session_id: finalSessionId });
        }

        // 3. Sử dụng GIN Index tra cứu bảng public.faq_master (is_draft = FALSE)
        const querySearch = `
            SELECT id, answer_text, redirect_url FROM public.faq_master 
            WHERE LOWER(site_id) = $1 AND is_draft = FALSE AND (
                LOWER(category) = $2 OR 
                keywords % $2 OR
                POSITION(LOWER(keywords) IN $2) > 0 OR
                POSITION($2 IN LOWER(keywords)) > 0
            ) LIMIT 1;
        `;
        const resDb = await pool.query(querySearch, [cleanSiteId, cleanMsg]);

        if (resDb.rows.length > 0) {
            const matchedFaqId = resDb.rows[0].id;

            // Ghi nhận log lịch sử tìm kiếm THÀNH CÔNG (is_missed = FALSE)
            const logSearchSuccess = `
                INSERT INTO public.search_logs (session_id, site_id, query_text, is_missed, matched_faq_id, searched_at)
                VALUES ($1, $2, $3, FALSE, $4, NOW()) RETURNING id;
            `;
            const logRes = await pool.query(logSearchSuccess, [finalSessionId, cleanSiteId, cleanMsg, matchedFaqId]);

            return res.json({ 
                success: true, 
                answer: resDb.rows[0].answer_text, 
                redirect_url: resDb.rows[0].redirect_url, 
                faq_id: matchedFaqId,
                search_log_id: logRes.rows[0].id,
                session_id: finalSessionId
            });
        }

        // 4. Nếu KHÔNG TÌM THẤY -> Ghi nhận log lịch sử tìm kiếm THẤT BẠI (is_missed = TRUE)
        const logSearchMiss = `
            INSERT INTO public.search_logs (session_id, site_id, query_text, is_missed, matched_faq_id, searched_at)
            VALUES ($1, $2, $3, TRUE, NULL, NOW()) RETURNING id;
        `;
        const logMissRes = await pool.query(logSearchMiss, [finalSessionId, cleanSiteId, cleanMsg]);

        return res.json({ 
            success: true, 
            answer: fallbackMsg, 
            search_log_id: logMissRes.rows[0].id,
            session_id: finalSessionId 
        });

    } catch (error) {
        console.error("❌ LỖI HÀM XỬ LÝ QUERY CHATBOT:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ!" });
    }
};

export const getInitialSuggestions = async (req: Request, res: Response) => {
    try {
        const siteId = String(req.query.site_id || 's-wing').trim().toLowerCase();
        
        // Thuật toán: Đếm số lần các câu hỏi trong từng danh mục (category) được tìm kiếm trong bảng search_logs,
        // danh mục nào được tìm nhiều nhất (Hot nhất) sẽ tự động đẩy lên đầu.
        const queryPopularCategories = `
            SELECT f.category AS chip_label, COUNT(s.id) AS search_count
            FROM public.faq_master f
            LEFT JOIN public.search_logs s ON f.id = s.matched_faq_id
            WHERE LOWER(f.site_id) = $1 AND f.is_draft = FALSE
            GROUP BY f.category
            ORDER BY search_count DESC, f.category ASC
            LIMIT 5;
        `;
        
        const resDb = await pool.query(queryPopularCategories, [siteId]);
        
        // Trả dữ liệu sạch về cho Widget hiển thị thành các nút bấm nhanh (Chips)
        return res.json({ success: true, chips: resDb.rows });
    } catch (error) {
        console.error("❌ LỖI LẤY CHIPS GỢI Ý THEO ĐỘ HOT:", error);
        return res.status(500).json({ success: false, message: "Lỗi cơ sở dữ liệu!" });
    }
};

export const submitFeedback = async (req: Request, res: Response) => {
    try {
        const { site_id, session_id, faq_id, search_log_id, score } = req.body;
        const finalSite = site_id ? String(site_id).trim().toLowerCase() : 's-wing';
        
        // 🔴 ĐÃ SỬA: Ép kiểu khớp chính xác CHECK (score IN (1, -1)) của file 9 bảng thực tế
        const finalScore = score === 1 ? 1 : -1;

        const queryFeedback = `
            INSERT INTO public.faq_feedback_logs (site_id, session_id, faq_id, search_log_id, score, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW());
        `;
        
        await pool.query(queryFeedback, [
            finalSite,
            session_id || null,
            faq_id,
            search_log_id || null,
            finalScore
        ]);

        return res.json({ success: true, message: "Cảm ơn bạn đã gửi đánh giá!" });
    } catch (error) {
        console.error("❌ LỖI GHI PHẢN HỒI FEEDBACK LOGS:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server không thể ghi nhận đánh giá!" });
    }
};