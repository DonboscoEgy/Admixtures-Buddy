
-- SECURE RLS POLICIES (Run this in Supabase SQL Editor)

-- 1. Disable Anonymous Access
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous delete" ON public.orders;

-- 2. Enable Authenticated Access Only
CREATE POLICY "Enable read access for authenticated users" 
ON public.orders FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.orders FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON public.orders FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
ON public.orders FOR DELETE 
TO authenticated 
USING (true);

-- 3. Profiles Security (If not already set)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);
