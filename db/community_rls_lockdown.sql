-- ============================================================================
-- OpportuMap community RLS lockdown + trigger-maintained counters
-- Tables: posts, comments, post_likes, follows
-- Migration name (for apply_migration): community_rls_lockdown
--
-- Context: OpportuMap + Migrova share Supabase project gcrngdjrrfunokqfmkip and
-- use ONLY the public anon key. RLS is the only DB-level access control, so the
-- previously fully-permissive policies (USING/CHECK true) let anyone with the
-- public anon key insert spam, edit/delete any row, and inflate counts via the
-- PostgREST REST API directly. This locks writes to the owning user.
--
-- SEQUENCING: apply this ONLY AFTER commit ecd8a90 (route writes moved to the
-- authenticated cookie client) is live on opportumap.netlify.app. Applying it
-- while the old anon-client-write code is live would break all community writes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Counter maintenance via triggers (SECURITY DEFINER).
--    posts.like_count / comment_count are bumped by likers/commenters who are
--    NOT the post owner. With an owner-only posts UPDATE policy, those users
--    cannot UPDATE posts directly. A SECURITY DEFINER *RPC* would be callable
--    straight from the anon key (PostgREST exposes functions; PUBLIC has EXECUTE
--    by default) and would re-open arbitrary count inflation -- the exact bug we
--    are closing. Triggers have NO PostgREST call surface (functions returning
--    `trigger` are not exposed as RPC) and only fire in response to an
--    already-RLS-authorized row mutation, so the count change is always bound to
--    a real like/comment. This is the correct mechanism.
-- ----------------------------------------------------------------------------

create or replace function public.opmap_sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts
      set like_count = coalesce(like_count, 0) + 1
      where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts
      set like_count = greatest(coalesce(like_count, 0) - 1, 0)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.opmap_sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts
      set comment_count = coalesce(comment_count, 0) + 1
      where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts
      set comment_count = greatest(coalesce(comment_count, 0) - 1, 0)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

-- Defense in depth: these are trigger functions (no RPC surface), but revoke
-- direct EXECUTE anyway. Triggers still fire regardless of these grants.
revoke execute on function public.opmap_sync_post_like_count() from public, anon, authenticated;
revoke execute on function public.opmap_sync_post_comment_count() from public, anon, authenticated;

drop trigger if exists trg_opmap_sync_post_like_count on public.post_likes;
create trigger trg_opmap_sync_post_like_count
  after insert or delete on public.post_likes
  for each row execute function public.opmap_sync_post_like_count();

drop trigger if exists trg_opmap_sync_post_comment_count on public.comments;
create trigger trg_opmap_sync_post_comment_count
  after insert or delete on public.comments
  for each row execute function public.opmap_sync_post_comment_count();

-- ----------------------------------------------------------------------------
-- 2. Reconcile counts to actual row counts. Self-heals any prior drift AND the
--    brief deploy->migration window where the routes stopped bumping counts but
--    triggers did not yet exist. (Updating posts does not fire the like/comment
--    triggers, so there is no double-count.)
-- ----------------------------------------------------------------------------

update public.posts p set
  like_count    = coalesce((select count(*) from public.post_likes l where l.post_id = p.id), 0),
  comment_count = coalesce((select count(*) from public.comments  c where c.post_id = p.id), 0);

-- ----------------------------------------------------------------------------
-- 3. RLS lockdown. Drop every existing policy (names unknown / permissive) on
--    each table, then recreate scoped policies. Reads stay public; writes are
--    restricted to the owning authenticated user.
-- ----------------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('posts', 'comments', 'post_likes', 'follows')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.posts      enable row level security;
alter table public.comments   enable row level security;
alter table public.post_likes enable row level security;
alter table public.follows    enable row level security;

-- posts: public read; insert/update/delete only by the owner.
create policy "posts_select_public" on public.posts
  for select using (true);
create policy "posts_insert_own" on public.posts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "posts_update_own" on public.posts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "posts_delete_own" on public.posts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- comments: public read; insert by owner; delete by owner.
create policy "comments_select_public" on public.comments
  for select using (true);
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "comments_delete_own" on public.comments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- post_likes: public read; a user may add/remove only their own like.
create policy "post_likes_select_public" on public.post_likes
  for select using (true);
create policy "post_likes_insert_own" on public.post_likes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "post_likes_delete_own" on public.post_likes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- follows: public read; a user may add/remove only their own follow edge.
create policy "follows_select_public" on public.follows
  for select using (true);
create policy "follows_insert_own" on public.follows
  for insert to authenticated
  with check ((select auth.uid()) = follower_id);
create policy "follows_delete_own" on public.follows
  for delete to authenticated
  using ((select auth.uid()) = follower_id);
