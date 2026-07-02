import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
    };
}

/**
 * 1. Middleware xác thực Token đăng nhập chung (Cả Admin và Staff)
 */
export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Quyền truy cập bị từ chối! Thiếu Token.' });
        }

        const token = authHeader.split(' ')[1];

        // Chặn đứng Token rác, rỗng, hoặc chữ 'undefined' / 'null' từ Frontend gửi lên
        if (!token || token === 'null' || token === 'undefined' || token.split('.').length !== 3) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập lại! Mã xác thực hệ thống không hợp lệ.'
            });
        }

        // Giải mã Token
        const decoded = jwt.verify(token, 'SECRET_KEY_BOT_2026') as { id: number; username: string; role?: string };
        
        let userRole = decoded.role;
        if (!userRole) {
            const userCheck = await pool.query('SELECT role FROM public.admin_users WHERE id = $1', [decoded.id]);
            if (userCheck.rows.length > 0) {
                userRole = userCheck.rows[0].role;
            } else {
                return res.status(403).json({ success: false, message: 'Tài khoản không tồn tại!' });
            }
        }

        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: userRole || 'staff'
        };
        
        return next();
    } catch (error) {
        console.error('❌ LỖI XÁC THỰC TOKEN MIDDLEWARE:', error);
        return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

/**
 * 2. Middleware kiểm tra và xử lý phân quyền quản lý đối với từng Site (Dựa trên cấu trúc bảng cũ của bạn)
 */
export const checkSitePermission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Lỗi hệ thống: Chưa xác thực danh tính.' });
        }

        // 👑 NẾU LÀ ADMIN TỐI CAO: Cho đi tiếp luôn, không cần check bảng user_site_permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Lấy site_id linh hoạt từ request gửi lên
        const siteId = req.params.siteId || req.body.site_id || req.query.site_id;

        // 🧑‍💻 NẾU LÀ STAFF VÀ KHÔNG TRUYỀN SITE_ID (Frontend gọi lấy dữ liệu tổng hợp của toàn bảng)
        if (!siteId) {
            // Tự động tìm xem Nhân viên (Staff) này có quyền ở những site nào trong DB cũ của bạn
            const allowedSites = await pool.query(
                'SELECT site_id FROM public.user_site_permissions WHERE user_id = $1',
                [req.user.id]
            );

            // Gộp danh sách site_id thành một mảng string[] và đính kèm vào req.query để chuyển tiếp xuống Controller
            req.query.allowed_site_ids = allowedSites.rows.map((r: any) => r.site_id);
            
            return next(); // Cho qua cửa thoải mái để không làm trống màn hình Frontend!
        }

        // 🧑‍💻 NẾU STAFF TRUYỀN SITE_ID CỤ THỂ (Click chọn thao tác riêng lẻ 1 site)
        const permissionCheck = await pool.query(
            'SELECT 1 FROM public.user_site_permissions WHERE user_id = $1 AND site_id = $2',
            [req.user.id, siteId]
        );

        if (permissionCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: `Bạn không có quyền quản lý hoặc truy cập dữ liệu của site [${siteId}].` 
            });
        }

        return next();
    } catch (error) {
        console.error('❌ LỖI TRUNG GIAN PHÂN QUYỀN SITE:', error);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xử lý phân quyền site.' });
    }
};