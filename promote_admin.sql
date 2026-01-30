-- Run this in your Supabase SQL Editor to make yourself an Admin

UPDATE public.profiles
SET 
    is_admin = true,
    is_approved = true
WHERE email = 'dbosco742@gmail.com';

-- Verify the change
SELECT * FROM public.profiles WHERE email = 'dbosco742@gmail.com';
