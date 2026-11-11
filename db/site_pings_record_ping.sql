-- The visit ping as one function. Since security hardening pass 2 (db/security_hardening_pass2.sql)
-- the anonymous role may INSERT and UPDATE site_pings but not SELECT it, and Postgres refuses
-- INSERT ... ON CONFLICT DO UPDATE (what /api/ping sent) without a SELECT policy: every ping
-- failed with 42501 from 2026-07-01. This function does the upsert as its owner, so no SELECT
-- policy has to come back. Apply once in the Supabase SQL editor. Safe to re-run.
create or replace function public.record_ping(p_session_id text, p_page text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- only a browser's crypto.randomUUID()
  if p_session_id is null
     or p_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return;
  end if;
  insert into public.site_pings (session_id, last_seen, page)
  values (p_session_id, now(), left(coalesce(nullif(p_page, ''), '/'), 200))
  on conflict (session_id) do update
    set last_seen = excluded.last_seen, page = excluded.page;
end;
$$;

revoke all on function public.record_ping(text, text) from public;
grant execute on function public.record_ping(text, text) to anon, authenticated;
