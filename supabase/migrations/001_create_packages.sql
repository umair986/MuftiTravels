create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  name text not null,
  description text not null default '',
  image_url text not null default '',
  duration_days integer not null default 1,
  duration_nights integer not null default 0,
  destinations text not null default '',
  features text[] not null default '{}',
  prices jsonb not null default '{}'::jsonb,
  starting_price numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  reviews integer not null default 0,
  rating integer not null default 5 check (rating between 1 and 5),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_packages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists packages_updated_at on public.packages;
create trigger packages_updated_at
before update on public.packages
for each row execute function public.set_packages_updated_at();

alter table public.packages enable row level security;

drop policy if exists "Published packages are public" on public.packages;
create policy "Published packages are public"
on public.packages for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Authenticated users manage packages" on public.packages;
create policy "Authenticated users manage packages"
on public.packages for all
to authenticated
using (true)
with check (true);

insert into public.packages (
  slug,
  category,
  name,
  description,
  image_url,
  duration_days,
  duration_nights,
  destinations,
  features,
  prices,
  starting_price,
  currency,
  reviews,
  rating,
  is_published,
  sort_order
)
values (
  '14-days-umrah-land-package',
  'Umrah Land Package',
  '14 Days Umrah Land Package',
  'A comfortable Umrah land package with Makkah and Madinah hotel stays, ground transport and visa assistance.',
  '/packages/package1.webp',
  14,
  13,
  'Makkah and Madinah',
  array['Makkah and Madinah Stay', 'Ground Transport', 'Visa Assistance', '24/7 Assistance'],
  '{"Silver":{"Quint":60786,"Quad":64786,"Triple":69786,"Double":74786,"Child(6-11)":54786,"Child(2-5)":39786,"Infant(0-2)":20000},"Gold":{"Quint":70786,"Quad":74786,"Triple":79786,"Double":84786,"Child(6-11)":64786,"Child(2-5)":49786,"Infant(0-2)":20000}}'::jsonb,
  60786,
  'INR',
  35,
  5,
  true,
  1
)
on conflict (slug) do nothing;
