import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
}

export default function ManageUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    // State cho Form thêm mới
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('staff');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 🔴 ĐÃ SỬA: Cấu hình Header an toàn, chống gửi chuỗi rác gây lỗi "jwt malformed"
    const getAuthHeaders = () => {
        // Kiểm tra cả 2 key phổ biến xem dự án bạn đang lưu ở key nào
        const token = localStorage.getItem('token') || localStorage.getItem('admin_token'); 
        
        // In ra màn hình console (F12) để bạn kiểm tra trạng thái Token thực tế
        console.log("🔑 [FRONTEND DEBUG] Token hiện tại lấy từ LocalStorage là:", token);

        if (!token || token === 'undefined' || token === 'null') {
            return null;
        }

        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    };

    // 1. Gọi API lấy danh sách nhân viên khi tải trang
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const headersConfig = getAuthHeaders();

            // Chặn đứng trước nếu không tìm thấy token đăng nhập
            if (!headersConfig) {
                showAlert('Hệ thống thiếu Token mã hóa! Vui lòng đăng xuất và đăng nhập lại tài khoản.', 'error');
                setUsers([]);
                return;
            }

            const response = await axios.get('http://localhost:3000/api/v1/staff-users', headersConfig);
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (error: any) {
            console.error("❌ Lỗi FetchUsers API:", error);
            showAlert(error.response?.data?.message || 'Không thể tải danh sách tài khoản!', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Hàm hiển thị thông báo tự động ẩn sau 4 giây
    const showAlert = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    // 2. Hàm xử lý Thêm tài khoản mới
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const headersConfig = getAuthHeaders();
            if (!headersConfig) {
                showAlert('Bạn không có mã Token hợp lệ để thực hiện thao tác này!', 'error');
                return;
            }

            const response = await axios.post(
                'http://localhost:3000/api/v1/staff-users',
                { username, password, full_name: fullName, role },
                headersConfig
            );

            if (response.data.success) {
                showAlert(response.data.message || 'Tạo tài khoản thành công!', 'success');
                // Reset form
                setUsername('');
                setPassword('');
                setFullName('');
                setRole('staff');
                // Tải lại bảng dữ liệu
                fetchUsers();
            }
        } catch (error: any) {
            showAlert(error.response?.data?.message || 'Lỗi khi tạo tài khoản!', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. Hàm xử lý Xóa tài khoản
    const handleDeleteUser = async (id: number, uName: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${uName}" khỏi hệ thống?`)) {
            return;
        }

        try {
            const headersConfig = getAuthHeaders();
            if (!headersConfig) {
                showAlert('Không tìm thấy quyền thực thi lệnh xóa!', 'error');
                return;
            }

            const response = await axios.delete(`http://localhost:3000/api/v1/staff-users/${id}`, headersConfig);
            if (response.data.success) {
                showAlert(response.data.message || 'Đã xóa tài khoản thành công!', 'success');
                fetchUsers();
            }
        } catch (error: any) {
            showAlert(error.response?.data?.message || 'Không có quyền hoặc lỗi hệ thống!', 'error');
        }
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>
                    👥 QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN HỆ THỐNG
                </h1>

                {/* Khu vực hiển thị Alert thông báo */}
                {message.text && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#15803d' : '#b91c1c',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
                    }}>
                        {message.type === 'success' ? '✅ ' : '❌ '} {message.text}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    
                    {/* BÊN TRÁI: FORM TẠO TÀI KHOẢN MỚI */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                            ➕ Thêm Thành Viên Mới
                        </h2>
                        <form onSubmit={handleCreateUser}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tên đăng nhập (Username):</label>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Ví dụ: nguyenvanan" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Mật khẩu:</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Họ và tên:</label>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn An" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Vai trò phân quyền:</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }}>
                                    <option value="staff">Vận hành viên (STAFF - Hiện 3 menu)</option>
                                    <option value="admin">Quản trị viên tối cao (ADMIN - Hiện 6 menu)</option>
                                </select>
                            </div>

                            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '10px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                {isSubmitting ? 'Đang kích hoạt...' : 'Kích Hoạt Tài Khoản'}
                            </button>
                        </form>
                    </div>

                    {/* BÊN PHẢI: BẢNG DANH SÁCH TÀI KHOẢN HIỆN TẠI */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                            📋 Danh Sách Tài Khoản Trong Bảng `admin_users`
                        </h2>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>⏳ Đang đồng bộ dữ liệu với PostgreSQL...</div>
                        ) : users.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Hệ thống trống rỗng.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>ID</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Tài khoản</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Họ Tên</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Quyền hạn</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', color: '#64748b' }}>#{u.id}</td>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{u.username}</td>
                                            <td style={{ padding: '12px', color: '#334155' }}>{u.full_name || '---'}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    backgroundColor: u.role === 'admin' ? '#fee2e2' : '#e0f2fe',
                                                    color: u.role === 'admin' ? '#991b1b' : '#0369a1',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                                    style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    Xóa tài khoản
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}