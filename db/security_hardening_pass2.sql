-- Migration: security_hardening_pass2 (applied via MCP apply_migration)
-- Second hardening pass over the shared Supabase project, beyond the community
-- table lockdown. All changes are backward-compatible with the live routes.

-- rls_auto_enable is a defensive DDL event trigger (auto-enables RLS on new
-- public tables), not an RPC. No API role needs EXECUTE on it.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

-- site_pings: replace the fully-permissive ALL(true/true) policy. The anonymous
-- ping upsert (app/api/ping/route.js) needs INSERT + UPDATE only. Drop DELETE
-- (no wiping analytics) and SELECT (no enumerating visitor sessions/pages). Admin
-- reads go through get_admin_stats (SECURITY DEFINER, bypasses RLS). Predicate is
-- session_id IS NOT NULL so it is a real constraint, not a rubber-stamp `true`.
drop policy if exists "Public ping" on public.site_pings;
create policy "site_pings_insert" on public.site_pings
  for insert to anon, authenticated
  with check (session_id is not null);
create policy "site_pings_update" on public.site_pings
  for update to anon, authenticated
  using (session_id is not null)
  with check (session_id is not null);

-- pitch-decks storage: the broad "to public" SELECT let anyone (anon) LIST every
-- file in the bucket. Restrict SELECT to authenticated (still required for the
-- upsert upload path); the bucket is public, so object downloads by URL are
-- unaffected. Also modernize the upload policy off the deprecated auth.role().
drop policy if exists "Anyone can read pitch decks" on storage.objects;
create policy "Authenticated can read pitch decks" on storage.objects
  for select to authenticated
  using (bucket_id = 'pitch-decks');
drop policy if exists "Auth users can upload pitch decks" on storage.objects;
create policy "Auth users can upload pitch decks" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pitch-decks');
