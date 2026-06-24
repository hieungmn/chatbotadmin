import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();

    // 🔴 ĐOẠN ĐÃ SỬA: Đọc dữ liệu chuẩn và bảo hiểm tránh kẹt cache quyền cũ
    const rawUsername = localStorage.getItem('username') || 'Quản trị viên';
    const rawRole = localStorage.getItem('user_role');

    // Nếu tên tài khoản là admin (viết hoa/thường) thì ép luôn quyền admin, ngược lại lấy từ DB hoặc mặc định là staff
    const username = rawUsername;
    const role = (rawUsername.toLowerCase() === 'admin') ? 'admin' : (rawRole || 'staff'); 

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?')) {
            localStorage.clear(); 
            navigate('/admin/login'); 
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const menuStyle = (path: string) => ({
        color: isActive(path) ? '#3b82f6' : '#cbd5e1',
        textDecoration: 'none',
        fontWeight: 'bold',
        display: 'block',
        padding: '10px 12px',
        backgroundColor: isActive(path) ? '#1e293b' : 'transparent',
        borderRadius: '6px',
        transition: '0.2s',
        fontSize: '14px'
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
            {/* COLUMN 1: SIDEBAR NAV */}
            <div style={{ width: '260px', backgroundColor: '#0f172a', color: '#fff', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #1e293b' }}>
                
                <div>
                    <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #334155' }}>
                        <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '18px', letterSpacing: '0.5px' }}>🤖 FAQ HUB ADMIN</h3>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Xin chào: {username} ({role.toUpperCase()})</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Nhóm Vận hành cốt lõi - Luôn hiển thị cho cả ADMIN và STAFF */}
                        <li>
                            <a href="/admin/upload" style={menuStyle('/admin/upload')}>
                                🔄 Data Synchronization
                            </a>
                        </li>
                        <li>
                            <a href="/admin/analytics" style={menuStyle('/admin/analytics')}>
                                📊 Search Analytics
                            </a>
                        </li>
                        <li>
                            <a href="/admin/sandbox" style={menuStyle('/admin/sandbox')}>
                                💬 Môi trường Test Bot
                            </a>
                        </li>

                        {/* Nhóm Quản trị Hệ thống - Chỉ hiển thị khi quyền KHÔNG PHẢI là staff */}
                        {role !== 'staff' && (
                            <>
                                <hr style={{ border: '0', height: '1px', backgroundColor: '#334155', margin: '15px 0' }} />
                                <li>
                                    <a href="/admin/sites" style={menuStyle('/admin/sites')}>
                                        🌐 Quản lý Kênh (Sites)
                                    </a>
                                </li>
                                <li>
                                    <a href="/admin/users" style={menuStyle('/admin/users')}>
                                        👥 Quản lý Nhân viên
                                    </a>
                                </li>
                                <li>
                                    <a href="/admin/audit-logs" style={menuStyle('/admin/audit-logs')}>
                                        📜 Nhật ký Hệ thống
                                    </a>
                                </li>
                            </>
                        )}
                    </ul>
                </div>

                {/* Phần Dưới: Nút Đăng xuất */}
                <div style={{ paddingTop: '20px', borderTop: '1px solid #334155' }}>
                    <button 
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                    >
                        🚪 Log Out (Đăng xuất)
                    </button>
                </div>

            </div>

            {/* COLUMN 2: MAIN CONTENT */}
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
                {children}
            </div>
        </div>
    );
}