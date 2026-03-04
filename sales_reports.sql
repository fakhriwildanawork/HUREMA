-- Create sales_reports table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.sales_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    file_ids TEXT[] DEFAULT '{}',
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

-- Policies for sales_reports
-- Admin can do everything
CREATE POLICY "Admin full access on sales_reports" 
ON public.sales_reports 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.accounts 
        WHERE id = (SELECT current_setting('app.current_account_id')::UUID)
        AND (access_code LIKE 'SP%' OR access_code LIKE '%ADM%')
    )
);

-- Users can view their own reports
CREATE POLICY "Users can view own sales_reports" 
ON public.sales_reports 
FOR SELECT 
USING (account_id = (SELECT current_setting('app.current_account_id')::UUID));

-- Users can insert their own reports
CREATE POLICY "Users can insert own sales_reports" 
ON public.sales_reports 
FOR INSERT 
WITH CHECK (account_id = (SELECT current_setting('app.current_account_id')::UUID));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_reports_account_id ON public.sales_reports(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_reports_reported_at ON public.sales_reports(reported_at);
