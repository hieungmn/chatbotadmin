import { Request, Response } from 'express';
import pool from '../../config/db';

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
    };
}

// 1. API lấy danh sách toàn bộ tài khoản từ bảng public.admin_users
export const getAllAdminUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const requestUserRole = req.user?.role;

        // Bảo mật hệ thống: Nếu không phải admin, chặn đứng truy cập trái phép
        if (!requestUserRole || requestUserRole !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Quyền hạn của bạn (Staff) không được phép xem danh sách nhân sự cấp cao!" 
            });
        }

        // 🔴 ĐÃ ĐỒNG BỘ SCHEMA V2: Truy vấn đích danh bảng public.admin_users có cột role
        const resDb = await pool.query(
            'SELECT id, username, full_name, role, is_active, created_at FROM public.admin_users ORDER BY id DESC'
        );
        
        return res.json({ success: true, users: resDb.rows });
    } catch (error: any) {
        console.error("❌ LỖI LẤY DANH SÁCH USER TRONG USER.CONTROLLER:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy danh sách quản trị viên!" });
    }
};

// 2. API tạo tài khoản quản trị/nhân sự mới vào bảng public.admin_users
export const createNewAdminUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { username, password, full_name, role } = req.body;
        const requestUserRole = req.user?.role;

        // Chỉ Admin tối cao mới được tạo tài khoản admin/staff khác
        if (!requestUserRole || requestUserRole !== 'admin') {
            return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện hành động này!" });
        }

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ tài khoản và mật khẩu!" });
        }

        const cleanUsername = String(username).trim().toLowerCase();

        // Kiểm tra trùng lặp username trong bảng admin_users
        const checkUser = await pool.query(
            'SELECT id FROM public.admin_users WHERE LOWER(username) = $1', 
            [cleanUsername]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Tài khoản quản trị này đã tồn tại!' });
        }

        // 🔴 ĐÃ ĐỒNG BỘ SCHEMA V2: Chèn chuẩn xác cấu trúc bảng public.admin_users công ty giao
        await pool.query(
            `INSERT INTO public.admin_users (username, password_hash, full_name, role, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())`,
            [cleanUsername, password, full_name || null, role || 'staff']
        );

        // Ghi lại nhật ký hành động vào bảng public.admin_audit_logs theo chuẩn Schema V2 (Khóa ngoại BIGSERIAL)
        try {
            const adminId = req.user?.id || null;
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            await pool.query(
                `INSERT INTO public.admin_audit_logs (admin_id, action_type, details, ip_address, created_at) 
                 VALUES ($1, 'CREATE_USER', $2, $3, NOW())`,
                [adminId, `Tạo thành công tài khoản: ${cleanUsername} [Quyền: ${String(role).toUpperCase()}]`, String(clientIp)]
            );
        } catch (logError) {
            console.error("⚠️ Lỗi ghi nhật ký vào bảng admin_audit_logs:", logError);
        }

        return res.status(201).json({ success: true, message: 'Tạo tài khoản hệ thống mới thành công!' });
    } catch (error: any) {
        console.error("❌ LỖI TẠO USER MỚI:", error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo tài khoản!' });
    }
};

// 3. API Xóa nhân viên khỏi bảng public.admin_users
export const deleteAdminUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const requestUserRole = req.user?.role;

        if (!requestUserRole || requestUserRole !== 'admin') {
            return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện hành động này!" });
        }

        // Chống tự sát (Tự xóa tài khoản chính mình đang đăng nhập)
        if (Number(id) === req.user?.id) {
            return res.status(400).json({ success: false, message: "Bạn không thể tự xóa tài khoản của chính mình!" });
        }

        // Thực hiện xóa
        await pool.query('DELETE FROM public.admin_users WHERE id = $1', [id]);
        return res.json({ success: true, message: 'Đã xóa tài khoản khỏi hệ thống thành công!' });
    } catch (error: any) {
        console.error("❌ LỖI XÓA USER:", error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thực hiện lệnh xóa!' });
    }
};
//nut bat tat phan quyen 
export const toggleSitePermission = async (req: Request, res: Response) => {
    try {
        const { userId, siteId, isChecked } = req.body; // isChecked: true (Bật) hoặc false (Tắt)

        if (!userId || !siteId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin ID nhân viên hoặc Trang!" });
        }

        if (isChecked === true) {
            // 🔴 KHI ADMIN BẬT: Chèn quyền vào bảng phụ (dùng ON CONFLICT để tránh lỗi trùng)
            await pool.query(
                `INSERT INTO public.user_site_permissions (user_id, site_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (user_id, site_id) DO NOTHING`,
                [userId, siteId]
            );
            return res.json({ success: true, message: "Đã cấp quyền truy cập trang thành công!" });
        } else {
            // 🔴 KHI ADMIN TẮT: Xóa dòng quyền khỏi bảng phụ
            await pool.query(
                `DELETE FROM public.user_site_permissions 
                 WHERE user_id = $1 AND site_id = $2`,
                [userId, siteId]
            );
            return res.json({ success: true, message: "Đã hủy quyền truy cập trang thành công!" });
        }
    } catch (error) {
        console.error("❌ LỖI BẬT TẮT QUYỀN TRANG:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ hệ thống!" });
    }
};