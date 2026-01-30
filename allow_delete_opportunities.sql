-- Enable DELETE for authenticated users on opportunities table
create policy "Allow delete for all authenticated users"
on opportunities for delete
to authenticated
using (true);

-- Also ensure INSERT/UPDATE are correct just in case
create policy "Allow insert for all authenticated users"
on opportunities for insert
to authenticated
with check (true);

create policy "Allow update for all authenticated users"
on opportunities for update
to authenticated
using (true);
