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

interface Site {
    site_id: string;
    site_name: string;
}

export default function ManageUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [sites, setSites] = useState<Site[]>([]); // Danh sách các Site có trên hệ thống
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    // State cho Form thêm mới user
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('staff');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State xử lý Popup Phân Quyền Site
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]); // Mảng lưu các site_id được tích chọn

    const getAuthHeaders = () => {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') return null;
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    // 1. Tải danh sách người dùng và danh sách các Site
    const initData = async () => {
        try {
            setLoading(true);
            const headersConfig = getAuthHeaders();
            if (!headersConfig) return;

            // Lấy danh sách users
            const userRes = await axios.get('http://localhost:3000/api/v1/staff-users', headersConfig);
            if (userRes.data.success) setUsers(userRes.data.users);

            // Lấy danh sách các Site hiện có để làm checkbox
            const siteRes = await axios.get('http://localhost:3000/api/v1/admin/sites', headersConfig);
            if (siteRes.data.success) setSites(siteRes.data.sites);

        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { initData(); }, []);

    const showAlert = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    // 2. Thêm mới tài khoản
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const headersConfig = getAuthHeaders();
            if (!headersConfig) return;

            const response = await axios.post('http://localhost:3000/api/v1/staff-users', { username, password, full_name: fullName, role }, headersConfig);
            if (response.data.success) {
                showAlert('Tạo tài khoản thành công!', 'success');
                setUsername(''); setPassword(''); setFullName(''); setRole('staff');
                initData();
            }
        } catch (error: any) {
            showAlert(error.response?.data?.message || 'Lỗi khi tạo tài khoản!', 'error');
        } finally { setIsSubmitting(false); }
    };

    // 3. Xóa tài khoản
    const handleDeleteUser = async (id: number, uName: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${uName}"?`)) return;
        try {
            const headersConfig = getAuthHeaders();
            if (!headersConfig) return;
            const response = await axios.delete(`http://localhost:3000/api/v1/staff-users/${id}`, headersConfig);
            if (response.data.success) {
                showAlert('Đã xóa tài khoản thành công!', 'success');
                initData();
            }
        } catch (error: any) { showAlert('Lỗi hệ thống!', 'error'); }
    };

    // 4. Bấm nút Mở popup phân quyền cho 1 User cụ thể
    const openPermissionModal = async (user: User) => {
        setSelectedUser(user);
        setUserPermissions([]); // Reset tạm thời
        setShowPermissionModal(true);

        try {
            const headersConfig = getAuthHeaders();
            if (!headersConfig) return;

            // Gọi API lấy về các site_id hiện tại mà user này đang có quyền (từ bảng user_site_permissions)
            const res = await axios.get(`http://localhost:3000/api/v1/staff-users/${user.id}/permissions`, headersConfig);
            if (res.data.success) {
                setUserPermissions(res.data.site_ids); // ví dụ trả về: ['s-wing', 'c-wing']
            }
        } catch (error) {
            console.error("Lỗi lấy quyền hiện tại của user:", error);
        }
    };

    // 5. Xử lý khi Admin tích chọn hoặc bỏ chọn ô Checkbox của một Site
    const handleCheckboxChange = (siteId: string) => {
        if (userPermissions.includes(siteId)) {
            // Nếu đã có thì loại bỏ khỏi mảng (Tắt quyền)
            setUserPermissions(userPermissions.filter(id => id !== siteId));
        } else {
            // Nếu chưa có thì add vào mảng (Bật quyền)
            setUserPermissions([...userPermissions, siteId]);
        }
    };

    // 6. Gửi danh sách quyền mới lên Backend để lưu đè vào DB
    const handleSavePermissions = async () => {
        if (!selectedUser) return;
        try {
            const headersConfig = getAuthHeaders();
            if (!headersConfig) return;

            const response = await axios.post(
                `http://localhost:3000/api/v1/staff-users/${selectedUser.id}/permissions`,
                { site_ids: userPermissions },
                headersConfig
            );

            if (response.data.success) {
                showAlert(`Cập nhật quyền Site cho [${selectedUser.username}] thành công!`, 'success');
                setShowPermissionModal(false);
            }
        } catch (error: any) {
            showAlert('Lỗi khi lưu phân quyền!', 'error');
        }
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>
                    👥 QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN HỆ THỐNG
                </h1>

                {message.text && (
                    <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fca5a5'}` }}>
                        {message.type === 'success' ? '✅ ' : '❌ '} {message.text}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    {/* FORM TẠO USER */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>➕ Thêm Thành Viên Mới</h2>
                        <form onSubmit={handleCreateUser}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tên đăng nhập:</label>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Mật khẩu:</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Họ và tên:</label>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Vai trò:</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }}>
                                    <option value="staff">Vận hành viên (STAFF)</option>
                                    <option value="admin">Quản trị viên tối cao (ADMIN)</option>
                                </select>
                            </div>
                            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '10px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                {isSubmitting ? 'Đang xử lý...' : 'Kích Hoạt Tài Khoản'}
                            </button>
                        </form>
                    </div>

                    {/* BẢNG DANH SÁCH USER */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>📋 Danh Sách Tài Khoản</h2>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>⏳ Đang đồng bộ...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Tài khoản</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Quyền hạn</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.username} <span style={{fontSize:'12px', color:'#64748b', fontWeight:'normal'}}>({u.full_name})</span></td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: u.role === 'admin' ? '#fee2e2' : '#e0f2fe', color: u.role === 'admin' ? '#991b1b' : '#0369a1' }}>{u.role}</span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                {/* 👑 NÚT PHÂN QUYỀN SITE NẰM Ở ĐÂY (Ẩn đi nếu tài khoản đó là Admin vì Admin mặc định có tất cả quyền) */}
                                                {u.role === 'staff' && (
                                                    <button onClick={() => openPermissionModal(u)} style={{ padding: '6px 10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginRight: '8px' }}>
                                                        🔑 Quyền Site
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteUser(u.id, u.username)} style={{ padding: '6px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                    Xóa
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

            {/* 🚪 POPUP WINDOW (MODAL) ĐỂ BẬT/TẮT PHÂN QUYỀN TRỰC QUAN */}
            {showPermissionModal && selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                            🔒 Cấp Quyền Site Cho: <span style={{ color: '#2563eb' }}>{selectedUser.username}</span>
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Tích chọn để bật quyền xem dữ liệu cho nhân viên này tại các Kênh tương ứng:</p>
                        
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '20px' }}>
                            {sites.map(site => (
                                <label key={site.site_id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                                    {/* Nút Checkbox Bật/Tắt quyền thực tế */}
                                    <input 
                                        type="checkbox" 
                                        checked={userPermissions.includes(site.site_id)}
                                        onChange={() => handleCheckboxChange(site.site_id)}
                                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    {site.site_id} {site.site_name ? `(${site.site_name})` : ''}
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setShowPermissionModal(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Hủy bỏ
                            </button>
                            <button onClick={handleSavePermissions} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Lưu cấu hình
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}