
-- Script Pembaruan Tabel account_certifications
-- Jalankan script ini di SQL Editor Supabase Anda

CREATE TABLE IF NOT EXISTS account_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    entry_date DATE DEFAULT NOW(), -- Tanggal Input (Editable)
    cert_type TEXT, -- Jenis Sertifikasi (Dropdown dinamis)
    cert_name TEXT, -- Nama Sertifikasi
    cert_date DATE, -- Tanggal Sertifikasi
    file_id TEXT, -- ID Google Drive untuk Lampiran
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS untuk account_certifications
ALTER TABLE account_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read certs" ON account_certifications;
CREATE POLICY "Allow public read certs" ON account_certifications FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert certs" ON account_certifications;
CREATE POLICY "Allow public insert certs" ON account_certifications FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update certs" ON account_certifications;
CREATE POLICY "Allow public update certs" ON account_certifications FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Allow public delete certs" ON account_certifications;
CREATE POLICY "Allow public delete certs" ON account_certifications FOR DELETE TO public USING (true);

-- Trigger untuk updated_at pada account_certifications
DROP TRIGGER IF EXISTS set_updated_at_certs ON account_certifications;
CREATE TRIGGER set_updated_at_certs
BEFORE UPDATE ON account_certifications
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
