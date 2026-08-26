-- ============================================================================
-- Security hardening, following the 26 August 2026 audit.
--
-- The audit report is kept outside this repository, which is public.
--
-- Three changes:
--   1. package-images accepted any file of any size
--   2. anonymous submitters could set their own created_at
--   3. the per-source enquiry throttle rests on an assumption that does not
--      hold, so add a backstop that does not depend on caller identity
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. package-images: the limits 014 gave gallery-images.
--
-- 002 created this bucket public with no file_size_limit and no
-- allowed_mime_types, and the browser only ever set an `accept` attribute —
-- which is a file-picker hint, not a control. Anything could be stored, at any
-- size, and served back publicly with an uploader-chosen content type.
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'package-images';

-- ---------------------------------------------------------------------------
-- 2 & 3. Enquiry insert controls.
--
-- The anon insert policy checks only `status` and `admin_notes`, leaving every
-- other column free — including created_at. Both admin lists order by
-- created_at desc, so a backdated row lands at the bottom of a paginated list
-- where nobody looks. The trigger already rewrites source_hash, so it is the
-- natural place to stamp the timestamp server-side too.
--
-- On the backstop: the per-source throttle identifies a caller from request
-- headers, which are not authenticated, so it cannot be relied on as the only
-- control. A total-volume ceiling holds regardless, because it counts rows
-- rather than callers.
--
-- The trade-off is real and deliberate: at the ceiling, genuine submissions are
-- refused too. It is set far above normal volume (this site sees single digits
-- per week), so hitting it means something is wrong and a hard stop is better
-- than an inbox buried in noise. The durable fix is to move this insert behind
-- a server route that knows the real client address and holds a service-role
-- key, at which point anon insert here can be revoked entirely.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_enquiry_limits()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  hash text;
  recent_count integer;
  total_recent integer;
begin
  -- Honeypot: a field no human sees. Accept the row silently so a bot cannot
  -- tell it was caught, but never store it.
  if coalesce(new.honeypot, '') <> '' then
    return null;
  end if;

  -- Never trust a client-supplied timestamp; both admin views sort on this.
  new.created_at := timezone('utc', now());

  hash := public.enquiry_source_hash();
  new.source_hash := hash;

  if hash <> 'unknown' then
    select count(*) into recent_count
    from public.enquiries
    where source_hash = hash
      and created_at > timezone('utc', now()) - interval '1 hour';

    if recent_count >= 5 then
      raise exception 'Too many enquiries from this connection. Please try again later or message us on WhatsApp.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Identity-independent backstop, for the case where the per-source check
  -- above does not bind.
  select count(*) into total_recent
  from public.enquiries
  where created_at > timezone('utc', now()) - interval '1 hour';

  if total_recent >= 100 then
    raise exception 'We are receiving an unusual number of enquiries right now. Please message us on WhatsApp.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- The trigger already points at this function; recreated for a clean re-run.
drop trigger if exists enquiries_enforce_limits on public.enquiries;
create trigger enquiries_enforce_limits
before insert on public.enquiries
for each row execute function public.enforce_enquiry_limits();

-- Supports the backstop's count, which has no source_hash predicate and so
-- cannot use enquiries_source_hash_created_idx.
create index if not exists enquiries_created_at_idx
on public.enquiries (created_at desc);
