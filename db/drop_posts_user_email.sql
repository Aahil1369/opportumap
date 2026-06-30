-- Migration: drop_posts_user_email (applied via MCP apply_migration)
--
-- posts.user_email was a denormalized copy of the author's email, returned by
-- the public posts API and readable by anyone with the public anon key via the
-- Data API: GET /rest/v1/posts?select=user_email scraped every user's email.
--
-- RLS is row-level and cannot hide a single column, so the fix is to remove the
-- column entirely. The email of record still lives in auth.users; the only app
-- consumer was the community "verified" badge, which now matches on user_id
-- (a public UUID) instead of email. App code stopped reading/writing this column
-- in commit 2448168, which was deployed and confirmed live on all CDN nodes
-- BEFORE this drop (old code still inserted user_email, so dropping under it
-- would have broken posting).

alter table public.posts drop column if exists user_email;
