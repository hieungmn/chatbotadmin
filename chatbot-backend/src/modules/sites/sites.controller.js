const db = require('../../config/db');

// 📊 API: Đọc danh sách các câu hỏi bị trượt (is_missed = true) hiển thị lên trang Admin Analytics
const getAnalytics = async (req, res) => {
    try {
        // Đếm tần suất các câu hỏi bị hụt, nhóm theo từng site và nội dung câu hỏi
        const resDb = await db.query(`
            SELECT site_id, query_text AS keyword_missed, COUNT(*) as count 
            FROM search_logs 
            WHERE is_missed = true 
            GROUP BY site_id, query_text 
            ORDER BY count DESC;
        `);
        
        // Trả về định dạng mảng dữ liệu giống hệt server cũ để Frontend của bạn không phải sửa code đọc
        return res.json({ 
            success: true, 
            top_missed_keywords: resDb.rows 
        });
    } catch (error) {
        console.error("❌ LỖI LẤY DỮ LIỆU ANALYTICS:", error);
        return res.status(500).json({ success: false, message: "Lỗi cơ sở dữ liệu khi lấy thống kê!" });
    }
};

module.exports = { getAnalytics };