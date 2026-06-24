const express = require('express');
const router = express.Router();
const sitesController = require('./sites.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

// 📊 Tuyến đường lấy dữ liệu thống kê câu hỏi hụt cho Dashboard
// Chỉ tài khoản cấu hình quyền ADMIN mới được vào xem
router.get('/analytics', authMiddleware, rbacMiddleware('ADMIN'), sitesController.getAnalytics);

module.exports = router;