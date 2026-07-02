import { Router } from 'express';
import { handleChatQuery, getInitialSuggestions, submitFeedback } from './chat.controller';
import { verifyToken } from '../../middlewares/auth.middleware'; // Đảm bảo import đúng file middleware bảo mật của bạn
import { getSearchAnalytics } from '../faq/faq.controller';
const router = Router();

// 1. API Gửi tin nhắn chat và nhận câu trả lời (Widget gọi liên tục khi chat)
router.post('/query', handleChatQuery);

// 2. API Lấy các nút danh mục gợi ý nhanh đầu phiên chat (Chíp gợi ý)
router.get('/suggestions', getInitialSuggestions);

// 3. API Đánh giá Like/Dislike bài viết FAQ
router.post('/feedback', submitFeedback);

router.get('/analytics', verifyToken, getSearchAnalytics);
export default router;