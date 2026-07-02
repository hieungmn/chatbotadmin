import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Site } from '../../types/chat.types';

export default function ManageSites() {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchSites = () => {
        setLoading(true);

        // 🔑 LẤY TOKEN ĐỂ GỬI LÊN BACKEND (Sửa lỗi không nhận diện quyền user)
        const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
        const config = {
            headers: { Authorization: token ? `Bearer ${token}` : '' }
        };

        axios.get('http://localhost:3000/api/v1/admin/sites', config)
            .then(res => { 
                if (res.data.success) {
                    setSites(res.data.sites || []); 
                } 
            })
            .catch(err => console.error("Lỗi fetch sites:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSites();
    }, []);

    return (
        <div style={{ 
            padding: '24px', 
            backgroundColor: '#f6f8fa', 
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
            minHeight: '100vh',
            color: '#24292e'
        }}>
            {/* Header kiểu ứng dụng Nhật Bản */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                backgroundColor: '#ffffff',
                padding: '16px 24px',
                borderRadius: '6px',
                border: '1px solid #e1e4e8'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1f2328' }}>
                        🌐 サイト管理設定 (Quản lý Kênh Hệ thống)
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: '#57606a', fontSize: '12px' }}>
                        Danh sách các trang web vệ tinh đang tích hợp hệ thống bong bóng Chatbot Support.
                    </p>
                </div>
                <button 
                    onClick={fetchSites}
                    disabled={loading}
                    style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #d0d7de', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        cursor: 'pointer', 
                        fontWeight: 600,
                        color: '#24292e'
                    }}
                >
                    {loading ? '⏳' : '🔄 更新'}
                </button>
            </div>
            
            {/* Vùng hiển thị bảng dữ liệu */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e1e4e8', overflow: 'hidden' }}>
                <div style={{ padding: '12px 24px', backgroundColor: '#f6f8fa', borderBottom: '1px solid #e1e4e8' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1f2328' }}>
                        📋 登録サイト一覧 (Danh sách Site đang hoạt động)
                    </h4>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#ffffff', color: '#57606a', borderBottom: '1px solid #d0d7de' }}>
                                <th style={{ padding: '12px 24px', fontWeight: 600, width: '20%' }}>Mã Kênh (Site ID)</th>
                                <th style={{ padding: '12px 24px', fontWeight: 600, width: '30%' }}>Tên hiển thị</th>
                                <th style={{ padding: '12px 24px', fontWeight: 600, width: '35%' }}>Link hỗ trợ dự phòng</th>
                                <th style={{ padding: '12px 24px', fontWeight: 600, textAlign: 'center', width: '15%' }}>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#57606a' }}>
                                        ⏳ Đang kết nối cơ sở dữ liệu hệ thống...
                                    </td>
                                </tr>
                            ) : sites.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#57606a' }}>
                                        ❌ Không tìm thấy dữ liệu Site nào được cấp quyền.
                                    </td>
                                </tr>
                            ) : (
                                sites.map((site, idx) => (
                                    <tr key={site.site_id} style={{ 
                                        borderBottom: '1px solid #f6f8fa',
                                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfc'
                                    }}>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{ 
                                                padding: '3px 8px', 
                                                backgroundColor: '#e6f0fa', 
                                                color: '#0044cc', 
                                                borderRadius: '4px', 
                                                fontSize: '11px', 
                                                fontWeight: 600 
                                            }}>
                                                {String(site.site_id).toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px', color: '#1f2328', fontWeight: 500 }}>
                                            {site.site_name}
                                        </td>
                                        <td style={{ padding: '12px 24px', color: '#0969da' }}>
                                            <a href={site.contact_url} target="_blank" rel="noreferrer" style={{ color: '#0969da', textDecoration: 'none' }}>
                                                {site.contact_url || '---'}
                                            </a>
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '2px 8px', 
                                                backgroundColor: site.is_active ? '#dafbe1' : '#ffebe9', 
                                                color: site.is_active ? '#1a7f37' : '#cf222e', 
                                                borderRadius: '2em', 
                                                fontSize: '11px', 
                                                fontWeight: 600,
                                                display: 'inline-block'
                                            }}>
                                                ● {site.is_active ? 'LIVE' : 'LOCKED'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phần đếm số lượng tổng dòng chân bảng */}
                {!loading && sites.length > 0 && (
                    <div style={{ padding: '12px 24px', backgroundColor: '#fafafa', borderTop: '1px solid #e1e4e8', textAlign: 'right', color: '#57606a', fontSize: '12px', fontWeight: 500 }}>
                        Tổng cộng: <b>{sites.length}</b> hệ thống kênh.
                    </div>
                )}
            </div>
        </div>
    );
}