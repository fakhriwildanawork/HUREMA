
-- 1. Tabel Log Peringatan (Teguran, SP1, SP2, SP3)
CREATE TABLE IF NOT EXISTS account_warning_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    warning_type TEXT NOT NULL CHECK (warning_type IN ('Teguran', 'SP1', 'SP2', 'SP3')),
    reason TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT NOW(),
    file_id TEXT, -- ID Google Drive untuk scan surat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Log Pemberhentian (Resign / Pemecatan)
CREATE TABLE IF NOT EXISTS account_termination_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE UNIQUE, -- Satu akun hanya bisa punya satu log keluar
    termination_type TEXT NOT NULL CHECK (termination_type IN ('Pemecatan', 'Resign')),
    termination_date DATE NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL,
    severance_amount NUMERIC DEFAULT 0, -- Uang Pesangon (Jika PHK)
    penalty_amount NUMERIC DEFAULT 0,    -- Biaya Penalti (Jika Resign)
    file_id TEXT, -- ID Google Drive untuk berkas exit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE account_warning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_termination_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Publik (Warning Logs)
DROP POLICY IF EXISTS "Allow public read warning" ON account_warning_logs;
CREATE POLICY "Allow public read warning" ON account_warning_logs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert warning" ON account_warning_logs;
CREATE POLICY "Allow public insert warning" ON account_warning_logs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete warning" ON account_warning_logs;
CREATE POLICY "Allow public delete warning" ON account_warning_logs FOR DELETE TO public USING (true);

-- Kebijakan Akses Publik (Termination Logs)
DROP POLICY IF EXISTS "Allow public read termination" ON account_termination_logs;
CREATE POLICY "Allow public read termination" ON account_termination_logs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert termination" ON account_termination_logs;
CREATE POLICY "Allow public insert termination" ON account_termination_logs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete termination" ON account_termination_logs;
CREATE POLICY "Allow public delete termination" ON account_termination_logs FOR DELETE TO public USING (true);
