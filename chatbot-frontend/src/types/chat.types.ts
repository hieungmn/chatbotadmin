// ==========================================
// 1. PHÂN HỆ QUẢN TRỊ TỐI CAO (SUPER ADMIN)
// ==========================================

// Bảng: public.admin_users
export interface AdminUser {
    id: number;
    username: string;
    full_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Bảng: public.admin_audit_logs
export interface AdminAuditLog {
    id: string; // BIGSERIAL xử lý dạng string ở JS tránh tràn số
    admin_id: number | null;
    action_type: 'LOGIN' | 'SYNC_EXCEL' | string;
    details: string | null;
    ip_address: string | null;
    created_at: string;
}

// ==========================================
// 2. BẢNG TRUNG TÂM ĐIỀU PHỐI KÊNH (SITES)
// ==========================================

// Bảng: public.sites
export interface Site {
    site_id: string; // Khóa chính dạng text ('cansuke', 's-wing',...)
    site_name: string;
    contact_url: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ==========================================
// 3. PHÂN HỆ QUẢN LÝ NHÂN SỰ VỆ TINH (USERS)
// ==========================================

// Bảng: public.users
export interface User {
    id: number;
    username: string;
    site_id: string;
    full_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Bảng: public.user_action_logs
export interface UserActionLog {
    id: string;
    user_id: number;
    action_type: string;
    details: string | null;
    created_at: string;
}

// ==========================================
// 4. KHO DỮ LIỆU CÂU HỎI (EXCEL FAQ MASTER)
// ==========================================

// Bảng: public.faq_master
export interface ExcelFaqItem {
    id?: number;
    data_id: string;
    site_id: string;
    category?: string;
    keywords?: string;
    answer_text: string;
    redirect_url?: string | null;
    is_draft?: boolean;
    created_at?: string;
    updated_at?: string;
}

// ==========================================
// 5. PHÂN HỆ VẬN HÀNH CHAT & LOGS ANALYTICS
// ==========================================

// Bảng: public.chat_sessions
export interface ChatSession {
    session_id: string;
    site_id: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    last_active_at: string;
}

// Bảng: public.search_logs (Dùng cho cả Analytics hiển thị từ khóa trượt)
export interface SearchLog {
    id: string;
    session_id: string;
    site_id: string;
    query_text: string;
    is_missed: boolean;
    matched_faq_id: number | null;
    searched_at: string;
}

// Interface phụ trợ hiển thị bảng dữ liệu nhóm gõ trượt ở màn hình Analytics
export interface AnalyticsLog {
    site_id: string;
    keyword_missed: string;
    count: number;
}

// Bảng: public.faq_feedback_logs
export interface FaqFeedbackLog {
    id: string;
    site_id: string;
    session_id: string | null;
    faq_id: number;
    search_log_id: string | null;
    score: 1 | -1; // Khớp chuẩn ràng buộc CHECK (score IN (1, -1))
    created_at: string;
}

// ==========================================
// UI INTERFACES (CẤU TRÚC PHỤ TRỢ CHO WIDGET SANBOX)
// ==========================================
export interface ChatMessage {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    redirect_url?: string | null;
    faq_id?: number;
    search_log_id?: number;
    showFeedback?: boolean;
}

export interface SuggestionChip {
    chip_label: string;
}