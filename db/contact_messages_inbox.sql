-- Contact form inbox: anyone can submit through submit_contact() (validated + rate limited);
-- only the admin (by auth user id) can read and mark messages read. Idempotent.
-- APPLIED 2026-10-14 to project gcrngdjrrfunokqfmkip as migration "contact_messages_inbox".
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'opportumap',
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  read boolean not null default false,
  constraint contact_name_len check (char_length(name) between 1 and 100),
  constraint contact_email_fmt check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contact_subject_len check (char_length(subject) <= 150),
  constraint contact_message_len check (char_length(message) between 1 and 5000),
  constraint contact_source_ok check (source in ('opportumap', 'migrova'))
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at desc);

alter table public.contact_messages enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'contact_messages'
  loop execute format('drop policy %I on public.contact_messages', r.policyname); end loop;
end $$;
create policy contact_admin_select on public.contact_messages for select to authenticated
  using ((select auth.uid()) = '3c60e96c-18e0-4990-91b4-834acd70579e'::uuid);
create policy contact_admin_update on public.contact_messages for update to authenticated
  using ((select auth.uid()) = '3c60e96c-18e0-4990-91b4-834acd70579e'::uuid)
  with check ((select auth.uid()) = '3c60e96c-18e0-4990-91b4-834acd70579e'::uuid);

revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (read) on public.contact_messages to authenticated;

create or replace function public.submit_contact(p_name text, p_email text, p_subject text, p_message text, p_source text default 'opportumap')
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 day') >= 200 then
    raise exception 'contact-busy' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_messages
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'contact-too-many' using errcode = 'P0001';
  end if;
  insert into public.contact_messages (source, name, email, subject, message)
  values (coalesce(nullif(btrim(p_source), ''), 'opportumap'), btrim(coalesce(p_name, '')), v_email,
          btrim(coalesce(p_subject, '')), btrim(coalesce(p_message, '')));
end $$;
revoke execute on function public.submit_contact(text, text, text, text, text) from public;
grant execute on function public.submit_contact(text, text, text, text, text) to anon, authenticated;
