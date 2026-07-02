import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AnalyticsLog } from '../../types/chat.types';

export default function Analytics() {
    const [logs, setLogs] = useState<AnalyticsLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchLogs = () => {
        setLoading(true);
        const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
        const config = {
            headers: { Authorization: token ? `Bearer ${token}` : '' }
        };

        axios.get('http://localhost:3000/api/v1/admin/analytics', config)
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

    // Chuẩn bị dữ liệu cho biểu đồ (Lấy tối đa top 7 từ khóa để biểu đồ không bị dày đặc)
    const chartData = logs
        .slice(0, 7)
        .map(item => ({
            name: item.keyword_missed.length > 12 ? `${item.keyword_missed.substring(0, 12)}...` : item.keyword_missed,
            'Số lần tìm trượt': item.count
        }));

    // Tính toán số liệu tổng quan
    const totalMissedCount = logs.reduce((sum, item) => sum + item.count, 0);
    const uniqueKeywords = logs.length;

    return (
        <div style={{ 
            padding: '24px', 
            backgroundColor: '#f4f6f9', 
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            minHeight: '100vh',
            color: '#333333'
        }}>
            {/* Header kiểu Nhật: Gọn gàng, phân tách bằng border mờ */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '24px',
                backgroundColor: '#ffffff',
                padding: '16px 24px',
                borderRadius: '6px',
                border: '1px solid #e1e4e8'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📊</span> 検索アナリティクス (Search Analytics Logs)
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666666', fontSize: '12px' }}>
                        Danh sách thống kê các từ khóa không tìm thấy câu trả lời phù hợp trong hệ thống.
                    </p>
                </div>
                <button 
                    onClick={fetchLogs}
                    disabled={loading}
                    style={{ 
                        padding: '8px 16px', 
                        backgroundColor: loading ? '#e1e4e8' : '#0066cc', 
                        border: '1px solid #0055b3', 
                        borderRadius: '4px', 
                        fontSize: '13px', 
                        cursor: loading ? 'not-allowed' : 'pointer', 
                        fontWeight: 600, 
                        color: loading ? '#999999' : '#ffffff',
                        transition: 'all 0.1s ease'
                    }}
                >
                    {loading ? '⏳ 読み込み中...' : '🔄 データ更新'}
                </button>
            </div>

            {/* Khối Thống kê nhanh / KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', border: '1px solid #e1e4e8', borderLeft: '4px solid #0066cc' }}>
                    <div style={{ fontSize: '12px', color: '#666666', fontWeight: 600 }}>TỔNG SỐ TỪ KHÓA HỤT</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginTop: '8px' }}>
                        {uniqueKeywords} <span style={{ fontSize: '14px', fontWeight: 500, color: '#666666' }}>loại</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', border: '1px solid #e1e4e8', borderLeft: '4px solid #ff9900' }}>
                    <div style={{ fontSize: '12px', color: '#666666', fontWeight: 600 }}>TỔNG TẦN SUẤT TRƯỢT</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginTop: '8px' }}>
                        {totalMissedCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#666666' }}>lần gõ</span>
                    </div>
                </div>
            </div>

            {/* Khối Biểu đồ trực quan */}
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '6px', border: '1px solid #e1e4e8', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 700, color: '#1a1a1a', borderBottom: '1px solid #eeeeee', paddingBottom: '10px' }}>
                    📈 Top 7 từ khóa bị trượt nhiều nhất (Top Missed Keywords)
                </h4>
                {loading ? (
                    <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999', fontSize: '13px' }}>
                        Đang dựng biểu đồ...
                    </div>
                ) : chartData.length === 0 ? (
                    <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999', fontSize: '13px' }}>
                        Không có dữ liệu để hiển thị biểu đồ.
                    </div>
                ) : (
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666666' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#666666' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', fontSize: 12, borderRadius: 4 }} />
                                <Bar dataKey="Số lần tìm trượt" fill="#0066cc" radius={[4, 4, 0, 0]} barSize={35} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Khối Bảng thông tin chi tiết */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e1e4e8', overflow: 'hidden' }}>
                <h4 style={{ margin: 0, padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: '#1a1a1a', backgroundColor: '#fafafa', borderBottom: '1px solid #e1e4e8' }}>
                    📄 詳細データ一覧 (Detailed List)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f5f5f5', color: '#555555', borderBottom: '1px solid #e1e4e8' }}>
                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Site ID</th>
                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Từ khóa bị hụt (Keyword Missed)</th>
                                <th style={{ padding: '12px 24px', fontWeight: 600, textAlign: 'right' }}>Số lần trượt (Hit Count)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#999999' }}>⏳ Đang đồng bộ thông tin...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#999999' }}>🎉 Hệ thống sạch sẽ! Không có từ khóa hụt.</td>
                                </tr>
                            ) : (
                                logs.map((log, idx) => (
                                    <tr key={idx} style={{ 
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                                    }}>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{ 
                                                padding: '2px 6px', 
                                                backgroundColor: '#e6f0fa', 
                                                color: '#0044cc', 
                                                borderRadius: '3px', 
                                                fontSize: '11px', 
                                                fontWeight: 'bold' 
                                            }}>
                                                {String(log.site_id).toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px', color: '#1a1a1a', fontWeight: 500 }}>
                                            {log.keyword_missed}
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 'bold', color: '#dd3333' }}>
                                            {log.count.toLocaleString()} 回
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}