-- ============================================================================
-- Category-specific package details.
--
-- Hajj and Ramzan packages carry information an Umrah land package has no use
-- for — Mina tent category, Maktab number, which nights of Laylatul Qadr are
-- covered. Rather than adding a column per field (and a migration every time
-- the business learns something new), they live in one jsonb bag whose shape
-- is declared in code at src/lib/categoryFields.ts.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.packages
add column if not exists details jsonb not null default '{}'::jsonb;

comment on column public.packages.details is
  'Category-specific fields. Shape is defined per category in src/lib/categoryFields.ts, not by this schema.';
