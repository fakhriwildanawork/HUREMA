-- SKRIP SETUP TABEL PENGATURAN MASTER APLIKASI
-- Jalankan skrip ini di SQL Editor Supabase Anda

-- 1. Buat Tabel app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Buat Policy agar data dapat dibaca oleh semua user (Public Read)
CREATE POLICY "Allow public read access" ON public.app_settings
    FOR SELECT USING (true);

-- 4. Buat Policy agar data dapat diupdate oleh admin (Authenticated Update)
CREATE POLICY "Allow authenticated update" ON public.app_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Masukkan Data Konfigurasi Awal (Default)
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('ot_approval_policy', '"manual"', 'Kebijakan persetujuan lembur: manual atau auto')
ON CONFLICT (key) DO NOTHING;

-- Berikan komentar pada tabel
COMMENT ON TABLE public.app_settings IS 'Tabel untuk menyimpan parameter konfigurasi master aplikasi';
