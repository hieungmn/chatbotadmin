import { Request, Response } from 'express';
import pool from '../../config/db';
import jwt from 'jsonwebtoken';

export const adminLogin = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // 1. Chuẩn hóa chuỗi nhập vào tránh lỗi viết hoa/thường
        const lowerUsername = username ? username.trim().toLowerCase() : '';
        
        // 2. Khai báo các biến lưu thông tin tài khoản cuối cùng
        let finalId = 0;
        let finalUsername = '';
        let userRole = 'staff';

        // 3. Truy vấn tài khoản từ bảng public.admin_users
        const resDb = await pool.query(
            'SELECT * FROM public.admin_users WHERE LOWER(username) = $1 AND is_active = TRUE', 
            [lowerUsername]
        );
        
        if (resDb.rows.length === 0) {
            // Cứu cánh nếu DB lỗi hoặc trống dữ liệu tài khoản mặc định
            if ((lowerUsername === 'admin' || lowerUsername === 'user') && password === '123456') {
                finalId = lowerUsername === 'admin' ? 1 : 2;
                finalUsername = lowerUsername; // 'admin' hoặc 'user'
                userRole = lowerUsername === 'admin' ? 'admin' : 'staff';
            } else {
                return res.status(401).json({ success: false, message: "Tài khoản không tồn tại hoặc bị khóa!" });
            }
        } else {
            const dbUser = resDb.rows[0];
            // So sánh mật khẩu
            if (password !== dbUser.password_hash) { 
                return res.status(401).json({ success: false, message: "Mật khẩu không chính xác!" });
            }
            finalId = dbUser.id;
            finalUsername = dbUser.username;
            userRole = dbUser.role || 'staff';
        }

        // BẢO HIỂM TUYỆT ĐỐI: Ép lại quyền theo đúng tên đăng nhập để bẻ gãy mọi lỗi cache DB cũ
        if (lowerUsername === 'admin') {
            userRole = 'admin';
        } else if (lowerUsername === 'user') {
            userRole = 'staff';
        }

        // 4. Ký quyền thực tế vào Payload của JWT
        const token = jwt.sign(
            { id: finalId, username: finalUsername, role: userRole }, 
            'SECRET_KEY_BOT_2026', 
            { expiresIn: '1d' }
        );

        // 5. GHI LOG HOẠT ĐỘNG VÀO BẢNG NHẬT KÝ
        try {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            await pool.query(
                `INSERT INTO public.admin_audit_logs (admin_id, action_type, details, ip_address, created_at) 
                 VALUES ($1, 'LOGIN', $2, $3, NOW())`,
                [
                    finalId, 
                    `Tài khoản ${finalUsername} (${userRole.toUpperCase()}) đăng nhập thành công vào hệ thống.`, 
                    String(clientIp)
                ]
            );
        } catch (logError) {
            // Cấu trúc chuẩn tránh lỗi 'unknown' của TypeScript Strict Mode
            if (logError instanceof Error) {
                console.error("⚠️ Tạm thời bỏ qua ghi log hoạt động:", logError.message);
            } else {
                console.error("⚠️ Tạm thời bỏ qua ghi log hoạt động:", String(logError));
            }
        }

        // 6. TRẢ DỮ LIỆU CHUẨN VỀ CHO FRONTEND LOGIN.TSX ĐỌC
        return res.json({ 
            success: true, 
            token, 
            role: userRole,                  // Trả về 'admin' hoặc 'staff'
            username: finalUsername,         // Trả về 'admin' hoặc 'user'
            message: "Đăng nhập thành công!" 
        });

    } catch (error) {
        console.error("❌ LỖI ĐĂNG NHẬP ADMIN:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ hệ thống!" });
    }
};