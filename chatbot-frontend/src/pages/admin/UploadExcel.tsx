import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { ExcelFaqItem } from '../../types/chat.types';
import { uploadKnowledgeFile } from '../../api/api'; 

export default function UploadExcel() {
    // State phân chia Tab màn hình quản trị
    const [activeTab, setActiveTab] = useState<'faq' | 'ai_knowledge'>('faq');

    // State của Tab 1 (FAQ Gốc)
    const [siteId, setSiteId] = useState<string>('auto');
    const [previewData, setPreviewData] = useState<ExcelFaqItem[]>([]);
    const [message, setMessage] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [isDragActive, setIsDragActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State của Tab 2 (AI Knowledge mới)
    const [knowledgeFileType, setKnowledgeFileType] = useState<'word' | 'excel'>('word');
    const [selectedKnowledgeFile, setSelectedKnowledgeFile] = useState<File | null>(null);
    const [isKnowledgeDragActive, setIsKnowledgeDragActive] = useState<boolean>(false);
    const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

    // --- LOGIC TAB 1: FAQ GRAPH SYNC ---
    const autoRouteSiteId = (dataId: string): string => {
        const idUpper = dataId.toUpperCase();
        if (idUpper.startsWith('FAQ_CW_')) return 'c-wing';
        if (idUpper.startsWith('FAQ_SW_')) return 's-wing';
        if (idUpper.startsWith('FAQ_CAN_')) return 'cansuke';
        if (idUpper.startsWith('FAQ_AB_')) return 'account-business';
        return 's-wing';
    };

    const handleProcessExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

                if (rawRows.length <= 1) {
                    setIsError(true);
                    setMessage("File Excel không có dữ liệu!");
                    return;
                }

                const dataRows = rawRows.slice(1);

                const formattedData: ExcelFaqItem[] = dataRows
                    .filter(row => row && row.length > 0 && row[0]) 
                    .map((row): ExcelFaqItem => {
                        const rawDataId = String(row[0] || '').trim();
                        const currentSiteId = siteId === 'auto' ? autoRouteSiteId(rawDataId) : siteId;

                        return {
                            data_id: rawDataId,
                            site_id: currentSiteId,
                            category: String(row[1] || '').trim(),
                            question: String(row[2] || '').trim(),     // Đọc cột Question (Cột 3)
                            keywords: String(row[3] || '').trim(),     // Dịch xuống cột 4
                            answer_text: String(row[4] || '').trim(),  // Dịch xuống cột 5
                            redirect_url: String(row[5] || '').trim(), // Dịch xuống cột 6
                            is_draft: false
                        };
                    });

                setPreviewData(formattedData);
                setIsError(false);
                setMessage(`Đã đọc thành công ${formattedData.length} dòng từ file Excel. Sẵn sàng đồng bộ!`);
            } catch (err) {
                console.error(err);
                setIsError(true);
                setMessage("Lỗi định dạng file Excel không hợp lệ!");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleProcessExcel(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleProcessExcel(e.dataTransfer.files[0]);
        }
    };

    const handleSyncData = async () => {
        if (previewData.length === 0) return;
        setLoading(true);
        setMessage('');

        try {
            const response = await axios.post('http://localhost:3000/api/v1/admin/faq/sync', {
                site_id: siteId,
                faq_list: previewData
            });

            if (response.data.success) {
                setIsError(false);
                setMessage(response.data.message || "Đồng bộ cơ sở dữ liệu FAQ hoàn tất!");
                setPreviewData([]); 
            } else {
                setIsError(true);
                setMessage(response.data.message || "Đồng bộ thất bại!");
            }
        } catch (error: any) {
            setIsError(true);
            setMessage(error.response?.data?.message || "Lỗi kết nối Server Backend!");
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC TAB 2: AI KNOWLEDGE ---
    const handleKnowledgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedKnowledgeFile(e.target.files[0]);
        }
    };

    const handleKnowledgeDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsKnowledgeDragActive(true);
        } else if (e.type === "dragleave") {
            setIsKnowledgeDragActive(false);
        }
    };

    const handleKnowledgeDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsKnowledgeDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedKnowledgeFile(e.dataTransfer.files[0]);
        }
    };

    const handleUploadKnowledge = async () => {
        if (!selectedKnowledgeFile) return;
        setLoading(true);
        setMessage('');
        try {
            // 🎯 FIX LỖI 2: Đóng gói file và các trường bổ sung vào FormData
            const formData = new FormData();
            formData.append('file', selectedKnowledgeFile);
            formData.append('site_id', siteId);
            formData.append('file_type', knowledgeFileType);

            // Gửi duy nhất 1 tham số formData chuẩn cấu trúc API
            const res = await uploadKnowledgeFile(formData);
            
            if (res.success) {
                setIsError(false);
                setMessage(res.message || "Học file tri thức RAG thành công!");
                setSelectedKnowledgeFile(null);
            } else {
                setIsError(true);
                setMessage(res.message || "Học tri thức thất bại!");
            }
        } catch (err: any) {
            setIsError(true);
            setMessage(err.response?.data?.message || "Lỗi đẩy file RAG lên hệ thống!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '30px auto', padding: '20px', background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            
            {/* TAB SELECTION BAR */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                <button 
                    onClick={() => { setActiveTab('faq'); setMessage(''); }}
                    style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'faq' ? '#2563eb' : '#e2e8f0', color: activeTab === 'faq' ? '#fff' : '#475569' }}
                >
                    🗂️ FAQ Sync (Bảng tĩnh)
                </button>
                <button 
                    onClick={() => { setActiveTab('ai_knowledge'); setMessage(''); }}
                    style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'ai_knowledge' ? '#8b5cf6' : '#e2e8f0', color: activeTab === 'ai_knowledge' ? '#fff' : '#475569' }}
                >
                    🧠 AI Knowledge (Học RAG Vector)
                </button>
            </div>

            {/* CHỌN SITE PHẠM VI */}
            <div style={{ marginBottom: 20 }}>
                {/* 🎯 FIX LỖI 3: Thay 'block: inline-block' thành 'display: block' chuẩn CSS */}
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, color: '#334155' }}>Chọn Kênh dữ liệu đích (Site Route):</label>
                <select 
                    value={siteId} 
                    onChange={(e) => setSiteId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
                >
                    <option value="auto">🤖 Tự động nhận diện (Phân phối theo mã tiền tố ID)</option>
                    <option value="s-wing">S-Wing Học Đường</option>
                    <option value="c-wing">C-Wing Quản Trị</option>
                    <option value="cansuke">Cansuke Trợ Lý</option>
                    <option value="account-business">Account Business Doanh Nghiệp</option>
                </select>
            </div>

            {/* NỘI DUNG THEO TAB 1: FAQ SYNC */}
            {activeTab === 'faq' && (
                <div>
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        style={{
                            border: isDragActive ? '2px dashed #2563eb' : '1px dashed #2563eb',
                            background: isDragActive ? '#eff6ff' : '#f8fafc',
                            padding: '40px 20px',
                            borderRadius: 10,
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: '#1e40af',
                            fontWeight: 500
                        }}
                    >
                        {isDragActive ? "Thả file Excel tại đây..." : "📥 Kéo thả hoặc Click chọn file Excel mẫu FAQ (.xlsx)"}
                    </div>

                    {/* NÚT ĐỒNG BỘ VÀ LƯỚI PREVIEW */}
                    {previewData.length > 0 && (
                        <div style={{ marginTop: 25 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                <h3 style={{ color: '#1e293b', margin: 0 }}>📋 Bản xem trước dữ liệu nạp ({previewData.length} dòng):</h3>
                                <button
                                    onClick={handleSyncData}
                                    disabled={loading}
                                    style={{
                                        padding: '12px 28px',
                                        background: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 4px rgb(37 99 235 / 0.2)'
                                    }}
                                >
                                    {loading ? '⏳ Đang đồng bộ DB...' : '🚀 Bắt đầu đồng bộ lên Hệ thống'}
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto', maxHeight: 350, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
                                            <th style={{ padding: 10 }}>DATA ID</th>
                                            <th style={{ padding: 10 }}>SITE</th>
                                            <th style={{ padding: 10 }}>DANH MỤC</th>
                                            <th style={{ padding: 10 }}>CÂU HỎI (QUESTION)</th>
                                            <th style={{ padding: 10 }}>TỪ KHÓA</th>
                                            <th style={{ padding: 10 }}>NỘI DUNG TRẢ LỜI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ padding: 10, fontWeight: 500, color: '#0f172a' }}>{item.data_id}</td>
                                                <td style={{ padding: 10 }}><span style={{ padding: '2px 6px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 'bold' }}>{item.site_id}</span></td>
                                                <td style={{ padding: 10, color: '#475569' }}>{item.category}</td>
                                                <td style={{ padding: 10, color: '#2563eb', fontWeight: 500 }}>{item.question}</td>
                                                <td style={{ padding: 10, color: '#64748b' }}>{item.keywords}</td>
                                                <td style={{ padding: 10, color: '#334155', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.answer_text}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* NỘI DUNG TAB 2: AI KNOWLEDGE */}
            {activeTab === 'ai_knowledge' && (
                <div>
                    <div style={{ marginBottom: 20, display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#334155' }}>Định dạng file tải lên:</span>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input type="radio" name="k_type" checked={knowledgeFileType === 'word'} onChange={() => setKnowledgeFileType('word')} /> 📄 File Word (.docx)
                        </label>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input type="radio" name="k_type" checked={knowledgeFileType === 'excel'} onChange={() => setKnowledgeFileType('excel')} /> 📊 File Excel văn bản thô (.xlsx)
                        </label>
                    </div>

                    <input type="file" accept={knowledgeFileType === 'word' ? '.docx' : '.xlsx, .xls'} ref={knowledgeFileInputRef} onChange={handleKnowledgeFileChange} style={{ display: 'none' }} />
                    <div 
                        onClick={() => knowledgeFileInputRef.current?.click()}
                        onDragEnter={handleKnowledgeDrag}
                        onDragOver={handleKnowledgeDrag}
                        onDragLeave={handleKnowledgeDrag}
                        onDrop={handleKnowledgeDrop}
                        style={{
                            border: isKnowledgeDragActive ? '2px dashed #8b5cf6' : '1px dashed #8b5cf6',
                            background: isKnowledgeDragActive ? '#f5f3ff' : '#f8fafc',
                            padding: 50,
                            borderRadius: 10,
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: '#6d28d9',
                            fontWeight: 500
                        }}
                    >
                        {selectedKnowledgeFile ? `📁 Chọn thành công: ${selectedKnowledgeFile.name}` : `📦 Kéo thả hoặc Click để chọn file tri thức (${knowledgeFileType === 'word' ? 'Word' : 'Excel'})`}
                    </div>

                    {selectedKnowledgeFile && (
                        <div style={{ marginTop: 15, textAlign: 'right' }}>
                            <button
                                onClick={handleUploadKnowledge}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    background: '#8b5cf6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgb(139 92 246 / 0.2)'
                                }}
                            >
                                {loading ? '⏳ Hệ thống AI đang học dữ liệu...' : '🧠 Đẩy vào não bộ AI (RAG học)'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* THÔNG BÁO KẾT QUẢ */}
            {message && (
                <div style={{
                    marginTop: 20,
                    padding: 12,
                    borderRadius: 8,
                    background: isError ? '#fee2e2' : '#dcfce7',
                    color: isError ? '#991b1b' : '#166534',
                    fontWeight: 500,
                    fontSize: '14px',
                    border: isError ? '1px solid #fca5a5' : '1px solid #86efac'
                }}>
                    {message}
                </div>
            )}
        </div>
    );
}