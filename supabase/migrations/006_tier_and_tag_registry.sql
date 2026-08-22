-- ============================================================================
-- Tier and tag registries.
--
-- Until now a "tier" was whatever text someone typed into a price row, and a
-- "card tag" was whatever they typed into a comma-separated box. Renaming
-- Super Saver to Budget meant editing every price row of every package by
-- hand, and a typo silently invented a new tier.
--
-- This migration introduces two registries and re-keys the existing data to
-- point at them by STABLE KEY rather than by display name, so a rename is a
-- single UPDATE that can never corrupt a price.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Shared helper: turn 'Super Saver' into 'super-saver'.
-- ---------------------------------------------------------------------------
create or replace function public.taxonomy_slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Tiers
-- ---------------------------------------------------------------------------
create table if not exists public.package_tiers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Card tags. `color` is a swatch name resolved to classes in the app, never
-- raw CSS — that keeps the palette on-brand and un-breakable from the admin.
-- ---------------------------------------------------------------------------
create table if not exists public.package_tags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  color text not null default 'gold',
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_taxonomy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists package_tiers_updated_at on public.package_tiers;
create trigger package_tiers_updated_at
before update on public.package_tiers
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists package_tags_updated_at on public.package_tags;
create trigger package_tags_updated_at
before update on public.package_tags
for each row execute function public.set_taxonomy_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: anyone may read (the public site renders these), only signed-in admins
-- may write. Mirrors the policy shape already used on public.packages.
-- ---------------------------------------------------------------------------
alter table public.package_tiers enable row level security;
alter table public.package_tags enable row level security;

drop policy if exists "Tiers are public" on public.package_tiers;
create policy "Tiers are public"
on public.package_tiers for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users manage tiers" on public.package_tiers;
create policy "Authenticated users manage tiers"
on public.package_tiers for all
to authenticated
using (true)
with check (true);

drop policy if exists "Tags are public" on public.package_tags;
create policy "Tags are public"
on public.package_tags for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users manage tags" on public.package_tags;
create policy "Authenticated users manage tags"
on public.package_tags for all
to authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- Seed tiers from whatever is already sitting in packages.prices.
-- Ordered so the familiar ladder (Super Saver -> Platinum) survives.
-- ---------------------------------------------------------------------------
insert into public.package_tiers (key, name, sort_order)
select
  public.taxonomy_slugify(tier_name) as key,
  tier_name as name,
  case lower(tier_name)
    when 'super saver' then 10
    when 'budget' then 10
    when 'bronze' then 20
    when 'silver' then 30
    when 'gold' then 40
    when 'platinum' then 50
    else 100
  end as sort_order
from (
  select distinct e.key as tier_name
  from public.packages p, jsonb_each(p.prices) as e
  where public.taxonomy_slugify(e.key) <> ''
) as discovered
on conflict (key) do nothing;

-- A default ladder, in case the packages table is empty on a fresh database.
insert into public.package_tiers (key, name, sort_order)
values
  ('super-saver', 'Super Saver', 10),
  ('bronze', 'Bronze', 20),
  ('silver', 'Silver', 30),
  ('gold', 'Gold', 40),
  ('platinum', 'Platinum', 50)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed tags from whatever is already in packages.card_tags.
-- ---------------------------------------------------------------------------
insert into public.package_tags (key, label, color, sort_order)
select
  public.taxonomy_slugify(tag_label) as key,
  tag_label as label,
  case lower(tag_label)
    when 'hot' then 'red'
    when 'best seller' then 'green'
    when 'popular' then 'green'
    when 'new' then 'blue'
    when 'featured' then 'purple'
    when 'budget' then 'teal'
    when 'super saver' then 'teal'
    else 'gold'
  end as color,
  100 as sort_order
from (
  select distinct unnest(p.card_tags) as tag_label
  from public.packages p
) as discovered
where public.taxonomy_slugify(tag_label) <> ''
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Re-key packages.prices from display name to stable tier key.
--
-- The join matches on EITHER name or key, so running this a second time is a
-- no-op rather than a data loss.
-- ---------------------------------------------------------------------------
update public.packages p
set prices = coalesce(remapped.prices, '{}'::jsonb)
from (
  select
    inner_p.id,
    jsonb_object_agg(t.key, e.value) as prices
  from public.packages inner_p
  cross join lateral jsonb_each(inner_p.prices) as e(key, value)
  join public.package_tiers t
    on t.key = e.key or t.name = e.key
  group by inner_p.id
) as remapped
where remapped.id = p.id
  and p.prices <> coalesce(remapped.prices, '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- Re-key packages.card_tags from label to stable tag key. Same idempotency
-- trick, and unknown tags are dropped rather than left dangling.
-- ---------------------------------------------------------------------------
update public.packages p
set card_tags = coalesce(remapped.tags, '{}')
from (
  select
    inner_p.id,
    array_agg(distinct g.key) as tags
  from public.packages inner_p
  cross join lateral unnest(inner_p.card_tags) as raw(label)
  join public.package_tags g
    on g.key = raw.label or g.label = raw.label
  group by inner_p.id
) as remapped
where remapped.id = p.id
  and p.card_tags <> coalesce(remapped.tags, '{}');
