SET search_path TO public;

-- ==========================================
-- 0. KHỞI TẠO CÁC EXTENSION MỞ RỘNG
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector; -- Kích hoạt pgvector thành công trên Windows

-- Dọn dẹp sạch sẽ toàn bộ 12 bảng cũ tránh xung đột ràng buộc khóa ngoại (CASCADE)
DROP TABLE IF EXISTS public.faq_feedback_logs CASCADE;
DROP TABLE IF EXISTS public.search_logs CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.site_knowledge_chunks CASCADE; 
DROP TABLE IF EXISTS public.site_knowledge_files CASCADE;  
DROP TABLE IF EXISTS public.faq_master CASCADE;
DROP TABLE IF EXISTS public.user_action_logs CASCADE;
DROP TABLE IF EXISTS public.user_site_permissions CASCADE; 
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Hàm tiện ích tự động đồng bộ thời gian cập nhật updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ==========================================
-- 1. BẢNG TÀI KHOẢN TỐI CAO (ADMIN_USERS)
-- ==========================================
CREATE TABLE public.admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    full_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. BẢNG LOG THAO TÁC ADMIN (ADMIN_AUDIT_LOGS)
-- ==========================================
CREATE TABLE public.admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id INT REFERENCES public.admin_users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, 
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. BẢNG QUẢN LÝ KÊNH/SATELLITE SITES (SITES)
-- ==========================================
CREATE TABLE public.sites (
    site_id VARCHAR(50) PRIMARY KEY, 
    site_name VARCHAR(100) NOT NULL,
    contact_url TEXT NOT NULL,       
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 4. BẢNG TÀI KHOẢN NHÂN VIÊN THƯỜNG (USERS)
-- ==========================================
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 5. BẢNG PHÂN QUYỀN NHÂN VIÊN - SITE (USER_SITE_PERMISSIONS)
-- ==========================================
CREATE TABLE public.user_site_permissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    granted_by INT REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_site UNIQUE(user_id, site_id) 
);
CREATE INDEX IF NOT EXISTS idx_usp_user ON public.user_site_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_usp_site ON public.user_site_permissions(site_id);

-- ==========================================
-- 6. BẢNG LOG THAO TÁC CỦA NHÂN VIÊN (USER_ACTION_LOGS)
-- ==========================================
CREATE TABLE public.user_action_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_user ON public.user_action_logs(user_id);

-- ==========================================
-- 7. BẢNG KHO FAQ CỨNG CỐ ĐỊNH (FAQ_MASTER)
-- ==========================================
CREATE TABLE public.faq_master (
    id SERIAL PRIMARY KEY,
    data_id VARCHAR(50) NOT NULL,     
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL DEFAULT 'Chung',
    keywords TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL, 
    answer_text TEXT NOT NULL,
    redirect_url TEXT DEFAULT NULL,   
    is_draft BOOLEAN NOT NULL DEFAULT TRUE, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_faq_site_data UNIQUE(site_id, data_id)
);
CREATE INDEX IF NOT EXISTS idx_faq_site ON public.faq_master(site_id);
CREATE INDEX IF NOT EXISTS idx_faq_publish ON public.faq_master(site_id, is_draft);
CREATE INDEX IF NOT EXISTS idx_faq_keywords_trgm ON public.faq_master USING gin (keywords gin_trgm_ops);

