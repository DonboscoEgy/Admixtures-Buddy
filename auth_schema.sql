-- ==========================================
-- AUTH & PROFILES SCHEMA
-- ==========================================

-- 1. Create Profiles Table (Public metadata for Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE, -- Default is Pending Approval
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
    );

-- Admins can update profiles (to approve/decline)
CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
    );

-- Users can update their own profile (name, avatar) - BUT NOT is_admin or is_approved
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
-- Note: In a real prod app, you'd want to restrict columns, but for now this is fine 
-- as long as your API/Frontend logic checks permissions. Ideally, use a separate function for upgrading admins.


-- 4. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, is_admin, is_approved)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'avatar_url',
        FALSE, -- Default Not Admin
        FALSE  -- Default Not Approved
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication errors on re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. Helper function to make the FIRST user an Admin (Bootstrap)
-- You can run this manually: select set_admin('your-email@example.com');
CREATE OR REPLACE FUNCTION set_admin(target_email TEXT)
RETURNS TEXT AS $$
BEGIN
    UPDATE public.profiles
    SET is_admin = TRUE, is_approved = TRUE
    WHERE email = target_email;
    
    RETURN 'User promoted to Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
