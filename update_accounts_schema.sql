-- Add new classification and credit columns to accounts_master

ALTER TABLE public.accounts_master
ADD COLUMN IF NOT EXISTS account_family TEXT CHECK (account_family IN ('Readymix', 'Precast', 'Contractor', 'Applicator')),
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('Credit Customer', 'Intercompany', 'Cash')),
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0;

-- Optional: Comment on columns
COMMENT ON COLUMN public.accounts_master.payment_type IS 'Credit Customer, Intercompany, or Cash';
