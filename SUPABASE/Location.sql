
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    zip_code TEXT,
    description TEXT,
    image_google_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create Public Read Policy
CREATE POLICY "Allow public read access" 
ON locations FOR SELECT 
TO public 
USING (true);

-- Create Public Insert Policy
CREATE POLICY "Allow public insert" 
ON locations FOR INSERT 
TO public 
WITH CHECK (true);

-- Create Public Update Policy
CREATE POLICY "Allow public update" 
ON locations FOR UPDATE 
TO public 
USING (true);

-- Create Public Delete Policy
CREATE POLICY "Allow public delete" 
ON locations FOR DELETE 
TO public 
USING (true);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
