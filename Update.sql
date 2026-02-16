
-- Script Pembaruan Tabel account_career_logs
-- Jalankan script ini di SQL Editor Supabase Anda

ALTER TABLE account_career_logs 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;

-- Penambahan Tabel Kontrak Kerja (HUREMA Contract Module)
CREATE TABLE IF NOT EXISTS account_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    contract_number TEXT,
    contract_type TEXT, -- PKWT 1, PKWT 2, PKWTT, Magang, dll
    start_date DATE,
    end_date DATE,
    file_id TEXT, -- ID Google Drive untuk PDF
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS untuk account_contracts
ALTER TABLE account_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read contracts" ON account_contracts;
CREATE POLICY "Allow public read contracts" ON account_contracts FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow public insert contracts" ON account_contracts;
CREATE POLICY "Allow public insert contracts" ON account_contracts FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update contracts" ON account_contracts;
CREATE POLICY "Allow public update contracts" ON account_contracts FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "Allow public delete contracts" ON account_contracts;
CREATE POLICY "Allow public delete contracts" ON account_contracts FOR DELETE TO public USING (true);

-- Trigger untuk updated_at pada account_contracts
DROP TRIGGER IF EXISTS set_updated_at_contracts ON account_contracts;
CREATE TRIGGER set_updated_at_contracts
BEFORE UPDATE ON account_contracts
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
