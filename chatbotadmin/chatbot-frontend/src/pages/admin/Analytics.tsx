import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalyticsLog } from '../../types/chat.types';

export default function Analytics() {
    const [logs, setLogs] = useState<AnalyticsLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchLogs = () => {
        setLoading(true);
        axios.get('http://localhost:3000/api/v1/admin/analytics')
            .then(res => {
                if (res.data.success) {
                    setLogs(res.data.top_missed_keywords || []);
                }
            })
            .catch(err => console.error('Lỗi fetch analytics:', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>📊 Search Analytics Logs</h3>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Danh sách từ khóa khách hàng gõ nhưng chatbot không tìm thấy câu trả lời khớp.</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    disabled={loading}
                    style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
                >
                    {loading ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
            </div>
            
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px' }}>Site ID</th>
                            <th style={{ padding: '12px' }}>Keyword Missed (Từ khóa hụt)</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Hit Count (Số lần gõ trượt)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Đang kết nối cơ sở dữ liệu...</td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>🎉 Hệ thống sạch sẽ! Chưa ghi nhận từ khóa hụt nào.</td>
                            </tr>
                        ) : (
                            logs.map((log, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                            {String(log.site_id).toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', color: '#334155', fontWeight: 500 }}>"{log.keyword_missed}"</td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{log.count} lần</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}