import axios from 'axios';

// Khởi tạo cấu hình Axios gọi lên Backend mới của bạn
const API = axios.create({
    baseURL: 'http://localhost:3000/api/v1', // Cổng 3000 của server chúng ta vừa chạy thành công
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tự động đính kèm mã Token vào mọi lượt gửi API để vượt qua authMiddleware bảo mật
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // Lấy token từ kho lưu trữ trình duyệt khi đăng nhập
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;