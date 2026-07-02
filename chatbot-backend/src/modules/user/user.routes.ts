import { Router } from 'express';
import { 
    getAllAdminUsers, 
    createNewAdminUser, 
    deleteAdminUser,
    getUserPermissions
} from './user.controller';
import { verifyToken } from '../../middlewares/auth.middleware';
import pool from '../../config/db';

const router = Router();

// 1. Các Route cơ bản quản lý User (Đường dẫn gốc: /api/v1/staff-users)
router.get('/', verifyToken, getAllAdminUsers);         
router.post('/', verifyToken, createNewAdminUser);      
router.delete('/:id', verifyToken, deleteAdminUser);  

// 2. Các Route xử lý Phân quyền Site (Đã bỏ cụm '/staff-users' thừa để tránh lỗi 404)
router.get('/:id/permissions', verifyToken, getUserPermissions);

router.post('/:id/permissions', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { site_ids }: { site_ids: string[] } = req.body; // Nhận mảng site_id từ Frontend gửi lên

        // Thực hiện xóa toàn bộ quyền cũ và ghi đè quyền mới cho gọn gàng, an toàn
        await pool.query('DELETE FROM public.user_site_permissions WHERE user_id = $1', [id]);
        
        if (site_ids && site_ids.length > 0) {
            for (const siteId of site_ids) {
                await pool.query(
                    'INSERT INTO public.user_site_permissions (user_id, site_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, siteId.trim()]
                );
            }
        }

        return res.json({ success: true, message: "Cập nhật phân quyền thành công!" });
    } catch (err: any) {
        console.error("❌ LỖI KHI LƯU PHÂN QUYỀN TRÊN ROUTER:", err);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống khi lưu quyền!" });
    }
});

export default router;