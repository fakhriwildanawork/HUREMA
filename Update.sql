-- Script Pembaruan Tabel account_career_logs
-- Jalankan script ini di SQL Editor Supabase Anda

ALTER TABLE account_career_logs 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;

-- Catatan: Penambahan kolom ini krusial agar fungsi 'createCareerLog' 
-- dapat menyinkronkan ID Lokasi dan ID Jadwal ke profil utama akun.