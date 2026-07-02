import React, { useState } from 'react';
import axios from 'axios';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await axios.post('http://localhost:3000/api/v1/auth/admin/login', {
                username,
                password
            });

            if (response.data.success) {
                // 1. Lưu token chuẩn của bạn
                localStorage.setItem('admin_token', response.data.token);

                // 2. Lưu quyền và username động do Backend vừa trả về ở trên
                localStorage.setItem('user_role', response.data.role);       // Nhận 'admin' hoặc 'staff'
                localStorage.setItem('username', response.data.username);   // Nhận tên user

                // 3. Chuyển hướng vào trang upload
                window.location.href = '/admin/upload';
            } else {
                setError(response.data.message || 'Đăng nhập thất bại.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Lỗi kết nối Server.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
            <form onSubmit={handleLogin} style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', width: '100%', maxWidth: '360px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#0f172a' }}>🤖 BOT ADMIN LOGIN</h2>

                {error && <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>❌ {error}</div>}

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>Tài khoản (Username):</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>Mật khẩu (Password):</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>

                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Đăng nhập hệ thống
                </button>
            </form>
        </div>
    );
}