import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminAuditLog } from '../../types/chat.types';
// Thay vì import API from './api' hoặc '../../api'

export default function AuditLogs() {
    const [logs, setLogs] = useState<AdminAuditLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        axios.get('http://localhost:3000/api/v1/admin/audit-logs')
            .then(res => { if (res.data.success) setLogs(res.data.logs); })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 5px 0' }}>📜 Nhật ký hoạt động hệ thống (Audit Logs)</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>Theo dõi vết các thao tác nhạy cảm của tài khoản quản trị tối cao.</p>

            {loading ? <p>Đang tải nhật ký...</p> : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Thời gian thực hiện</th>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Hành động</th>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Chi tiết vận hành</th>
                                <th style={{ padding: '12px', fontSize: '13px' }}>Địa chỉ IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ padding: '4px 8px', backgroundColor: log.action_type === 'LOGIN' ? '#e0f2fe' : '#fef3c7', color: log.action_type === 'LOGIN' ? '#0369a1' : '#d97706', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#334155' }}>{log.details || '---'}</td>
                                    <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>{log.ip_address || 'Unknown'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}