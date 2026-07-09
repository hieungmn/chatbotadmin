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
 * EMBEDDING
 * ==========================================
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "nomic-embed-text",
                input: text,
            }),
        });

        const data = await safeJson(res);

        if (!res.ok) {
            console.error("❌ Embedding error:", data);
            throw new Error("Embedding failed");
        }

        return data?.embeddings?.[0] ?? [];
    } catch (err) {
        console.error("❌ Embedding crash:", err);
        throw err;
    }
};

/**
 * ==========================================
 * CHAT GENERATION
 * ==========================================
 */
export const generateAnswer = async (
    question: string,
    context: string,
    contactUrl: string
): Promise<string> => {
    try {
        const prompt = `
You are a helpful Japanese customer support assistant.

Your task is to answer the user's QUESTION using the provided CONTEXT.

Rules:
1. Always answer in Japanese.
2. Use ONLY the information in CONTEXT.
3. If the answer can be inferred from multiple pieces of context, combine them naturally.
4. Never make up information.
5. If the answer cannot be found in the CONTEXT, output exactly:

CON_TACT_URL

Do NOT explain.
Do NOT apologize.
Do NOT include any URL.
Do NOT write "CON_TACT_URL:".
Output ONLY the single word CON_TACT_URL.

=========================
CONTEXT
${context?.trim() || "No related information."}

=========================
QUESTION
${question}

=========================
ANSWER
`;

        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gemma3:4b",
                system: `
You are a Japanese customer support AI.

Always answer in Japanese.

Use only the provided context.

Never invent information.

If the answer cannot be found,
reply with exactly:

CON_TACT_URL

Nothing else.
`,
                prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    top_p: 0.95,
                    num_ctx: 8192,
                    num_predict: 512,
                    repeat_penalty: 1.1,
                },
            }),
        });

        const data = await safeJson(res);

        if (!res.ok) {
            console.error("❌ Chat error:", data);
            throw new Error("Chat failed");
        }

        let aiResponse = (data?.response || "").trim();

        // Remove markdown brackets
        if (
            aiResponse.startsWith("[") &&
            aiResponse.endsWith("]")
        ) {
            aiResponse = aiResponse.slice(1, -1).trim();
        }

        // Nếu model có chứa CON_TACT_URL ở bất kỳ đâu
        // thì chỉ trả về link cho frontend
        if (aiResponse.toUpperCase().includes("CON_TACT_URL")) {
            return contactUrl;
        }

        // Không có nội dung
        if (!aiResponse) {
            return contactUrl;
        }

        return aiResponse;
    } catch (err) {
        console.error("❌ Chat crash:", err);
        return contactUrl;
    }
};