import { Router } from 'express';
import { getAllAdminUsers, createNewAdminUser, deleteAdminUser } from './user.controller';
import { verifyToken } from '../../middlewares/auth.middleware';

const router = Router();

// Gọi chính xác tên hàm mới được đổi để không bị nạp nhầm code
router.get('/', verifyToken, getAllAdminUsers);         
router.post('/', verifyToken, createNewAdminUser);       
router.delete('/:id', verifyToken, deleteAdminUser);  

export default router;