-- DEBUG SCRIPT: Run this to see who you are and what you can see.
-- Usage: Run in SQL Editor. Note: In SQL Editor you are 'postgres' (Superuser).
-- To test as a specific user, you usually need to Impersonate, but we can check the table data.

-- 1. Check Profile Data for 'Don Bosco' (assuming email contains 'don' or similar, or just list all)
SELECT email, is_admin, initials, full_name, id 
FROM public.profiles;

-- 2. Check Order Counts per Sales Rep
SELECT sales_rep, count(*) 
FROM public.orders 
GROUP BY sales_rep;

-- 3. Verify Policy Existence
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'orders';
