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
    const autoRouteSiteId = (dataId: string, currentSelect: string): string => {
        if (currentSelect !== 'auto') return currentSelect;
        const idUpper = String(dataId).toUpperCase();
        if (idUpper.includes('CW')) return 'c-wing';
        if (idUpper.includes('CS') || idUpper.includes('CANSUKE')) return 'cansuke';
        if (idUpper.includes('AB') || idUpper.includes('ACCOUNT')) return 'account-business';
        return 's-wing';
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
               
                const formattedData: ExcelFaqItem[] = rawRows.map((row: any) => {
                    const data_id = String(row['Data ID'] || row['data_id'] || '').trim();
                    return {
                        data_id: data_id,
                        site_id: autoRouteSiteId(data_id, siteId),
                        category: row['Category'] || row['category'] || 'Chung',
                        keywords: row['Search Keywords'] || row['keywords'] || '',
                        answer_text: row['Resolved Answer (日本語)'] || row['answer_text'] || '',
                        redirect_url: row['Redirection Destination'] || row['redirect_url'] || ''
                    };
                });

                setPreviewData(formattedData);
                setIsError(false);
                setMessage(`📂 Đã tải thành công ${formattedData.length} dòng dữ liệu! Vui lòng kiểm tra và ấn nút Commit.`);
            } catch (err) {
                setIsError(true);
                setMessage('❌ Không thể xử lý định dạng file Excel/CSV này. Hãy kiểm tra lại cấu trúc cột!');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
        else if (e.type === "dragleave") setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleCommitSync = async () => {
        if (previewData.length === 0) return;
        setLoading(true); setMessage('');
        try {
            const response = await axios.post('http://localhost:3000/api/v1/admin/faq/sync', {
                site_id: siteId,
                faq_list: previewData
            });
            if (response.data.success) {
                setIsError(false);
                setMessage(`✅ ${response.data.message || 'Đồng bộ cơ sở dữ liệu thành công!'}`);
                setPreviewData([]);
            } else {
                setIsError(true);
                setMessage(`❌ ${response.data.message || 'Đồng bộ thất bại.'}`);
            }
        } catch (err) {
            setIsError(true); setMessage('❌ Lỗi kết nối thất bại đến Node.js Server!');
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC TAB 2: AI KNOWLEDGE SYSTEM ---
    const handleKnowledgeDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setIsKnowledgeDragActive(true);
        else if (e.type === "dragleave") setIsKnowledgeDragActive(false);
    };

    const handleKnowledgeDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsKnowledgeDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setSelectedKnowledgeFile(file);
            setMessage(`📄 Sẵn sàng nạp file: ${file.name}`);
            setIsError(false);
        }
    };

    const handleSelectKnowledgeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedKnowledgeFile(file);
            setMessage(`📄 Sẵn sàng nạp file: ${file.name}`);
            setIsError(false);
        }
    };

    const handleUploadKnowledge = async () => {
        if (!selectedKnowledgeFile) {
            setIsError(true);
            setMessage('❌ Vui lòng chọn tệp tin tri thức trước khi nạp!');
            return;
        }
        setLoading(true); setMessage('');
        try {
            const formData = new FormData();
            formData.append('file', selectedKnowledgeFile);
            formData.append('site_id', siteId === 'auto' ? 's-wing' : siteId);
            formData.append('file_type', knowledgeFileType);

            const result = await uploadKnowledgeFile(formData);
            if (result.success) {
                setIsError(false);
                setMessage(`🚀 Thành công: ${result.message || 'Dữ liệu văn bản đã được Vector hóa thành công!'}`);
                setSelectedKnowledgeFile(null);
            } else {
                setIsError(true);
                setMessage(`❌ Thất bại: ${result.message || 'Lỗi xử lý tệp tin từ phía AI.'}`);
            }
        } catch (error: any) {
            setIsError(true);
            setMessage(`❌ Lỗi kết nối API nạp tri thức: ${error?.response?.data?.message || 'Server lỗi!'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '10px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            
            {/* THANH ĐIỀU HƯỚNG TABS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                <button
                    onClick={() => { setActiveTab('faq'); setMessage(''); }}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: activeTab === 'faq' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'faq' ? '#fff' : '#64748b',
                        border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                    }}
                >
                    🗂️ Tab 1: FAQ Database Sync (Excel)
                </button>
                <button
                    onClick={() => { setActiveTab('ai_knowledge'); setMessage(''); }}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: activeTab === 'ai_knowledge' ? '#8b5cf6' : 'transparent',
                        color: activeTab === 'ai_knowledge' ? '#fff' : '#64748b',
                        border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                    }}
                >
                    🤖 Tab 2: AI Knowledge Base (Word/RAG)
                </button>
            </div>

            {/* PHẦN 1: TARGET SCOPE ALLOCATION */}
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>
                    1. Target Scope Allocation:
                </label>
                <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '480px', fontSize: '14px', color: '#334155', backgroundColor: '#fff', outline: 'none' }}
                >
                    <option value="auto">☀️ Auto-distribute All Channels (Unified Master File)</option>
                    <option value="s-wing">S-Wing Học Đường</option>
                    <option value="c-wing">C-Wing Community</option>
                    <option value="cansuke">Cansuke Support</option>
                    <option value="account-business">Account Business</option>
                </select>

                {activeTab === 'faq' ? (
                    <div
                        onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            marginTop: '20px',
                            border: isDragActive ? '2px dashed #3b82f6' : '1px dashed #3b82f6',
                            backgroundColor: isDragActive ? '#eff6ff' : '#f8fafc',
                            borderRadius: '10px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer'
                        }}
                    >
                        <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} style={{ display: 'none' }} />
                        <div style={{ fontSize: '40px', color: '#94a3b8', marginBottom: '10px' }}>📄</div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                            Drag and drop Master Excel (<span style={{ fontWeight: 600 }}>.xlsx</span>) or CSV file here, or <span style={{ color: '#2563eb', fontWeight: 600 }}>browse desktop</span>
                        </p>
                    </div>
                ) : (
                    <div style={{ marginTop: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                            Chọn định dạng tài liệu thô:
                        </label>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <label style={{ fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                                <input type="radio" name="kb_type" value="word" checked={knowledgeFileType === 'word'} onChange={() => setKnowledgeFileType('word')} style={{ marginRight: '6px' }} /> 
                                Microsoft Word (.docx)
                            </label>
                            <label style={{ fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                                <input type="radio" name="kb_type" value="excel" checked={knowledgeFileType === 'excel'} onChange={() => setKnowledgeFileType('excel')} style={{ marginRight: '6px' }} /> 
                                Sổ tay Excel thô (.xlsx)
                            </label>
                        </div>

                        <div
                            onDragEnter={handleKnowledgeDrag} onDragOver={handleKnowledgeDrag} onDragLeave={handleKnowledgeDrag} onDrop={handleKnowledgeDrop}
                            onClick={() => knowledgeFileInputRef.current?.click()}
                            style={{
                                border: isKnowledgeDragActive ? '2px dashed #8b5cf6' : '1px dashed #8b5cf6',
                                backgroundColor: isKnowledgeDragActive ? '#f5f3ff' : '#f8fafc',
                                borderRadius: '10px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer'
                            }}
                        >
                            <input ref={knowledgeFileInputRef} type="file" accept={knowledgeFileType === 'word' ? '.docx, .doc' : '.xlsx, .xls'} onChange={handleSelectKnowledgeFile} style={{ display: 'none' }} />
                            <div style={{ fontSize: '40px', color: '#c084fc', marginBottom: '10px' }}>🤖</div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                                Kéo thả file tài liệu <span style={{ fontWeight: 600, color: '#7c3aed' }}>{knowledgeFileType.toUpperCase()}</span> vào đây, hoặc <span style={{ color: '#7c3aed', fontWeight: 600 }}>chọn từ máy tính</span>
                            </p>
                        </div>

                        {selectedKnowledgeFile && (
                            <div style={{ marginTop: '16px', textAlign: 'right' }}>
                                <button
                                    onClick={handleUploadKnowledge} disabled={loading}
                                    style={{ padding: '12px 24px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}
                                >
                                    {loading ? '⏳ Đang nạp Vector...' : '⚡ Kích hoạt nạp tri thức AI RAG'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* THÔNG BÁO ALERT */}
            {message && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: isError ? '#fee2e2' : '#ecfdf5', color: isError ? '#991b1b' : '#065f46', fontSize: '14px', marginBottom: '20px', fontWeight: 500 }}>
                    {message}
                </div>
            )}

            {/* PHẦN 2: PREVIEW BẢNG (CHỈ HIỂN THỊ KHI Ở TAB FAQ) */}
            {activeTab === 'faq' && (
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    {/* 🛠️ SỬA CHÍNH XÁC: Thay thế từ 'justifycontent' lỗi thành 'justifyContent' viết chuẩn camelCase */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                            👁️ Filtered Records Preview ({previewData.length} rows)
                        </div>
                        <button
                            onClick={handleCommitSync} disabled={previewData.length === 0 || loading}
                            style={{ padding: '10px 20px', backgroundColor: previewData.length === 0 ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: previewData.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {loading ? '⏳ Synchronizing...' : '🔄 Commit Live Sync to Server'}
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px' }}>Data ID</th>
                                    <th style={{ padding: '12px' }}>Category</th>
                                    <th style={{ padding: '12px' }}>Search Keywords</th>
                                    <th style={{ padding: '12px' }}>Resolved Answer (日本語)</th>
                                    <th style={{ padding: '12px' }}>Redirection Destination</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                            No active data payload loaded. Import a master spreadsheet to generate previews.
                                        </td>
                                    </tr>
                                ) : (
                                    previewData.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{row.data_id}</td>
                                            <td style={{ padding: '12px', color: '#475569' }}>{row.category}</td>
                                            <td style={{ padding: '12px', color: '#475569' }}>{row.keywords}</td>
                                            <td style={{ padding: '12px', color: '#0f172a', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.answer_text}</td>
                                            <td style={{ padding: '12px', color: '#2563eb' }}>{row.redirect_url || '---'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}