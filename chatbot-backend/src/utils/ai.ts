const OLLAMA_URL = "http://localhost:11434";

/**
 * SAFE JSON PARSE
 */
const safeJson = async (res: Response): Promise<any> => {
    try {
        return await res.json();
    } catch {
        return null;
    }
};

/**
 * ==========================================
 * EMBEDDING (Biến đổi văn bản thành Vector)
 * ==========================================
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "nomic-embed-text",
                prompt: text,
            }),
        });

        const data = await safeJson(res);

        if (!res.ok) {
            console.error("❌ Embedding error:", data);
            throw new Error("Embedding failed");
        }

        return data?.embedding || [];
    } catch (err) {
        console.error("❌ Embedding crash:", err);
        throw err;
    }
};

/**
 * ==========================================
 * CHAT GENERATION ( gemma3:4b Local RAG)
 * ==========================================
 */
export const generateAnswer = async (
    question: string,
    context: string,
    contactUrl: string
): Promise<string> => {
    try {
        // 🔓 BỎ ĐOẠN CHECK CŨ: Không chặn return contactUrl ở đây nữa!
        // if (!context || context.trim() === "") { return contactUrl; }

        // Viết lại Prompt mềm dẻo hơn
        const prompt = `
You are a helpful customer support AI assistant.

[CÁCH TRẢ LỜI]:
1. Nếu có "NGỮ CẢNH" phía dưới, hãy ưu tiên dùng nó để trả lời thật chính xác.
2. Nếu "NGỮ CẢNH" trống hoặc không liên quan, không được tự bịa mà hãy trả lời lịch sự không biết.
3. Chỉ khi nào câu hỏi hoàn toàn vô nghĩa, phá hoại hoặc bạn tuyệt đối không thể trả lời được, bạn mới trả về duy nhất chuỗi này: [${contactUrl}]

================
NGỮ CẢNH:
${context || "Không có tài liệu cụ thể cho câu hỏi này."}

================
CÂU HỎI:
${question}
`;

        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: " gemma3:4b",
                prompt,
                stream: false,
                options: {
                    temperature: 0, // 🎯 TĂNG LÊN 0.7: Cho phép AI tư duy, sáng tạo và tự sinh câu trả lời tự do
                    top_p: 0.9,
                    num_predict: 512,
                },
            }),
        });

        const data = await safeJson(res);
        if (!res.ok) throw new Error("Chat failed");

        let aiResponse = data?.response?.trim() || contactUrl;

        if (aiResponse.startsWith('[') && aiResponse.endsWith(']')) {
            aiResponse = aiResponse.slice(1, -1).trim();
        }

        return aiResponse;
    } catch (err) {
        console.error("❌ Chat crash:", err);
        return contactUrl;
    }
};