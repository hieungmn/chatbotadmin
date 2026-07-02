import express from 'express';
import { corsMiddleware } from './middlewares/cors.middleware';
import { adminLogin } from './modules/auth/auth.controller';
import path from 'path';
import userRoutes from './modules/user/user.routes'; // Đảm bảo đúng đường dẫn file của bạn
import {
syncFaqDatabase,
getSearchAnalytics,
getSites,
getAuditLogs
} from './modules/faq/faq.controller';
import chatRouter from './modules/chat/chat.route';
import { verifyToken } from './middlewares/auth.middleware';
import cors from 'cors'; // 1. Import thêm thư viện cors chuẩn
import knowledgeRoutes from './modules/knowledge/knowledge.route';
const app = express();

// ==========================================
// 1. ĐĂNG KÝ MIDDLEWARE HỆ THỐNG
// ==========================================
// 🔴 ĐÃ SỬA: Chỉ dùng duy nhất corsMiddleware chuẩn của bạn, XÓA bỏ dòng cors({ origin: '*' }) gây lỗi credentials
app.use(corsMiddleware);
// 🎯 ĐĂNG KÝ TUYẾN ĐƯỜNG KNOWLEDGE AI VÀO HỆ THỐNG:
app.use('/api/v1/knowledge', knowledgeRoutes);
// Khởi tạo thư mục tĩnh để có thể truy cập hoặc lưu file tạm nếu cần
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Mở công khai thư mục public chứa file widget tĩnh
app.use('/static', express.static(path.join(__dirname, '../public/static')));
// ==========================================
// 2. ĐẦU TUYẾN KẾT NỐI API ĐỒNG BỘ FRONTEND
// ==========================================
// 📌 Phân hệ Vận hành Chat Widget (Dùng trọn bộ Router chat đã gom)
app.use('/api/v1/chat', chatRouter);
// 📌 Phân hệ Quản lý Nhân sự (Khớp 100% với url gọi từ file ManageUsers.tsx)
app.use('/api/v1/staff-users', userRoutes);
// 📌 Phân hệ Xác thực tài khoản (Auth Login)
app.post('/api/v1/auth/admin/login', adminLogin);
// 📌 Phân hệ Quản trị nâng cao (Admin FAQ / Analytics Logs / Excel Sync)
app.post('/api/v1/admin/faq/sync', syncFaqDatabase);
app.get('/api/v1/admin/analytics', getSearchAnalytics);
app.get('/api/v1/admin/sites', verifyToken, getSites);
app.get('/api/v1/admin/audit-logs', getAuditLogs);

app.use(cors({
  origin: '*', // 🎯 Dòng này cho phép mọi nguồn gọi vào, không bị chặn nữa
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


export default app; 

