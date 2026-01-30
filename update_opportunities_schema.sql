-- Drop table to ensure clean state with correct columns
drop table if exists public.opportunities cascade;

-- Re-create Opportunities Table with Liters columns
create table public.opportunities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  account_name text not null,
  location text,
  category text, 
  monthly_production_m3 numeric,
  monthly_consumption_liters numeric, -- Renamed from kg
  expected_volume_liters numeric,     -- Renamed from kg
  stage text not null default 'Prospect',
  closing_date date,
  sales_rep text
);

-- Enable Security
alter table public.opportunities enable row level security;

-- Policies (Re-apply since table was dropped)
create policy "Enable read access for all authenticated users"
on public.opportunities for select to authenticated using (true);

create policy "Enable insert for authenticated users"
on public.opportunities for insert to authenticated with check (true);

create policy "Enable update for authenticated users"
on public.opportunities for update to authenticated using (true);

create policy "Enable delete for authenticated users"
on public.opportunities for delete to authenticated using (true);
