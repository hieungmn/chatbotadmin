// chatbot-frontend/src/types/ai.ts

/**
 * Kiểu dữ liệu quản lý trạng thái File Tri Thức AI
 */
export interface ISiteKnowledgeFile {
    id: number;
    site_id: string;       // Thuộc site nào
    uploaded_by: number | null; // ID của User/Staff upload
    file_name: string;     // Tên file gốc (VD: chieu-khau-2026.xlsx)
    file_type: 'excel' | 'word' | 'image';
    file_path: string;     // Đường dẫn lưu file trên server
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string | null; // Log lỗi nếu AI bóc tách thất bại
    created_at: string | Date;
    updated_at: string | Date;
}

/**
 * Kiểu dữ liệu các đoạn văn bản ngắn sau khi được băm nhỏ (Chunks)
 */
export interface ISiteKnowledgeChunk {
    id: number;
    file_id: number;       // Liên kết với file gốc
    site_id: string;
    content_text: string;  // Đoạn chữ thô cắt ra để AI đọc làm ngữ cảnh
    created_at: string | Date;
}

/**
 * Cập nhật lại kiểu dữ liệu SearchLog cũ của bạn để khớp luồng hiển thị Analytics bên FE
 */
export interface ISearchLog {
    id: number;
    session_id: string;
    site_id: string;
    query_text: string;
    is_missed: boolean;
    matched_faq_id: number | null;
    searched_at: string | Date;
    
    // 💡 2 trường mới hỗ trợ hiển thị đoạn chat được trả lời bằng AI
    response_source: 'faq' | 'ai';
    ai_response: string | null;
}