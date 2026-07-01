-- Migration: tighten_pitch_decks_select (applied via MCP apply_migration)
--
-- Follow-up to security_hardening_pass2. Restricting the pitch-decks SELECT policy
-- to the `authenticated` role still let any signed-in user LIST the whole bucket,
-- which the linter flags (public_bucket_allows_listing). Scope it to the object
-- owner instead. Safe because StartupModal uploads use unique timestamped filenames
-- (`${Date.now()}-...`), so the upsert never replaces an existing object and does
-- not depend on a broad SELECT; public downloads by URL are unaffected (the bucket
-- is public and serves via the /object/public/ endpoint, which bypasses RLS).
drop policy if exists "Authenticated can read pitch decks" on storage.objects;
create policy "Owners can read own pitch decks" on storage.objects
  for select to authenticated
  using (bucket_id = 'pitch-decks' and owner = (select auth.uid()));