-- ==========================================
-- 8. BẢNG QUẢN LÝ TÀI LIỆU AI UPLOAD (SITE_KNOWLEDGE_FILES)
-- ==========================================
CREATE TABLE public.site_knowledge_files (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    uploaded_by INT REFERENCES public.admin_users(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skf_site ON public.site_knowledge_files(site_id);

-- ==========================================
-- 9. 🎯 BẢNG LƯU TRỮ TRÍ THỨC AI CẮT NHỎ (SITE_KNOWLEDGE_CHUNKS)
--    Đã tối ưu chuẩn số chiều 768 cho model nomic-embed-text của Ollama
-- ==========================================
CREATE TABLE public.site_knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    file_id INT NOT NULL REFERENCES public.site_knowledge_files(id) ON DELETE CASCADE,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,                     
    embedding vector(768) NOT NULL,                -- 🎯 ĐÃ ĐỔI THÀNH VECTOR CHIỀU SỐ 768 CHUẨN OLLAMA
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skc_file ON public.site_knowledge_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_skc_site ON public.site_knowledge_chunks(site_id);

-- Thiết lập chỉ mục HNSW chuyên dụng để thuật toán Cosine Distance quét mượt và siêu nhanh
CREATE INDEX IF NOT EXISTS idx_skc_embedding_hnsw 
ON public.site_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- ==========================================
-- 10. BẢNG QUẢN LÝ PHIÊN CHAT CỦA KHÁCH (CHAT_SESSIONS)
-- ==========================================
CREATE TABLE public.chat_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_site ON public.chat_sessions(site_id);
--10.1 bang lich su chat cua nguoi dung va AI
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' (Khách) hoặc 'assistant' (AI)
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo Index để bốc lịch sử chat siêu tốc theo session_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
-- ==========================================
-- 11. BẢNG LOG LỊCH SỬ CHAT VÀ PHÂN TÍCH (SEARCH_LOGS)
-- ==========================================
CREATE TABLE public.search_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,          
    is_missed BOOLEAN NOT NULL DEFAULT FALSE, 
    matched_faq_id INT REFERENCES public.faq_master(id) ON DELETE SET NULL, 
    searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 💡 ĐÃ SỬA: Thêm 'fallback' vào Ràng buộc check để không lỗi khi hệ thống không bốc trúng FAQ/AI
    response_source VARCHAR(20) DEFAULT 'faq' CHECK (response_source IN ('faq', 'ai', 'fallback')),
    ai_response TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_logs_session ON public.search_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_site_missed ON public.search_logs(site_id, is_missed);
CREATE INDEX IF NOT EXISTS idx_search_logs_faq ON public.search_logs(matched_faq_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_time ON public.search_logs(searched_at DESC);

-- ==========================================
-- 12. BẢNG ĐÁNH GIÁ FEEDBACK LIKE/DISLIKE (FAQ_FEEDBACK_LOGS)
-- ==========================================
CREATE TABLE public.faq_feedback_logs (
    id BIGSERIAL PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    session_id VARCHAR(100) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
    faq_id INT NOT NULL REFERENCES public.faq_master(id) ON DELETE CASCADE,
    search_log_id BIGINT REFERENCES public.search_logs(id) ON DELETE SET NULL,
    score SMALLINT NOT NULL CHECK (score IN (1, -1)), 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_site ON public.faq_feedback_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_feedback_faq ON public.faq_feedback_logs(faq_id);
CREATE INDEX IF NOT EXISTS idx_feedback_score ON public.faq_feedback_logs(score);


-- ==========================================
-- KÍCH HOẠT TRIGGER TỰ ĐỘNG CHO CÁC BẢNG CẬP NHẬT
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_admin_users_updated') THEN
        CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sites_updated') THEN
        CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated') THEN
        CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_faq_master_updated') THEN
        CREATE TRIGGER trg_faq_master_updated BEFORE UPDATE ON public.faq_master FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_knowledge_files_updated') THEN
        CREATE TRIGGER trg_knowledge_files_updated BEFORE UPDATE ON public.site_knowledge_files FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;


-- ==========================================
-- KHỞI TẠO DỮ LIỆU ĐẦU (SEED DATA)
-- ==========================================
INSERT INTO public.sites (site_id, site_name, contact_url) VALUES 
('s-wing', 'Hệ thống S-Wing', 'https://support.s-wing.jp'),
('c-wing', 'Hệ thống C-Wing', 'https://support.c-wing.jp'),
('cansuke', 'Ứng dụng Cansuke', 'https://support.cansuke.jp'),
('account-business', 'Khối Tài chính Doanh nghiệp', 'https://support.business.jp'),
('auto', 'Kênh phân phối dữ liệu tự động', 'https://support.master.jp')
ON CONFLICT (site_id) DO NOTHING;

INSERT INTO public.admin_users (username, password_hash, full_name, role, is_active) 
VALUES ('admin', '123456', 'Hieu Super Admin', 'admin', true)
ON CONFLICT (username) DO UPDATE SET role = 'admin', password_hash = '123456', is_active = true;

INSERT INTO public.users (username, password_hash, full_name, is_active)
VALUES ('nhanvien_test', '123456', 'Nhân Viên Chưa Có Quyền', true)
ON CONFLICT (username) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
