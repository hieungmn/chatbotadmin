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
  <div style={{
    padding: 10,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>

    {/* TABS */}
    <div style={{
      display: 'flex',
      gap: 8,
      marginBottom: 20,
      borderBottom: '2px solid #e2e8e0',
      paddingBottom: 10
    }}>
      <button
        onClick={() => { setActiveTab('faq'); setMessage(''); }}
        style={{
          padding: '10px 20px',
          background: activeTab === 'faq' ? '#3b82f6' : 'transparent',
          color: activeTab === 'faq' ? '#fff' : '#64748b',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        FAQ Sync
      </button>

      <button
        onClick={() => { setActiveTab('ai_knowledge'); setMessage(''); }}
        style={{
          padding: '10px 20px',
          background: activeTab === 'ai_knowledge' ? '#8b5cf6' : 'transparent',
          color: activeTab === 'ai_knowledge' ? '#fff' : '#64748b',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        AI Knowledge
      </button>
    </div>

    {/* SITE SELECT */}
    <div style={{ marginBottom: 20 }}>
      <select
        value={siteId}
        onChange={(e) => setSiteId(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          width: '100%',
          maxWidth: 480
        }}
      >
        <option value="auto">Auto</option>
        <option value="s-wing">S-Wing</option>
        <option value="c-wing">C-Wing</option>
        <option value="cansuke">Cansuke</option>
        <option value="account-business">Account Business</option>
      </select>
    </div>

    {/* ================= TAB 1 ================= */}
    {activeTab === 'faq' && (
      <>
        {/* UPLOAD ZONE */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: isDragActive ? '2px dashed #3b82f6' : '1px dashed #3b82f6',
            background: isDragActive ? '#eff6ff' : '#f8fafc',
            padding: 50,
            borderRadius: 10,
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          📄 Click or drop Excel/CSV
        </div>

        {/* COMMIT BUTTON (FIXED HERE) */}
        <div style={{ marginTop: 15, textAlign: 'right' }}>
          <button
            onClick={handleCommitSync}
            disabled={previewData.length === 0 || loading}
            style={{
              padding: '10px 20px',
              background: previewData.length === 0 ? '#94a3b8' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: previewData.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Syncing...' : 'Commit Sync'}
          </button>
        </div>

        {/* TABLE */}
        <div style={{ marginTop: 20 }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Data ID</th>
                <th>Category</th>
                <th>Keywords</th>
                <th>Answer</th>
                <th>Redirect</th>
              </tr>
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                    No data
                  </td>
                </tr>
              ) : (
                previewData.map((r, i) => (
                  <tr key={i}>
                    <td>{r.data_id}</td>
                    <td>{r.category}</td>
                    <td>{r.keywords}</td>
                    <td>{r.answer_text}</td>
                    <td>{r.redirect_url || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </>
    )}

    {/* ================= TAB 2 ================= */}
    {activeTab === 'ai_knowledge' && (
      <div style={{ marginTop: 20 }}>

        <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
          <label>
            <input
              type="radio"
              checked={knowledgeFileType === 'word'}
              onChange={() => setKnowledgeFileType('word')}
            />
            Word
          </label>

          <label>
            <input
              type="radio"
              checked={knowledgeFileType === 'excel'}
              onChange={() => setKnowledgeFileType('excel')}
            />
            Excel
          </label>
        </div>

        <input
          ref={knowledgeFileInputRef}
          type="file"
          accept={knowledgeFileType === 'word' ? '.docx,.doc' : '.xlsx,.xls'}
          onChange={handleSelectKnowledgeFile}
          style={{ display: 'none' }}
        />

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
            cursor: 'pointer'
          }}
        >
          📦 Click or drop knowledge file
        </div>

        {selectedKnowledgeFile && (
          <div style={{ marginTop: 15 }}>
            <button
              onClick={handleUploadKnowledge}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Uploading...' : 'Upload Knowledge'}
            </button>
          </div>
        )}
      </div>
    )}

    {/* MESSAGE */}
    {message && (
      <div style={{
        marginTop: 20,
        padding: 12,
        borderRadius: 8,
        background: isError ? '#fee2e2' : '#ecfdf5',
        color: isError ? '#991b1b' : '#065f46'
      }}>
        {message}
      </div>
    )}

  </div>
)};