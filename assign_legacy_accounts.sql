-- Bulk Update: Assign all unowned ACCOUNTS to 'MH'
-- Use this to set the default owner for your legacy data.

UPDATE public.accounts_master
SET created_by_initials = 'MH'
WHERE created_by_initials IS NULL 
   OR created_by_initials = '';

-- Optional: Verify the result
-- SELECT name, created_by_initials FROM public.accounts_master;
