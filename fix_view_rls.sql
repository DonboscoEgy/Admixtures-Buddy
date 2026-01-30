-- CRITICAL FIX: Make View respect RLS
-- By default, Views run as the System (ignoring your new policies)
-- This command forces the View to check WHO is looking at it.

ALTER VIEW public.view_sales_ledger SET (security_invoker = true);
