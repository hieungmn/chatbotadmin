import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Site } from '../../types/chat.types';

export default function ManageSites() {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        axios.get('http://localhost:3000/api/v1/admin/sites')
            .then(res => { if (res.data.success) setSites(res.data.sites); })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 5px 0' }}>🌐 Quản lý Kênh Hệ thống (Sites)</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>Danh sách các site vệ tinh đang nhúng bong bóng chat support.</p>
            
            {loading ? <p>Đang tải dữ liệu...</p> : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Mã Kênh (Site ID)</th>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Tên hiển thị</th>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Link hỗ trợ dự phòng (Contact URL)</th>
                                <th style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sites.map((site) => (
                                <tr key={site.site_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{site.site_id}</td>
                                    <td style={{ padding: '12px' }}>{site.site_name}</td>
                                    <td style={{ padding: '12px', color: '#3b82f6' }}>{site.contact_url}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', backgroundColor: site.is_active ? '#d1fae5' : '#fee2e2', color: site.is_active ? '#065f46' : '#991b1b', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {site.is_active ? 'LIVE' : 'LOCKED'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}