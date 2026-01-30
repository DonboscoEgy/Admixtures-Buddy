-- 1. Add columns to link orders to users
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sales_rep TEXT;

-- 2. Link ALL current orders to Mohamed Hassan (MH)
-- Using the ID we saw in debug: fe254dca-f870-4d58-ae52-23b42b5cc82c
UPDATE public.orders
SET 
    user_id = 'fe254dca-f870-4d58-ae52-23b42b5cc82c',
    sales_rep = 'MH'
WHERE user_id IS NULL;

-- 3. Update the View to include these new columns
DROP VIEW IF EXISTS public.view_sales_ledger;

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
    user_id,    -- NEW
    sales_rep,  -- NEW
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

-- 4. Secure the Orders Table (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Remove old open policies
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.orders;

-- New Strict Policies

-- VIEW: Admins see ALL, Users see OWN
CREATE POLICY "View Orders Policy" ON public.orders
FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    public.is_admin() = true
);

-- INSERT: Authenticated users can create orders (auto-assigns ID via trigger usually, or checked here)
CREATE POLICY "Create Orders Policy" ON public.orders
FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- UPDATE: Admins can update ANY, Users can update OWN
CREATE POLICY "Update Orders Policy" ON public.orders
FOR UPDATE USING (
    auth.uid() = user_id 
    OR 
    public.is_admin() = true
);

-- DELETE: Admins only? Or users own? Let's say Admins + Owners for now
CREATE POLICY "Delete Orders Policy" ON public.orders
FOR DELETE USING (
    auth.uid() = user_id 
    OR 
    public.is_admin() = true
);
