-- UTAMA data room - additive migration
-- Run this once in your Supabase project's SQL Editor, AFTER schema.sql (and
-- referrals-schema.sql, if you've run that) have already been run.
--
-- Design, in plain terms:
--   1. The actual documents (due diligence, example contracts) stay in
--      Google Drive - nothing here stores or duplicates file bytes. This
--      table only stores METADATA: which document, which project, which
--      Drive file ID.
--   2. Who can see what is controlled here in Postgres (dataroom_access),
--      not by Drive's own sharing settings alone. But the actual bytes are
--      still gated by Drive: you (Steven) share each Drive file/folder with
--      the specific approved investor's Google account yourself (view-only,
--      download/print disabled via Drive's own sharing UI) whenever you
--      grant them access here. This table is the index/gate; Drive sharing
--      is the lock on the actual file. Do both - granting access here
--      without also sharing the Drive file just shows someone a dead link.
--   3. Access is granted per (contact, project) - the same person can be
--      approved for The Maison's data room without automatically seeing
--      MOKA's, and vice versa.
--   4. The public site has no write access to either table at all - you
--      manage documents and access grants yourself (Table Editor / SQL
--      Editor), exactly like purchases in schema.sql. The one convenience
--      function below (grant_dataroom_access) is for YOU to call from the
--      SQL Editor, not something the public site can reach.

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- dataroom_documents: one row per document. Add/edit these yourself in the
-- Table Editor - title, project, category, and the Google Drive file ID
-- (the long id in a Drive file's URL: drive.google.com/file/d/THIS_PART/view).
-- ---------------------------------------------------------------------------
create table if not exists public.dataroom_documents (
  id            uuid primary key default gen_random_uuid(),
  project       text not null,   -- 'The Maison' | 'MOKA' | ... - must match the project string used in leads/purchases
  category      text not null check (category in ('due_diligence', 'contract_voorbeeld', 'overig')),
  title         text not null,
  description   text,
  drive_file_id text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists dataroom_documents_project_idx on public.dataroom_documents (project);

-- ---------------------------------------------------------------------------
-- dataroom_access: one row per (contact, project) you've approved for the
-- data room. contact_name/contact_email are denormalized (same reasoning as
-- leads in schema.sql) so this table is readable on its own in the Table
-- Editor, without having to join against contacts to see who's who.
-- ---------------------------------------------------------------------------
create table if not exists public.dataroom_access (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  contact_name  text,
  contact_email citext,
  project       text not null,
  granted_at    timestamptz not null default now(),
  granted_note  text,          -- e.g. "na belafspraak 27/7 - serieuze interesse"
  unique (contact_id, project)
);

create index if not exists dataroom_access_contact_idx on public.dataroom_access (contact_id);
create index if not exists dataroom_access_project_idx on public.dataroom_access (project);

alter table public.dataroom_documents enable row level security;
alter table public.dataroom_access enable row level security;

-- A signed-in portal user may read their own access grants...
drop policy if exists "self read own dataroom access" on public.dataroom_access;
create policy "self read own dataroom access" on public.dataroom_access
  for select to authenticated
  using (
    contact_id in (select id from public.contacts where user_id = auth.uid())
  );

-- ...and, through that, the documents for any project they've been granted.
-- This is defense-in-depth on top of get_my_dataroom_access() below - the
-- public site only ever calls that function, but a direct table query (e.g.
-- a future admin screen using an authenticated session) is scoped the same way.
drop policy if exists "self read accessible documents" on public.dataroom_documents;
create policy "self read accessible documents" on public.dataroom_documents
  for select to authenticated
  using (
    project in (
      select da.project
      from public.dataroom_access da
      join public.contacts c on c.id = da.contact_id
      where c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- grant_dataroom_access(): the one thing YOU call yourself (SQL Editor),
-- never exposed to anon/authenticated. Looks the person up by e-mail (must
-- already exist as a contact - i.e. they've submitted a lead form at some
-- point) and records the grant. Re-running for the same person/project just
-- updates the note, it never resets granted_at.
--
-- Usage:
--   select grant_dataroom_access('naam@voorbeeld.com', 'The Maison', 'Na goed gesprek 27/7');
--
-- Remember: this only updates the index in Postgres. You still need to
-- share the actual Drive file(s)/folder with that person's Google account
-- yourself, in Drive's own sharing UI.
-- ---------------------------------------------------------------------------
create or replace function public.grant_dataroom_access(
  p_email   text,
  p_project text,
  p_note    text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_name       text;
  v_email      citext;
  v_access_id  uuid;
begin
  v_email := lower(trim(p_email));

  select id, name into v_contact_id, v_name from public.contacts where email = v_email;
  if v_contact_id is null then
    raise exception 'grant_dataroom_access: no contact found for email % - has this person submitted a form yet?', v_email;
  end if;
  if p_project is null or trim(p_project) = '' then
    raise exception 'grant_dataroom_access: project is required';
  end if;

  insert into public.dataroom_access (contact_id, contact_name, contact_email, project, granted_note)
  values (v_contact_id, v_name, v_email, trim(p_project), nullif(trim(p_note), ''))
  on conflict (contact_id, project) do update
    set granted_note = coalesce(nullif(trim(excluded.granted_note), ''), dataroom_access.granted_note)
  returning id into v_access_id;

  return v_access_id;
end;
$$;

-- Deliberately NOT granted to anon/authenticated - call this yourself from
-- the SQL Editor only.

-- ---------------------------------------------------------------------------
-- revoke_dataroom_access(): the undo button, same "you call it yourself"
-- rule as above. Doesn't touch Drive - unshare the file/folder there too.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_dataroom_access(
  p_email   text,
  p_project text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.dataroom_access
  where contact_id = (select id from public.contacts where email = lower(trim(p_email)))
    and project = trim(p_project);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_my_dataroom_access(): the one call the /dataroom/ page makes once
-- someone is signed in. The data room is per project (mirrors the site's
-- own structure: /the-maison/, /the-maison/brochure/, /the-maison/dataroom/,
-- and later /moka/dataroom/ etc.) - pass p_project to scope the result to
-- just that project's page. Leave it null to get every project this person
-- has been granted at once (kept around for a possible future overview,
-- not used by the per-project pages). Returns an empty list for someone
-- who's signed in but not (yet) approved for this project - the page shows
-- a friendly "not yet" message rather than an error.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_dataroom_access(p_project text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
begin
  if auth.uid() is null then
    raise exception 'get_my_dataroom_access: not authenticated';
  end if;

  select id into v_contact_id from public.contacts where user_id = auth.uid();

  if v_contact_id is null then
    return json_build_object('projects', '[]'::json);
  end if;

  return json_build_object(
    'projects', coalesce((
      select json_agg(json_build_object(
        'project', a.project,
        'granted_at', a.granted_at,
        'documents', coalesce((
          select json_agg(json_build_object(
            'id', d.id,
            'category', d.category,
            'title', d.title,
            'description', d.description,
            'view_url', 'https://drive.google.com/file/d/' || d.drive_file_id || '/view'
          ) order by d.sort_order, d.title)
          from public.dataroom_documents d
          where d.project = a.project
        ), '[]'::json)
      ) order by a.granted_at desc)
      from public.dataroom_access a
      where a.contact_id = v_contact_id
        and (p_project is null or a.project = trim(p_project))
    ), '[]'::json)
  );
end;
$$;

grant execute on function public.get_my_dataroom_access(text) to authenticated;
-- Deliberately NOT granted to anon - you must be signed in (magic link) to
-- call this, same gate as the referral portal.
