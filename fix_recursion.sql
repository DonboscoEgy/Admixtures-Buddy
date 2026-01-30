-- ==================================================
-- FIX: INFINITE RECURSION IN RLS POLICIES
-- ==================================================

-- 1. Create a secure function to check Admin status
-- SECURITY DEFINER means this runs with Superuser privileges, bypassing RLS loop
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the old broken policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- 3. Create NEW fixed policies using the function
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING ( public.is_admin() );

CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE USING ( public.is_admin() );

-- 4. Ensure Users can still insert/update their own (from previous fix)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 5. Final Safety: Promote you again just in case
UPDATE public.profiles
SET is_admin = true, is_approved = true
WHERE email = 'dbosco742@gmail.com';
