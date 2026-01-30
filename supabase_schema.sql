-- Create the Orders Table matching the Excel file
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    transaction_date DATE NOT NULL,
    account_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    unit_cogs NUMERIC NOT NULL DEFAULT 0, -- Cost of Goods Sold per unit
    credit_days INTEGER DEFAULT 90,
    notes TEXT,
    is_paid BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON public.orders FOR UPDATE USING (true);


-- Create a View for Calculations (Sales Ledger)
-- matches the fields used in ReportView.jsx
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
    -- Calculated Fields
    (quantity * unit_price) AS total_sales, 
    ((quantity * unit_price) * 0.15) AS vat_amount,
    ((quantity * unit_price) * 1.15) AS total_with_vat,
    ((quantity * unit_price) - (quantity * unit_cogs)) AS gross_profit,
    CASE 
        WHEN (quantity * unit_price) > 0 THEN 
            ((((quantity * unit_price) - (quantity * unit_cogs)) / (quantity * unit_price)) * 100)
        ELSE 0 
    END AS margin_percentage
FROM public.orders;
