-- =========================================================
-- FORCE FIX: VISIBILITY & SECURITY
-- =========================================================

-- 1. Drop the View first to ensure clean recreation
DROP VIEW IF EXISTS public.view_sales_ledger;

-- 2. Re-create View with 'security_invoker = true' AND explicit sales_rep column
-- This ensures the view runs as the USER, not the Admin.
CREATE VIEW public.view_sales_ledger WITH (security_invoker = true) AS
SELECT 
    o.id,
    o.transaction_date,
    o.account_name,
    o.product_name,
    o.quantity,
    o.unit_price,
    o.unit_cogs,
    o.credit_days,
    o.is_paid,
    o.sales_rep, -- Clearly included
    -- Calculations
    (o.quantity * o.unit_price) AS total_sales, 
    ((o.quantity * o.unit_price) * 0.15) AS vat_amount,
    ((o.quantity * o.unit_price) * 1.15) AS total_with_vat,
    ((o.quantity * o.unit_price) - (o.quantity * o.unit_cogs)) AS gross_profit,
    CASE 
        WHEN (o.quantity * o.unit_price) > 0 THEN 
            ((((o.quantity * o.unit_price) - (o.quantity * o.unit_cogs)) / (o.quantity * o.unit_price)) * 100)
        ELSE 0 
    END AS margin_percentage
FROM public.orders o;

-- 3. Reset RLS on Orders Table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop ALL potential conflicting policies
DROP POLICY IF EXISTS "RLS: View Orders" ON public.orders;
DROP POLICY IF EXISTS "RLS: Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;

-- 4. Create Strict Select Policy (Direct Subquery for Fail-Safe)
CREATE POLICY "RLS: View Orders"
ON public.orders FOR SELECT
USING (
  -- Admin Check:
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  -- Initials Check:
  sales_rep = (SELECT initials FROM public.profiles WHERE id = auth.uid())
);

-- 5. Create Update Policy
CREATE POLICY "RLS: Update Orders"
ON public.orders FOR UPDATE
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  sales_rep = (SELECT initials FROM public.profiles WHERE id = auth.uid())
);
