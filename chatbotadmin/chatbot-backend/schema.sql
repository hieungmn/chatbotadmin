-- =========================================================================
-- HỆ THỐNG QUẢN LÝ CHATBOT FAQ - DATABASE SCHEMA V3 (MỞ RỘNG 10 BẢNG)
-- Dùng cho: pgAdmin 4 / PostgreSQL
-- Cơ chế: Nhân viên trắng quyền, đợi Admin cấp phép qua bảng thứ 10
-- =========================================================================

SET search_path TO public;

-- Khôi phục trạng thái sạch cho Database (Dọn dẹp tránh xung đột khóa ngoại)
DROP TABLE IF EXISTS public.faq_feedback_logs CASCADE;
DROP TABLE IF EXISTS public.search_logs CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.faq_master CASCADE;
DROP TABLE IF EXISTS public.user_action_logs CASCADE;
DROP TABLE IF EXISTS public.user_site_permissions CASCADE; 
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- ==========================================
-- CÁC TIỆN ÍCH & HÀM BỔ TRỢ HỆ THỐNG
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
-- 1. PHÂN HỆ QUẢN TRỊ TỐI CAO (SUPER ADMIN)
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

CREATE TABLE public.admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id INT REFERENCES public.admin_users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, 
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. BẢNG TRUNG TÂM ĐIỀU PHỐI KÊNH (SITES)
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
-- 3. PHÂN HỆ NHÂN SỰ VÀ BẢNG 10 PHÂN QUYỀN TỪ ADMIN
-- ==========================================

-- Bảng 4: Tài khoản nhân viên bình thường (Tạo xong để đấy, chưa có quyền gì)
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng 5 (BẢNG THỨ 10): Nơi lưu trữ các website được Admin "bật công tắc" cho phép nhân viên xài
CREATE TABLE public.user_site_permissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    granted_by INT REFERENCES public.admin_users(id) ON DELETE SET NULL, -- Lưu vết Admin nào đã cấp quyền
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_site UNIQUE(user_id, site_id) 
);

CREATE INDEX IF NOT EXISTS idx_usp_user ON public.user_site_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_usp_site ON public.user_site_permissions(site_id);

-- Bảng 6: Nhật ký thao tác của nhân viên khi vào các site được cấp phép
CREATE TABLE public.user_action_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, 
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_user ON public.user_action_logs(user_id);

-- ==========================================
-- 4. KHO DỮ LIỆU CÂU HỎI (EXCEL FAQ MASTER)
-- ==========================================
CREATE TABLE public.faq_master (
    id SERIAL PRIMARY KEY,
    data_id VARCHAR(50) NOT NULL,     
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL DEFAULT 'Chung',
    keywords TEXT NOT NULL DEFAULT '', 
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
-- 5. PHÂN HỆ VẬN HÀNH CHAT & NHẬT KÝ LOGS ANALYTICS
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

CREATE TABLE public.search_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
    site_id VARCHAR(50) NOT NULL REFERENCES public.sites(site_id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,          
    is_missed BOOLEAN NOT NULL DEFAULT FALSE, 
    matched_faq_id INT REFERENCES public.faq_master(id) ON DELETE SET NULL, 
    searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_session ON public.search_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_site_missed ON public.search_logs(site_id, is_missed);
CREATE INDEX IF NOT EXISTS idx_search_logs_faq ON public.search_logs(matched_faq_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_time ON public.search_logs(searched_at DESC);

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
-- 6. ĐĂNG KÝ TRIGGER TỰ ĐỘNG CẬP NHẬT THỜI GIAN
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
END $$;

-- ==========================================
-- 7. NẠP DỮ LIỆU ĐỀM MẪU (SEED DATA CHUẨN)
-- ==========================================

-- Khởi tạo danh sách các Kênh vệ tinh hệ thống có thể quản lý
INSERT INTO public.sites (site_id, site_name, contact_url) VALUES 
('s-wing', 'Hệ thống S-Wing', 'https://support.s-wing.jp'),
('c-wing', 'Hệ thống C-Wing', 'https://support.c-wing.jp'),
('cansuke', 'Ứng dụng Cansuke', 'https://support.cansuke.jp'),
('account-business', 'Khối Tài chính Doanh nghiệp', 'https://support.business.jp'),
('auto', 'Kênh phân phối dữ liệu tự động', 'https://support.master.jp')
ON CONFLICT (site_id) DO NOTHING;

-- Khởi tạo tài khoản Admin tối cao quản lý phân quyền
INSERT INTO public.admin_users (username, password_hash, full_name, role, is_active) 
VALUES ('admin', '123456', 'Hieu Super Admin', 'admin', true)
ON CONFLICT (username) DO UPDATE SET role = 'admin', password_hash = '123456', is_active = true;

-- Khởi tạo 1 tài khoản nhân viên bình thường (Lúc này bảng user_site_permissions hoàn toàn trống)
INSERT INTO public.users (username, password_hash, full_name, is_active)
VALUES ('nhanvien_test', '123456', 'Nhân Viên Chưa Có Quyền', true)
ON CONFLICT (username) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;