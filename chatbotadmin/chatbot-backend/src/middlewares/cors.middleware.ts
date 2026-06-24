import cors from 'cors';

const corsOptions: cors.CorsOptions = {
    // 🔴 ĐÃ SỬA: Điền chính xác địa chỉ URL của Frontend (Không được để dấu * nếu dùng credentials)
    origin: ['http://localhost:5173', 'http://localhost:3000'], 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

export const corsMiddleware = cors(corsOptions);