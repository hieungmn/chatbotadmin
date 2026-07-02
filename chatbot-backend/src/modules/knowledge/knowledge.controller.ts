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
        let text = "";

        // 1. XỬ LÝ ĐỌC FILE - KHỬ LỖI VỠ PHÔNG CHỮ NHẬT (MOJIBAKE)
        if (file_type === "word" || file.originalname.endsWith(".docx")) {
            const result = await mammoth.extractRawText({ path: file.path });
            text = result.value;
        } else if (file_type === "excel" || file.originalname.endsWith(".xlsx")) {
            const wb = XLSX.readFile(file.path);
            const sheet = wb.SheetNames[0];
            const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
            text = (data as any[]).map(r => r.join(" ")).join("\n");
        } else {
            // ĐỌC FILE TEXT / CSV BẰNG BUFFER ĐỂ KIỂM TRA BẢNG MÃ GỐC
            const buffer = fs.readFileSync(file.path);
            
            // Kiểm tra dấu hiệu đặc trưng "ÿþ" (0xFF 0xFE) của mã UTF-16 LE
            if (buffer[0] === 0xff && buffer[1] === 0xfe) {
                console.log("📝 Phát hiện file định dạng UTF-16 LE. Tiến hành giải mã chuẩn tiếng Nhật...");
                text = iconv.decode(buffer, "utf-16le");
            } else {
                // Kiểm tra thử bằng mã Shift_JIS của Nhật, nếu dính lỗi thì quay về UTF-8
                const sjisText = iconv.decode(buffer, "Shift_JIS");
                if (sjisText.includes("")) {
                    text = iconv.decode(buffer, "utf-8");
                } else {
                    text = sjisText;
                }
            }
        }

        // Loại bỏ ký tự Null ẩn gây lỗi cho Postgres
        text = text.replace(/\0/g, '').replace(/\x00/g, '');

        if (!text.trim()) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ success: false, message: "File không có nội dung văn bản thô!" });
        }

        // 2. TẠO BẢN GHI TẠM CHO FILE CHA
        const fileRes = await pool.query(`
            INSERT INTO public.site_knowledge_files (site_id, file_name, file_type, file_path, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'processing', NOW(), NOW())
            RETURNING id;
        `, [defaultSiteId, file.originalname, file_type, file.path]);

        const fileId = fileRes.rows[0].id;
        const chunks = splitText(text, 500);

        console.log(`🚀 Bắt đầu nạp tri thức file ID ${fileId}: ${chunks.length} chunks.`);

        // Biến lưu vết trang xuất hiện nhiều nhất trong file nhằm cập nhật lại bảng File cha
        let detectedSiteId = defaultSiteId; 

        // 3. VÒNG LẶP GENERATE VECTOR VÀ PHÂN LOẠI SITE THÔNG MINH
        for (const chunk of chunks) {
            try {
                let targetSiteId = defaultSiteId;

                // Tự động bóc tách phân loại site theo nội dung dòng dữ liệu
                const lowerChunk = chunk.toLowerCase();
                if (lowerChunk.includes("faq_cw_") || lowerChunk.includes("c-wing")) {
                    targetSiteId = "c-wing";
                    detectedSiteId = "c-wing"; // Ghi nhận để cập nhật bảng file cha
                } else if (lowerChunk.includes("faq_sw_") || lowerChunk.includes("s-wing")) {
                    targetSiteId = "s-wing";
                } else if (lowerChunk.includes("faq_can_") || lowerChunk.includes("cansuke")) {
                    targetSiteId = "cansuke";
                    detectedSiteId = "cansuke";
                }

                // Gọi Ollama sinh Vector nhúng (Embedding)
                const vector = await getEmbedding(chunk);

                if (Array.isArray(vector) && vector.length > 0) {
                    const vectorString = `[${vector.join(",")}]`;

                    // Lưu dữ liệu đoạn text thô sạch vào bảng con Chunks
                    await pool.query(`
                        INSERT INTO public.site_knowledge_chunks (file_id, site_id, content_text, embedding, created_at)
                        VALUES ($1, $2, $3, $4::vector, NOW());
                    `, [fileId, targetSiteId, chunk, vectorString]);
                }
            } catch (err) {
                console.error(`❌ Lỗi băm Vector tại chunk của file ${fileId}:`, err);
            }
        }

        // 4. ĐỒNG BỘ CẬP NHẬT: Sửa lại site_id ở bảng File cha và chuyển trạng thái hoàn thành
        await pool.query(`
            UPDATE public.site_knowledge_files 
            SET status = 'completed', 
                site_id = $1, 
                updated_at = NOW() 
            WHERE id = $2;
        `, [detectedSiteId, fileId]);

        // Xóa file tạm trong thư mục uploads sau khi học xong
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        return res.json({
            success: true,
            message: `Xử lý hoàn tất thành công ${chunks.length} chunks tri thức!`
        });

    } catch (err) {
        console.error("❌ LỖI HÀM KNOWLEDGE CONTROLLER:", err);
        const file = (req as any).file;
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(500).json({ success: false, message: "Lỗi xử lý file hệ thống!" });
    }
};