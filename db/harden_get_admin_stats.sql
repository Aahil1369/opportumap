-- Migration: harden_get_admin_stats (applied via MCP apply_migration)
--
-- get_admin_stats() is a SECURITY DEFINER function returning aggregate counts
-- (total users, total visits, live users). Previously it had a mutable search_path
-- and was EXECUTE-able by anon/authenticated, so anyone with the public anon key
-- could call /rest/v1/rpc/get_admin_stats and read the counts.
--
-- Fix: pin search_path='' (+ schema-qualify), add an admin-email guard (SECURITY
-- DEFINER still sees the caller's JWT via auth.jwt()), and revoke EXECUTE from anon.
-- The admin route (app/api/admin/stats/route.js) was changed FIRST to call this via
-- the authenticated (admin) client instead of the anon client, and deployed before
-- this migration was applied.

create or replace function public.get_admin_stats()
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() ->> 'email'), '') <> 'aahilakbar567@gmail.com' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return json_build_object(
    'total_users', (select count(*) from public.user_profiles),
    'total_visits', (select count(*) from public.site_pings),
    'live_users',  (select count(distinct session_id) from public.site_pings
                    where last_seen > now() - interval '5 minutes')
  );
end;
$$;

revoke execute on function public.get_admin_stats() from anon, public;
grant  execute on function public.get_admin_stats() to authenticated;
