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
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);

    const [message, setMessage] = useState({ text: '', type: '' });

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('staff');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') return null;

        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    };

    const showAlert = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const initData = async () => {
        try {
            setLoading(true);

            const config = getAuthHeaders();
            if (!config) return;

            const [userRes, siteRes] = await Promise.all([
                axios.get('http://localhost:3000/api/v1/staff-users', config),
                axios.get('http://localhost:3000/api/v1/admin/sites', config)
            ]);

            if (userRes.data.success) setUsers(userRes.data.users);
            if (siteRes.data.success) setSites(siteRes.data.sites);

        } catch (err) {
            console.error(err);
            showAlert('Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initData();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const config = getAuthHeaders();
            if (!config) return;

            const res = await axios.post(
                'http://localhost:3000/api/v1/staff-users',
                {
                    username,
                    password,
                    full_name: fullName,
                    role
                },
                config
            );

            if (res.data.success) {
                showAlert('Tạo thành viên thành công', 'success');
                setUsername('');
                setPassword('');
                setFullName('');
                setRole('staff');
                initData();
            }

        } catch (err: any) {
            showAlert(err.response?.data?.message || 'Lỗi tạo user', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: number, name: string) => {
        if (!window.confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;

        try {
            const config = getAuthHeaders();
            if (!config) return;

            const res = await axios.delete(
                `http://localhost:3000/api/v1/staff-users/${id}`,
                config
            );

            if (res.data.success) {
                showAlert('Đã xóa user', 'success');
                setUsers(prev => prev.filter(u => u.id !== id));
            }

        } catch {
            showAlert('Lỗi xóa user', 'error');
        }
    };

    const openPermissionModal = async (user: User) => {
        setSelectedUser(user);
        setShowPermissionModal(true);
        setUserPermissions([]);

        try {
            const config = getAuthHeaders();
            if (!config) return;

            const res = await axios.get(
                `http://localhost:3000/api/v1/staff-users/${user.id}/permissions`,
                config
            );

            if (res.data.success) {
                setUserPermissions(res.data.site_ids || []);
            }

        } catch (err) {
            console.error(err);
        }
    };

    const handleCheckboxChange = (siteId: string) => {
        setUserPermissions(prev =>
            prev.includes(siteId)
                ? prev.filter(id => id !== siteId)
                : [...prev, siteId]
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;

        try {
            const config = getAuthHeaders();
            if (!config) return;

            const res = await axios.post(
                `http://localhost:3000/api/v1/staff-users/${selectedUser.id}/permissions`,
                { site_ids: userPermissions },
                config
            );

            if (res.data.success) {
                showAlert('Cập nhật quyền thành công', 'success');
                setShowPermissionModal(false);
            }

        } catch {
            showAlert('Lỗi lưu quyền', 'error');
        }
    };

    return (
        <div style={{
            padding: '24px',
            fontFamily: 'sans-serif',
            backgroundColor: '#f8fafc',
            minHeight: '100vh',
            position: 'relative'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '24px',
                    color: '#1e293b'
                }}>
                    👥 QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN
                </h1>

                {message.text && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#15803d' : '#b91c1c',
                        fontWeight: 'bold'
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '360px 1fr',
                    gap: '24px',
                    alignItems: 'start'
                }}>

                    {/* FORM */}
                    <div style={{
                        background: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        height: 'fit-content'
                    }}>
                        <h2 style={{ marginBottom: 16 }}>➕ Thêm Thành Viên</h2>

                        <form onSubmit={handleCreateUser}>
                            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
                                style={inputStyle} />

                            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
                                style={inputStyle} />

                            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name"
                                style={inputStyle} />

                            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>

                            <button disabled={isSubmitting} style={btnStyle}>
                                {isSubmitting ? 'Loading...' : 'Tạo thành viên'}
                            </button>
                        </form>
                    </div>

                    {/* TABLE */}
                    <div style={{
                        background: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        overflowX: 'auto'
                    }}>
                        <h2 style={{ marginBottom: 16 }}>📋 Danh sách</h2>

                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                                <thead>
                                    <tr>
                                        <th style={th}>User</th>
                                        <th style={th}>Role</th>
                                        <th style={th}>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={td}>
                                                <b>{u.username}</b>
                                                <div style={{ fontSize: 12, color: '#666' }}>{u.full_name}</div>
                                            </td>

                                            <td style={td}>{u.role}</td>

                                            <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {u.role === 'staff' && (
                                                    <button onClick={() => openPermissionModal(u)} style={{ marginRight: 8 }}>
                                                        Permissions
                                                    </button>
                                                )}

                                                <button onClick={() => handleDeleteUser(u.id, u.username)}>
                                                    Delete
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

            {/* MODAL */}
            {showPermissionModal && selectedUser && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <h3>Permissions - {selectedUser.username}</h3>

                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                            {sites.map(site => {
                                const enabled = userPermissions.includes(site.site_id);

                                return (
                                    <div key={site.site_id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 0'
                                        }}
                                    >
                                        <span>{site.site_name}</span>

                                        {/* SWITCH */}
                                        <label style={switchWrap}>
                                            <input
                                                type="checkbox"
                                                checked={enabled}
                                                onChange={() => handleCheckboxChange(site.site_id)}
                                                style={{ display: 'none' }}
                                            />
                                            <span style={{
                                                ...switchTrack,
                                                backgroundColor: enabled ? '#2563eb' : '#cbd5e1'
                                            }}>
                                                <span style={{
                                                    ...switchThumb,
                                                    transform: enabled ? 'translateX(20px)' : 'translateX(0px)'
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowPermissionModal(false)}>Close</button>
                            <button onClick={handleSavePermissions}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===== styles ===== */

const inputStyle: React.CSSProperties = {
    width: '100%',
    marginBottom: 8,
    padding: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    boxSizing: 'border-box'
};

const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: 10,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
};

const th: React.CSSProperties = { textAlign: 'left', padding: 12 };
const td: React.CSSProperties = { padding: 12 };

const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const modalBox: React.CSSProperties = {
    background: '#fff',
    padding: 20,
    width: 420,
    borderRadius: 8
};

const switchWrap: React.CSSProperties = {
    position: 'relative',
    width: 42,
    height: 22,
    display: 'inline-block'
};

const switchTrack: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 999,
    transition: '0.3s'
};

const switchThumb: React.CSSProperties = {
    position: 'absolute',
    width: 18,
    height: 18,
    background: '#fff',
    borderRadius: '50%',
    top: 2,
    left: 2,
    transition: '0.3s'
};