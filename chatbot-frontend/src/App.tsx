import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import các trang thuộc phân hệ Admin cũ
import Login from './pages/admin/Login';
import UploadExcel from './pages/admin/UploadExcel';
import Analytics from './pages/admin/Analytics';

// Import 3 trang quản trị mới bổ sung cho đủ hệ thống 9 bảng
import ManageSites from './pages/admin/ManageSites';
import ManageUsers from './pages/admin/ManageUsers';
import AuditLogs from './pages/admin/AuditLogs';

// Import trang thuộc phân hệ User (Bây giờ dùng để Test trực tiếp trong Admin)
import WidgetSandbox from './pages/user/WidgetSandbox';

// Import Khung Layout chung của Admin
import AdminLayout from './layouts/AdminLayout';

// Hợp phần kiểm tra quyền truy cập (Route Guard bảo vệ các trang Admin)
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('admin_token');

    // Nếu chưa đăng nhập (không có token), đá ngược Admin về trang login
    if (!token) {
        return (
            <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
                <h3 style={{ color: '#ef4444' }}>⚠️ 401 - Bạn không có quyền truy cập trang này</h3>
                <p>Vui lòng đăng nhập trước khi cấu hình hệ thống.</p>
                <a href="/admin/login" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>Đến trang đăng nhập →</a>
            </div>
        );
    }

    // Nếu đã có token, bọc nội dung trang vào khung giao diện AdminLayout chung
    return <AdminLayout>{children}</AdminLayout>;
};

export default function App() {
    return (
        <Router>
            <Routes>
                {/* 1. Trang chủ Portal: Tự động chuyển hướng thẳng vào khu vực Admin */}
                <Route path="/" element={<Navigate to="/admin/upload" replace />} />

                {/* 2. Tuyến đường Đăng nhập hệ thống quản trị công khai */}
                <Route path="/admin/login" element={<Login />} />

                {/* 3. Toàn bộ phân hệ Admin Dashboard (Đã bao gồm Môi trường Test Bot) */}
                <Route 
                    path="/admin/upload" 
                    element={<ProtectedAdminRoute><UploadExcel /></ProtectedAdminRoute>} 
                />
                <Route 
                    path="/admin/analytics" 
                    element={<ProtectedAdminRoute><Analytics /></ProtectedAdminRoute>} 
                />
                <Route 
                    path="/admin/sandbox" 
                    element={<ProtectedAdminRoute><WidgetSandbox /></ProtectedAdminRoute>} 
                />
                <Route 
                    path="/admin/sites" 
                    element={<ProtectedAdminRoute><ManageSites /></ProtectedAdminRoute>} 
                />
                <Route 
                    path="/admin/users" 
                    element={<ProtectedAdminRoute><ManageUsers /></ProtectedAdminRoute>} 
                />
                <Route 
                    path="/admin/audit-logs" 
                    element={<ProtectedAdminRoute><AuditLogs /></ProtectedAdminRoute>} 
                />

                {/* 4. Xử lý điều hướng khi gõ sai URL đường dẫn ngẫu nhiên (404 Fallback) */}
                <Route path="*" element={
                    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                        <h2>❌ 404 - Không tìm thấy trang yêu cầu</h2>
                        <a href="/admin/upload" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>Quay lại Bảng điều khiển</a>
                    </div>
                } />
            </Routes>
        </Router>
    );
}