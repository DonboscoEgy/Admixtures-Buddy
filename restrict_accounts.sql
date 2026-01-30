-- STRICT VISIBILITY: ACCOUNTS
-- Update the RLS policy for accounts_master to be STRICT.
-- Admins see ALL. Users see ONLY their own created accounts.

ALTER TABLE public.accounts_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RLS: View Accounts" ON public.accounts_master;

CREATE POLICY "RLS: View Accounts"
ON public.accounts_master FOR SELECT
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  created_by_initials = (SELECT initials FROM public.profiles WHERE id = auth.uid())
);
