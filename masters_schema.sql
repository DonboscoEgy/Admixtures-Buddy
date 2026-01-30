-- Master Tables for Dropdowns and Pricing Logic

-- Accounts Master
CREATE TABLE public.accounts_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products Master
CREATE TABLE public.products_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    default_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client Specific Pricing
-- Links Account NAME and Product NAME to a specific price.
-- We use Names here to match the 'orders' table structure which relies on text.
CREATE TABLE public.client_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name TEXT NOT NULL, 
    product_name TEXT NOT NULL,
    agreed_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(account_name, product_name)
);

-- RLS Policies
ALTER TABLE public.accounts_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Accounts" ON public.accounts_master FOR ALL USING (true);

ALTER TABLE public.products_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Products" ON public.products_master FOR ALL USING (true);

ALTER TABLE public.client_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Pricing" ON public.client_pricing FOR ALL USING (true);
