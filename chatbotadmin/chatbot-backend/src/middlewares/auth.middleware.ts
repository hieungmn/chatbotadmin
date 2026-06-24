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

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Quyền truy cập bị từ chối! Thiếu Token.' });
        }

        const token = authHeader.split(' ')[1];

        // 🔴 ĐÃ SỬA: Chặn đứng Token rác, rỗng, hoặc chữ 'undefined' / 'null' từ Frontend gửi lên
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