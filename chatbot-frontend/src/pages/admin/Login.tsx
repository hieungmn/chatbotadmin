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
                localStorage.setItem('admin_token', response.data.token);
                localStorage.setItem('user_role', response.data.role);
                localStorage.setItem('username', response.data.username);

                window.location.href = '/admin/upload';
            } else {
                setError(response.data.message || 'Đăng nhập thất bại.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Lỗi kết nối Server.');
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                
                <div style={styles.header}>
                    <div style={styles.logo}>管理システム</div>
                    <div style={styles.subtitle}>Admin Login Portal</div>
                </div>

                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={styles.form}>
                    <label style={styles.label}>ユーザー名</label>
                    <input
                        style={styles.input}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        required
                    />

                    <label style={styles.label}>パスワード</label>
                    <input
                        style={styles.input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                    />

                    <button type="submit" style={styles.button}>
                        ログイン
                    </button>
                </form>

                <div style={styles.footer}>
                    © Internal System • Company Admin Panel
                </div>

            </div>
        </div>
    );
}

const styles: any = {
    wrapper: {
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6f7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif'
    },

    card: {
        width: '380px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        padding: '32px',
    },

    header: {
        textAlign: 'center',
        marginBottom: '24px'
    },

    logo: {
        fontSize: '18px',
        fontWeight: 600,
        color: '#111827',
        letterSpacing: '1px'
    },

    subtitle: {
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '4px'
    },

    form: {
        display: 'flex',
        flexDirection: 'column'
    },

    label: {
        fontSize: '12px',
        color: '#374151',
        marginBottom: '6px',
        marginTop: '12px'
    },

    input: {
        padding: '10px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#fff'
    },

    button: {
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#111827',
        color: '#ffffff',
        border: 'none',
        fontSize: '14px',
        cursor: 'pointer'
    },

    errorBox: {
        backgroundColor: '#fef2f2',
        color: '#b91c1c',
        padding: '10px',
        fontSize: '12px',
        marginBottom: '10px',
        border: '1px solid #fecaca'
    },

    footer: {
        marginTop: '20px',
        fontSize: '10px',
        color: '#9ca3af',
        textAlign: 'center'
    }
};