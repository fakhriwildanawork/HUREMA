
-- Create Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identitas
    full_name TEXT NOT NULL,
    nik_ktp TEXT NOT NULL,
    photo_google_id TEXT,
    ktp_google_id TEXT,
    gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan')),
    religion TEXT,
    dob DATE,

    -- Kontak & Sosial
    address TEXT,
    phone TEXT,
    email TEXT,
    marital_status TEXT,
    dependents_count INTEGER DEFAULT 0,
    emergency_contact_name TEXT,
    emergency_contact_rel TEXT,
    emergency_contact_phone TEXT,

    -- Pendidikan
    last_education TEXT,
    major TEXT,
    diploma_google_id TEXT,

    -- Karier & Penempatan
    internal_nik TEXT,
    position TEXT,
    grade TEXT,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    employee_type TEXT CHECK (employee_type IN ('Tetap', 'Kontrak', 'Harian', 'Magang')),
    start_date DATE,
    end_date DATE,

    -- Pengaturan Kerja & Presensi
    schedule_type TEXT,
    leave_quota INTEGER DEFAULT 0,
    is_presence_limited_checkin BOOLEAN DEFAULT TRUE,
    is_presence_limited_checkout BOOLEAN DEFAULT TRUE,
    is_presence_limited_ot_in BOOLEAN DEFAULT TRUE,
    is_presence_limited_ot_out BOOLEAN DEFAULT TRUE,

    -- Keamanan & Medis
    access_code TEXT,
    password TEXT,
    mcu_status TEXT,
    health_risk TEXT,

    search_all TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Career Logs Table
CREATE TABLE IF NOT EXISTS account_career_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    position TEXT,
    grade TEXT,
    location_name TEXT,
    change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Logs Table
CREATE TABLE IF NOT EXISTS account_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    mcu_status TEXT,
    health_risk TEXT,
    change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger Function for Career Logging
CREATE OR REPLACE FUNCTION log_account_career_changes()
RETURNS TRIGGER AS $$
DECLARE
    loc_name TEXT;
BEGIN
    IF (TG_OP = 'INSERT') OR 
       (NEW.position IS DISTINCT FROM OLD.position) OR 
       (NEW.grade IS DISTINCT FROM OLD.grade) OR 
       (NEW.location_id IS DISTINCT FROM OLD.location_id) THEN
        
        SELECT name INTO loc_name FROM locations WHERE id = NEW.location_id;
        
        INSERT INTO account_career_logs (account_id, position, grade, location_name)
        VALUES (NEW.id, NEW.position, NEW.grade, COALESCE(loc_name, 'Unknown'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Health Logging
CREATE OR REPLACE FUNCTION log_account_health_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR 
       (NEW.mcu_status IS DISTINCT FROM OLD.mcu_status) OR 
       (NEW.health_risk IS DISTINCT FROM OLD.health_risk) THEN
        
        INSERT INTO account_health_logs (account_id, mcu_status, health_risk)
        VALUES (NEW.id, NEW.mcu_status, NEW.health_risk);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_career_changes
AFTER INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION log_account_career_changes();

CREATE TRIGGER trg_log_health_changes
AFTER INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION log_account_health_changes();

-- Search Indexing Function
CREATE OR REPLACE FUNCTION update_account_search_all()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_all := 
        COALESCE(NEW.full_name, '') || ' ' || 
        COALESCE(NEW.nik_ktp, '') || ' ' || 
        COALESCE(NEW.internal_nik, '') || ' ' || 
        COALESCE(NEW.position, '') || ' ' || 
        COALESCE(NEW.email, '') || ' ' || 
        COALESCE(NEW.phone, '') || ' ' ||
        COALESCE(NEW.major, '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_account_search_all
BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_account_search_all();

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read accounts" ON accounts FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert accounts" ON accounts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update accounts" ON accounts FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete accounts" ON accounts FOR DELETE TO public USING (true);

ALTER TABLE account_career_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read career logs" ON account_career_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert career logs" ON account_career_logs FOR INSERT TO public WITH CHECK (true);

ALTER TABLE account_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read health logs" ON account_health_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert health logs" ON account_health_logs FOR INSERT TO public WITH CHECK (true);
