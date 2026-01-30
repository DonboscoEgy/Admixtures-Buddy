-- Function to safely rename an account and update all references
CREATE OR REPLACE FUNCTION rename_account_cascade(old_account_name TEXT, new_account_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- 1. Update Accounts Master
    UPDATE public.accounts_master
    SET name = new_account_name
    WHERE name = old_account_name;

    -- 2. Update Client Pricing
    UPDATE public.client_pricing
    SET account_name = new_account_name
    WHERE account_name = old_account_name;

    -- 3. Update Sales History (Orders)
    UPDATE public.orders
    SET account_name = new_account_name
    WHERE account_name = old_account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
