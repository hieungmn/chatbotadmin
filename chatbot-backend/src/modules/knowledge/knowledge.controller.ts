import { Request, Response } from "express";
import pool from "../../config/db";
import { getEmbedding } from "../../utils/ai";
import fs from "fs";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import iconv from "iconv-lite"; // Thư viện xử lý phông chữ Nhật cực mạnh

/**
 * HÀM CẮT ĐOẠN VĂN BẢN THEO DÒNG
 */
const splitText = (text: string, size = 500) => {
    const chunks: string[] = [];
    let current = "";

    for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        if ((current + line).length > size) {
            if (current) chunks.push(current.trim());
            current = line;
        } else {
            current += "\n" + line;
        }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
};

export const uploadKnowledgeFileController = async (req: Request, res: Response) => {
    try {
        const { site_id, file_type } = req.body;
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        let defaultSiteId = String(site_id).trim().toLowerCase();
        
        // 1. TẠO BẢN GHI TẠM CHO FILE CHA TRƯỚC
        const fileRes = await pool.query(`
            INSERT INTO public.site_knowledge_files (site_id, file_name, file_type, file_path, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'processing', NOW(), NOW())
            RETURNING id;
        `, [defaultSiteId, file.originalname, file_type, file.path]);
        const fileId = fileRes.rows[0].id;

        let detectedSiteId = defaultSiteId; 

        // 2. XỬ LÝ ĐỌC FILE VÀ LƯU CHUNK TRỰC TIẾP ĐỂ TRÁNH LỆCH TRANG
        if (file_type === "excel" || file.originalname.endsWith(".xlsx")) {
            const wb = XLSX.readFile(file.path);
            const sheet = wb.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]) as any[];

            console.log(`🚀 Bắt đầu nạp Excel: Xử lý cô lập ${rows.length} hàng dữ liệu.`);

            for (const row of rows) {
                const category = row.category || row.Category || "";
                const question = row.question || row.Question || "";
                const keywords = row.keywords || row.Keywords || "";
                const answer = row.answer_text || row.answer || "";
                const redirectUrl = row.redirect_url || row.redirectUrl || "";
                const dataId = String(row.data_id || row.DataId || "").toUpperCase();

                if (!question && !answer) continue;

                // Định dạng nội dung đóng gói gọn gàng cho 1 câu hỏi duy nhất
                const chunkContent = `[Category]: ${category}\n[Question]: ${question}\n[Keywords]: ${keywords}\n[Answer]: ${answer}\n[Redirect URL]: ${redirectUrl}`;

                // 🎯 GIẢI PHÁP ĐỘC LẬP SITE: Nhận diện site_id ưu tiên tuyệt đối theo mã tiền tố hàng đó
                let targetSiteId = defaultSiteId;
                if (dataId.startsWith('FAQ_CW_') || chunkContent.toLowerCase().includes("c-wing")) {
                    targetSiteId = "c-wing";
                } else if (dataId.startsWith('FAQ_SW_') || chunkContent.toLowerCase().includes("s-wing")) {
                    targetSiteId = "s-wing";
                } else if (dataId.startsWith('FAQ_CAN_') || chunkContent.toLowerCase().includes("cansuke")) {
                    targetSiteId = "cansuke";
                } else if (dataId.startsWith('FAQ_AB_') || chunkContent.toLowerCase().includes("account-business")) {
                    targetSiteId = "account-business";
                }

                detectedSiteId = targetSiteId;

                // Sinh vector cho chunk sạch này
                const vector = await getEmbedding(chunkContent);
                if (Array.isArray(vector) && vector.length > 0) {
                    const vectorString = `[${vector.join(",")}]`;
                    await pool.query(`
                        INSERT INTO public.site_knowledge_chunks (file_id, site_id, content_text, embedding, created_at)
                        VALUES ($1, $2, $3, $4::vector, NOW());
                    `, [fileId, targetSiteId, chunkContent, vectorString]);
                }
            }
        } else {
            // XỬ LÝ CHO FILE WORD / TEXT (GIỮ NGUYÊN HOẶC ĐỂ CHUNK LỚN)
            let text = "";
            if (file_type === "word" || file.originalname.endsWith(".docx")) {
                const result = await mammoth.extractRawText({ path: file.path });
                text = result.value;
            } else {
                const buffer = fs.readFileSync(file.path);
                text = iconv.decode(buffer, "utf-8");
            }

            text = text.replace(/\0/g, '').replace(/\x00/g, '');
            const chunks = splitText(text, 500);

            for (const chunk of chunks) {
                let targetSiteId = defaultSiteId;
                const lowerChunk = chunk.toLowerCase();
                if (lowerChunk.includes("faq_cw_") || lowerChunk.includes("c-wing")) targetSiteId = "c-wing";
                else if (lowerChunk.includes("faq_sw_") || lowerChunk.includes("s-wing")) targetSiteId = "s-wing";
                else if (lowerChunk.includes("faq_can_") || lowerChunk.includes("cansuke")) targetSiteId = "cansuke";

                const vector = await getEmbedding(chunk);
                if (Array.isArray(vector) && vector.length > 0) {
                    const vectorString = `[${vector.join(",")}]`;
                    await pool.query(`
                        INSERT INTO public.site_knowledge_chunks (file_id, site_id, content_text, embedding, created_at)
                        VALUES ($1, $2, $3, $4::vector, NOW());
                    `, [fileId, targetSiteId, chunk, vectorString]);
                }
            }
        }

        // 3. HOÀN THÀNH FILE CHA
        await pool.query(`
            UPDATE public.site_knowledge_files 
            SET status = 'completed', site_id = $1, updated_at = NOW() 
            WHERE id = $2;
        `, [detectedSiteId, fileId]);

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        return res.json({ success: true, message: "Xử lý cô lập tri thức theo hàng thành công!" });

    } catch (err) {
        console.error("❌ LỖI HÀM KNOWLEDGE CONTROLLER:", err);
        const file = (req as any).file;
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(500).json({ success: false, message: "Lỗi xử lý file hệ thống!" });
    }
};