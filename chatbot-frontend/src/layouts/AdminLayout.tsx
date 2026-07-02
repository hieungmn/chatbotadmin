import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface Props {
children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
const navigate = useNavigate();
const location = useLocation();


const [collapsed, setCollapsed] = useState(false);
const [showUserMenu, setShowUserMenu] = useState(false);

const username =
    localStorage.getItem('username') || 'Administrator';

const rawRole = localStorage.getItem('user_role');

const role =
    username.toLowerCase() === 'admin'
        ? 'admin'
        : rawRole || 'staff';

const handleLogout = () => {
    if (window.confirm('Đăng xuất khỏi hệ thống?')) {
        localStorage.clear();
        navigate('/admin/login');
    }
};

const isActive = (path: string) =>
    location.pathname === path;

const menuStyle = (path: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    marginBottom: '4px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: isActive(path)
        ? '#ffffff'
        : '#D4DDEC',
    background: isActive(path)
        ? '#35568C'
        : 'transparent',
    transition: 'all .2s'
});

return (
    <div
        style={{
            display: 'flex',
            minHeight: '100vh',
            background: '#EEF2F7'
        }}
    >
        {/* SIDEBAR */}

        <aside
            style={{
                width: collapsed ? 72 : 240,
                background: '#203A63',
                transition: 'all .25s ease',
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                height: '100vh'
            }}
        >
            {/* LOGO */}

            <div
                style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed
                        ? 'center'
                        : 'space-between',
                    padding: collapsed
                        ? 0
                        : '0 16px',
                    borderBottom:
                        '1px solid rgba(255,255,255,.08)'
                }}
            >
                {!collapsed && (
                    <div
                        style={{
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '18px'
                        }}
                    >
                        FAQ HUB
                    </div>
                )}

                <button
                    onClick={() =>
                        setCollapsed(!collapsed)
                    }
                    style={{
                        width: 34,
                        height: 34,
                        border: 'none',
                        borderRadius: 8,
                        background: '#35568C',
                        color: '#fff',
                        cursor: 'pointer'
                    }}
                >
                    ☰
                </button>
            </div>

            {/* MENU */}

            <div
                style={{
                    padding: 12
                }}
            >
                {role !== 'staff' && (
                    <>
                        <Link
                            to="/admin/sites"
                            style={menuStyle('/admin/sites')}
                        >
                            <span>🌐</span>
                            {!collapsed && (
                                <span>Sites</span>
                            )}
                        </Link>

                        <Link
                            to="/admin/users"
                            style={menuStyle('/admin/users')}
                        >
                            <span>👥</span>
                            {!collapsed && (
                                <span>Users</span>
                            )}
                        </Link>

                        <Link
                            to="/admin/audit-logs"
                            style={menuStyle(
                                '/admin/audit-logs'
                            )}
                        >
                            <span>📜</span>
                            {!collapsed && (
                                <span>Audit Logs</span>
                            )}
                        </Link>

                        <div
                            style={{
                                height: 1,
                                background:
                                    'rgba(255,255,255,.08)',
                                margin: '12px 0'
                            }}
                        />
                    </>
                )}

                <Link
                    to="/admin/upload"
                    style={menuStyle('/admin/upload')}
                >
                    <span>🔄</span>
                    {!collapsed && (
                        <span>Data Sync</span>
                    )}
                </Link>

                <Link
                    to="/admin/analytics"
                    style={menuStyle('/admin/analytics')}
                >
                    <span>📊</span>
                    {!collapsed && (
                        <span>Analytics</span>
                    )}
                </Link>

                <div
                    style={{
                        height: 1,
                        background:
                            'rgba(255,255,255,.08)',
                        margin: '12px 0'
                    }}
                />

                <Link
                    to="/admin/sandbox"
                    style={menuStyle('/admin/sandbox')}
                >
                    <span>🤖</span>
                    {!collapsed && (
                        <span>Sandbox</span>
                    )}
                </Link>
            </div>
        </aside>

        {/* MAIN */}

        <div
            style={{
                flex: 1,
                minWidth: 0
            }}
        >
            {/* HEADER */}

            <header
                style={{
                    height: 64,
                    background: '#fff',
                    borderBottom:
                        '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    padding: '0 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}
            >
                <div
                    style={{
                        position: 'relative'
                    }}
                >
                    <button
                        onClick={() =>
                            setShowUserMenu(
                                !showUserMenu
                            )
                        }
                        style={{
                            padding:
                                '8px 14px',
                            border:
                                '1px solid #D1D5DB',
                            borderRadius: 8,
                            background:
                                '#fff',
                            cursor:
                                'pointer'
                        }}
                    >
                        {username} ▼
                    </button>

                    {showUserMenu && (
                        <div
                            style={{
                                position:
                                    'absolute',
                                right: 0,
                                top: 44,
                                width: 180,
                                background:
                                    '#fff',
                                border:
                                    '1px solid #E5E7EB',
                                borderRadius:
                                    10,
                                overflow:
                                    'hidden',
                                boxShadow:
                                    '0 10px 25px rgba(0,0,0,.08)'
                            }}
                        >
                            <button
                                onClick={
                                    handleLogout
                                }
                                style={{
                                    width:
                                        '100%',
                                    padding:
                                        '12px 14px',
                                    border:
                                        'none',
                                    background:
                                        '#fff',
                                    textAlign:
                                        'left',
                                    cursor:
                                        'pointer',
                                    color:
                                        '#DC2626'
                                }}
                            >
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* CONTENT */}

            <main
                style={{
                    padding: 24
                }}
            >
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 14,
                        padding: 24,
                        boxShadow:
                            '0 1px 3px rgba(0,0,0,.05)'
                    }}
                >
                    {children}
                </div>
            </main>
        </div>
    </div>
);


}
