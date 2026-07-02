import { Router } from 'express';
import multer from 'multer';
import { uploadKnowledgeFileController } from './knowledge.controller'; // 🎯 ĐÃ SỬA: Khớp tên hàm đuôi Controller

const router = Router();
const upload = multer({ dest: 'uploads/' }); 

// 🎯 ĐÃ SỬA: Đổi tên biến gọi ở đây cho khớp
router.post('/upload', upload.single('file'), uploadKnowledgeFileController);

export default router;