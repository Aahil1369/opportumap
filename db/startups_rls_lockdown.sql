-- OpportuMap startups + messages: owner-only writes, participant-only messages,
-- server-kept counters and display names, length limits. Idempotent.
-- APPLIED 2026-10-13 to project gcrngdjrrfunokqfmkip as migration "opportumap_startups_rls_lockdown".

-- Length / format limits
alter table public.startup_messages drop constraint if exists startup_messages_content_len;
alter table public.startup_messages add constraint startup_messages_content_len
  check (char_length(content) between 1 and 4000);
alter table public.startups drop constraint if exists startups_text_len;
alter table public.startups add constraint startups_text_len
  check (char_length(name) <= 120 and char_length(coalesce(tagline,'')) <= 200
     and char_length(coalesce(description,'')) <= 5000
     and (website is null or website = '' or website ~* '^https?://'));

-- Upvote / interest counters kept by the database
create or replace function public.opmap_sync_startup_counts() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sid uuid; d int;
begin
  if tg_op = 'INSERT' then sid := new.startup_id; d := 1; else sid := old.startup_id; d := -1; end if;
  if tg_table_name = 'startup_upvotes' then
    update public.startups set upvote_count = greatest(coalesce(upvote_count,0) + d, 0) where id = sid;
  else
    update public.startups set interest_count = greatest(coalesce(interest_count,0) + d, 0) where id = sid;
  end if;
  return null;
end $$;
revoke execute on function public.opmap_sync_startup_counts() from public, anon, authenticated;
drop trigger if exists trg_opmap_upvote_count on public.startup_upvotes;
create trigger trg_opmap_upvote_count after insert or delete on public.startup_upvotes
  for each row execute function public.opmap_sync_startup_counts();
drop trigger if exists trg_opmap_interest_count on public.startup_interests;
create trigger trg_opmap_interest_count after insert or delete on public.startup_interests
  for each row execute function public.opmap_sync_startup_counts();

-- Founder display name set by the database (never an email, never client-chosen)
create or replace function public.opmap_startup_owner_name() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  select coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data->>'name'), ''))
    into n from auth.users u where u.id = new.user_id;
  if n is null or position('@' in n) > 0 then
    n := 'Member ' || upper(left(new.user_id::text, 4));
  end if;
  new.user_name := left(n, 60);
  return new;
end $$;
revoke execute on function public.opmap_startup_owner_name() from public, anon, authenticated;
drop trigger if exists trg_opmap_startup_owner_name on public.startups;
create trigger trg_opmap_startup_owner_name before insert on public.startups
  for each row execute function public.opmap_startup_owner_name();

-- Replace every policy on the four tables
do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('startups','startup_upvotes','startup_interests','startup_messages')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;
alter table public.startups enable row level security;
alter table public.startup_upvotes enable row level security;
alter table public.startup_interests enable row level security;
alter table public.startup_messages enable row level security;

create policy startups_select on public.startups for select using (true);
create policy startups_insert_own on public.startups for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy startups_update_own on public.startups for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy startups_delete_own on public.startups for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy upvotes_select on public.startup_upvotes for select using (true);
create policy upvotes_insert_own on public.startup_upvotes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy upvotes_delete_own on public.startup_upvotes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy interests_select on public.startup_interests for select using (true);
create policy interests_insert_own on public.startup_interests for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy interests_delete_own on public.startup_interests for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy messages_select_participant on public.startup_messages for select to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));
create policy messages_insert_sender on public.startup_messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and sender_id <> receiver_id
    and exists (select 1 from public.startups s
                where s.id = startup_messages.startup_id
                  and s.user_id in (startup_messages.sender_id, startup_messages.receiver_id)));
create policy messages_update_receiver on public.startup_messages for update to authenticated
  using ((select auth.uid()) = receiver_id) with check ((select auth.uid()) = receiver_id);

-- Column-level grants: nobody sets counters, owners, or (directly) display names
revoke update on public.startup_messages from anon, authenticated;
grant update (read) on public.startup_messages to authenticated;
revoke insert, update on public.startups from anon, authenticated;
grant insert (user_id, name, tagline, description, stage, sector, raise_amount, equity_offered,
              team_size, location, website, pitch_deck_url) on public.startups to authenticated;
grant update (name, tagline, description, stage, sector, raise_amount, equity_offered,
              team_size, location, website, pitch_deck_url) on public.startups to authenticated;
revoke insert, update, delete on public.startup_upvotes, public.startup_interests from anon;
revoke insert, update, delete on public.startup_messages from anon;

-- Recount
update public.startups s
  set upvote_count = (select count(*) from public.startup_upvotes u where u.startup_id = s.id),
      interest_count = (select count(*) from public.startup_interests i where i.startup_id = s.id);
