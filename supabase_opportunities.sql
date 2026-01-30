-- Create Opportunities Table
create table public.opportunities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  account_name text not null, -- Storing name directly for simplicity as requested, or can be FK
  location text,
  category text, -- Prospect, In-House Trial, etc.
  monthly_production_m3 numeric,
  monthly_consumption_kg numeric,
  expected_volume_kg numeric,
  stage text not null default 'Prospect',
  closing_date date,
  sales_rep text -- Initials or ID
);

-- Enable RLS
alter table public.opportunities enable row level security;

-- Policies
create policy "Enable read access for all authenticated users"
on public.opportunities for select
to authenticated
using (true);

create policy "Enable insert for authenticated users"
on public.opportunities for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users"
on public.opportunities for update
to authenticated
using (true);

create policy "Enable delete for authenticated users"
on public.opportunities for delete
to authenticated
using (true);
