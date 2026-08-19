create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  phone text not null default '',
  departure_city text not null default '',
  package_preference text not null default '',
  package_name text not null default '',
  adults integer not null default 1,
  children integer not null default 0,
  preferred_date date,
  notes text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.enquiries enable row level security;

drop policy if exists "Anyone can submit enquiries" on public.enquiries;
create policy "Anyone can submit enquiries"
on public.enquiries for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated users manage enquiries" on public.enquiries;
create policy "Authenticated users manage enquiries"
on public.enquiries for all
to authenticated
using (true)
with check (true);
