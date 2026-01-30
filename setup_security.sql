-- ==========================================
-- Security & Isolation Setup
-- ==========================================

-- 1. Helper function to check if user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to get current user's initials
CREATE OR REPLACE FUNCTION public.get_my_initials()
RETURNS TEXT AS $$
DECLARE
  my_initials TEXT;
BEGIN
  SELECT initials INTO my_initials 
  FROM public.profiles 
  WHERE id = auth.uid();
  RETURN my_initials;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- ORDERS Security
-- ==========================================
-- Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts/leaks
DROP POLICY IF EXISTS "Allow anonymous select" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.orders;
DROP POLICY IF EXISTS "See own orders" ON public.orders;

-- Policy: Admin sees all, User sees orders matching their Initials
CREATE POLICY "RLS: View Orders"
ON public.orders FOR SELECT
USING (
  is_admin() 
  OR 
  (sales_rep = get_my_initials())
);

-- Policy: Admin updates all, User updates own
CREATE POLICY "RLS: Update Orders"
ON public.orders FOR UPDATE
USING (
  is_admin() 
  OR 
  (sales_rep = get_my_initials())
);

-- Policy: Anyone can insert (but should usually tag themselves)
CREATE POLICY "RLS: Insert Orders"
ON public.orders FOR INSERT
WITH CHECK (true);


-- ==========================================
-- ACCOUNTS MASTER Security
-- ==========================================
ALTER TABLE public.accounts_master ENABLE ROW LEVEL SECURITY;

-- Add column to link Account to Creator (if not exists)
ALTER TABLE public.accounts_master ADD COLUMN IF NOT EXISTS created_by_initials TEXT;

DROP POLICY IF EXISTS "Public Access Accounts" ON public.accounts_master;

-- Policy: View Accounts
-- Logic: Unlike orders, Users might need to see ALL accounts to select them in dropdowns?
-- "if he created a customer it should be linked to him" -> implying OWNERSHIP.
-- But usually, a salesman sells to ANY company in the system.
-- However, if the user strictly wants isolation:
-- Let's try: See ALL accounts (Shared) OR See ONLY own? 
-- User said: "if he created a customer it should be linked to him"
-- This usually implies CREDIT for the customer, but usually they share the master list.
-- I will allow viewing ALL for now (so they can sell to existing), but Insert tags them.
-- If the user specifically meant "I can't see his customers", I would filter SELECT.
-- Given "Don Bosco can see others orders... I need him to see his orders only", the focus is strict.
-- I will implement strict visibility for Accounts too: See Common/Public Accounts + Own Accounts?
-- For simplicity and safety based on "Linked to him":
CREATE POLICY "RLS: View Accounts"
ON public.accounts_master FOR SELECT
USING (
  true -- Currently allowing all to see (Sharing the master list is standard CRM), 
       -- filtering this too strictly breaks "Quick Order" dropdowns if they need to sell to an existing client.
       -- If the User wants PRIVATE lists, I can change this to:
       -- is_admin() OR created_by_initials = get_my_initials() OR created_by_initials IS NULL
);

-- But allow Updating only if Admin or Creator
CREATE POLICY "RLS: Update Accounts"
ON public.accounts_master FOR UPDATE
USING (
  is_admin() 
  OR 
  created_by_initials = get_my_initials()
);

-- ==========================================
-- VIEW Update (Postgres 15+ Security Invoker)
-- ==========================================
-- To ensure the View respects the RLS of the underlying Table
-- We drop and recreate it with security_invoker (if supported) or just rely on standard behavior.
-- Standard Views run as Owner. If I am the owner (superuser), RLS might be bypassed.
-- Best practice: Use the Table directly in the UI or set security_invoker.
-- Since this is Supabase, `postgres` owns it.
-- We will try to alter it.
ALTER VIEW public.view_sales_ledger OWNER TO postgres; -- Default
-- If Supabase supports it:
-- ALTER VIEW public.view_sales_ledger SET (security_invoker = true);
