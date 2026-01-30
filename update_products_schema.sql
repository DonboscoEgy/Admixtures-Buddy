-- Migration: Add fields to products_master
-- Adding 'product_family' and 'cogs'

ALTER TABLE public.products_master 
ADD COLUMN IF NOT EXISTS product_family TEXT DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS cogs NUMERIC DEFAULT 0;

-- Optional: Update existing records if needed (example)
-- UPDATE public.products_master SET product_family = 'Other' WHERE product_family IS NULL;

COMMENT ON COLUMN public.products_master.product_family IS 'Category: SNF, PCE Readymix, PCE Precast, Normal Retarder, PCE Retarder, Special Admixtures';
COMMENT ON COLUMN public.products_master.cogs IS 'Cost of Goods Sold';
