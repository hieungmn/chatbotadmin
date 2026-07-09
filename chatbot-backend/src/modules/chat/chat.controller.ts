import { Request, Response } from "express";
import pool from "../../config/db";
import { getEmbedding, generateAnswer } from "../../utils/ai";

/**
 * =========================
 * CHAT RAG CONTROLLER (TỐI ƯU CẤU TRÚC EXCEL MỚI)
 * =========================
 */
export const handleChatQuery = async (req: Request, res: Response): Promise<any> => {
    try {
        const { site_id, message, session_id } = req.body;

        if (!site_id || !message) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tham số!"
            });
        }

        const cleanSiteId = String(site_id).trim().toLowerCase();
        const cleanMsg = String(message).trim();

        const finalSessionId =
            session_id ||
            "sess_" + Date.now() + Math.random().toString(36).substring(2, 7);

        const clientIp =
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "127.0.0.1";

        /**
         * =========================
         * SESSION (KEEP ORIGINAL)
         * =========================
         */
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

        /**
         * =========================
         * FALLBACK CONTACT
         * =========================
         */
        const siteRes = await pool.query(
            `SELECT contact_url FROM public.sites WHERE site_id = $1`,
            [cleanSiteId]
        );

        const contactUrl =
            siteRes.rows[0]?.contact_url ||
            "https://support.s-wing.jp";

        const fallbackMsg =
            `申し訳ございません。該当する質問が見つかりませんでした。` +
            `こちらの <a href="${contactUrl}" target="_blank" style="color:#3b82f6;font-weight:bold;">お問い合わせページ</a> からお問い合わせください。`;

        if (cleanMsg.length < 2) {
            return res.json({
                success: true,
                answer: fallbackMsg,
                faq_id: -1, 
                is_fallback: true,
                session_id: finalSessionId
            });
        }

        /**
         * =========================
         * 1. FAQ SEARCH (BẢNG CŨ - GIỮ NGUYÊN)
         * =========================
         */
        const faqQuery = `
            SELECT id, answer_text, redirect_url
            FROM public.faq_master
            WHERE LOWER(site_id) = $1
              AND is_draft = FALSE
              AND (
                LOWER(category) = $2
                OR keywords % $2
                OR POSITION($2 IN LOWER(keywords)) > 0
              )
            LIMIT 1;
        `;

        const faqRes = await pool.query(faqQuery, [cleanSiteId, cleanMsg]);

        if (faqRes.rows.length > 0) {
            return res.json({
                success: true,
                answer: faqRes.rows[0].answer_text,
                redirect_url: faqRes.rows[0].redirect_url,
                faq_id: faqRes.rows[0].id,
                is_fallback: false,
                session_id: finalSessionId,
                source: "faq"
            });
        }

        /**
         * =========================
         * 2. RAG (SỬA ĐỔI: THÊM NGƯỠNG TƯƠNG ĐỒNG VECTOR)
         * =========================
         */
        let contextText = "";

        try {
            // 1. EMBEDDING CÂU HỎI
            const embedding = await getEmbedding(cleanMsg);

            // 2. KIỂM TRA MẢNG VECTOR AN TOÀN
            if (!Array.isArray(embedding) || embedding.length === 0) {
                throw new Error("Invalid embedding");
            }

            const vectorStr = `[${embedding.join(",")}]`;

            // 3. QUÉT VECTOR KÈM NGƯỠNG TƯƠNG ĐỒNG > 0.25 (Đảm bảo lọc bỏ rác hoàn toàn)
            const chunkRes = await pool.query(`
                SELECT content_text, (1 - (embedding <=> $2::vector)) AS similarity
                FROM public.site_knowledge_chunks
                WHERE site_id = $1
                  AND (1 - (embedding <=> $2::vector)) > 0.25
                ORDER BY similarity DESC
                LIMIT 4;
            `, [cleanSiteId, vectorStr]);

            if (chunkRes.rows.length > 0) {
                contextText = chunkRes.rows
                    .map(r => r.content_text)
                    .join("\n\n---\n\n");
            }

        } catch (err) {
            console.error("RAG ERROR (SAFE FALLBACK):", err);

            // Fallback khi lỗi sinh vector: Chỉ bốc các chunk mới nhất có cấu trúc
            const chunkRes = await pool.query(`
                SELECT content_text
                FROM public.site_knowledge_chunks
                WHERE site_id = $1
                ORDER BY created_at DESC
                LIMIT 3;
            `, [cleanSiteId]);

            contextText = chunkRes.rows
                .map(r => r.content_text)
                .join("\n\n---\n\n");
        }

        /**
         * =========================
         * 3. AI GENERATION (GỌI ĐỒNG BỘ)
         * =========================
         */
        const aiAnswer = await generateAnswer(cleanMsg, contextText, contactUrl);
        
        // Nhận diện nếu AI trả về link liên hệ hệ thống (Tức là không biết/câu hỏi phá hoại)
        const isFallback = (aiAnswer === contactUrl || aiAnswer.includes(contactUrl));

        return res.json({
            success: true,
            answer: aiAnswer,
            faq_id: isFallback ? -1 : 999, // Trả về -1 để Front-end nhận diện hiển thị khung bọc nút bấm ✉ お問い合わせ窓口
            is_fallback: isFallback,
            session_id: finalSessionId,
            source: "ai"
        });

    } catch (error) {
        console.error("CHAT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ!"
        });
    }
};

/**
 * =========================
 * SUGGESTIONS (GIỮ NGUYÊN HIỂN THỊ CHIP THEO CATEGORY)
 * =========================
 */
export const getInitialSuggestions = async (req: Request, res: Response) => {
    try {
        const siteId = String(req.query.site_id || "s-wing").trim().toLowerCase();

        const result = await pool.query(`
            SELECT f.category AS chip_label, COUNT(s.id) AS search_count
            FROM public.faq_master f
            LEFT JOIN public.search_logs s ON f.id = s.matched_faq_id
            WHERE LOWER(f.site_id) = $1
              AND f.is_draft = FALSE
            GROUP BY f.category
            ORDER BY search_count DESC
            LIMIT 5;
        `, [siteId]);

        return res.json({
            success: true,
            chips: result.rows
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "DB error"
        });
    }
};

/**
 * =========================
 * FEEDBACK (GIỮ NGUYÊN)
 * =========================
 */
export const submitFeedback = async (req: Request, res: Response): Promise<any> => {
    try {
        const { site_id, session_id, faq_id, search_log_id, score } = req.body;

        const site = site_id ? String(site_id).trim().toLowerCase() : "s-wing";
        const finalScore = score === 1 ? 1 : -1;

        await pool.query(`
            INSERT INTO public.faq_feedback_logs (site_id, session_id, faq_id, search_log_id, score, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW());
        `, [site, session_id || null, faq_id, search_log_id || null, finalScore]);

        return res.json({ success: true, message: "OK" });

    } catch (error) {
        console.error("Feedback DB Error:", error);
        return res.status(500).json({ success: false, message: "Feedback error" });
    }
};