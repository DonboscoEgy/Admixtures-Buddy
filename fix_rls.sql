-- =========================================
-- FIX: MISSING INSERT POLICY
-- =========================================

-- We previously lacked an INSERT policy, which prevented the frontend from 
-- "healing" missing profiles. This fixes that.

-- 1. Allow users to INSERT their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Update the Admin User (Just to be sure)
UPDATE public.profiles
SET 
    is_admin = true,
    is_approved = true
WHERE email = 'dbosco742@gmail.com';

-- 3. Verify it exists now
SELECT * FROM public.profiles WHERE email = 'dbosco742@gmail.com';
