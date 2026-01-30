-- Create Payments Table
CREATE TABLE public.payments_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_date DATE NOT NULL,
    account_name TEXT NOT NULL, -- Storing name to link easily with other name-based tables
    amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.payments_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Payments" ON public.payments_ledger FOR ALL USING (true);
