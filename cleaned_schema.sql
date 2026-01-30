-- ==========================================
-- 1. CLEANUP (Prevent errors on repeated runs)
-- ==========================================
DROP VIEW IF EXISTS public.view_sales_ledger;
-- We do not drop tables automatically to prevent data loss.
-- If you need to reset, you must DROP TABLE manually.

-- ==========================================
-- 2. TABLE DEFINITIONS
-- ==========================================

-- 2.1 Orders (Main Transaction Table)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    transaction_date DATE NOT NULL,
    account_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    unit_cogs NUMERIC NOT NULL DEFAULT 0,
    credit_days INTEGER DEFAULT 90,
    notes TEXT,
    is_paid BOOLEAN DEFAULT FALSE
);

-- Performance Indices for Orders (Crucial for filtering/reporting)
CREATE INDEX IF NOT EXISTS idx_orders_transaction_date ON public.orders(transaction_date);
CREATE INDEX IF NOT EXISTS idx_orders_account_name ON public.orders(account_name);
CREATE INDEX IF NOT EXISTS idx_orders_product_name ON public.orders(product_name);

-- 2.2 Accounts Master
CREATE TABLE IF NOT EXISTS public.accounts_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Products Master
CREATE TABLE IF NOT EXISTS public.products_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    default_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 Client Specific Pricing
-- Links Account NAME and Product NAME to a specific price.
CREATE TABLE IF NOT EXISTS public.client_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name TEXT NOT NULL, 
    product_name TEXT NOT NULL,
    agreed_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(account_name, product_name)
);

-- Index for fast pricing lookup
CREATE INDEX IF NOT EXISTS idx_client_pricing_lookup ON public.client_pricing(account_name, product_name);


-- ==========================================
-- 3. SECURITY (Row Level Security)
-- ==========================================

-- 3.1 Orders Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (Simplifies testing) - WARN: Secure this before Production!
DROP POLICY IF EXISTS "Allow anonymous ALL" ON public.orders;
CREATE POLICY "Allow anonymous ALL" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 3.2 Master Tables Policies
ALTER TABLE public.accounts_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Accounts" ON public.accounts_master;
CREATE POLICY "Public Access Accounts" ON public.accounts_master FOR ALL USING (true);

ALTER TABLE public.products_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Products" ON public.products_master;
CREATE POLICY "Public Access Products" ON public.products_master FOR ALL USING (true);

ALTER TABLE public.client_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Pricing" ON public.client_pricing;
CREATE POLICY "Public Access Pricing" ON public.client_pricing FOR ALL USING (true);


-- ==========================================
-- 4. VIEWS (Reporting)
-- ==========================================

CREATE OR REPLACE VIEW public.view_sales_ledger AS
SELECT 
    id,
    transaction_date,
    account_name,
    product_name,
    quantity,
    unit_price,
    unit_cogs,
    credit_days,
    is_paid,
    -- Calculated Financials
    (quantity * unit_price) AS total_sales, 
    ((quantity * unit_price) * 0.15) AS vat_amount,
    ((quantity * unit_price) * 1.15) AS total_with_vat,
    ((quantity * unit_price) - (quantity * unit_cogs)) AS gross_profit,
    -- Margin Percentage (Protects against division by zero)
    CASE 
        WHEN (quantity * unit_price) > 0 THEN 
            ((((quantity * unit_price) - (quantity * unit_cogs)) / (quantity * unit_price)) * 100)
        ELSE 0 
    END AS margin_percentage
FROM public.orders;
