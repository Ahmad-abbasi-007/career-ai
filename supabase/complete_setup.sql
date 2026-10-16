-- CareerAI application schema and authorization setup.
-- Safe to rerun: this script does not drop tables or application data.
-- Review the existing project schema in Supabase before applying. Existing
-- custom RLS policies on the application tables below are replaced by the
-- canonical policies in this script.

create extension if not exists pgcrypto;

-- Core records. CREATE TABLE IF NOT EXISTS preserves existing data; the
-- following ALTER statements add columns required by the application only
-- when those columns are absent.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  job_title text,
  bio text,
  skills text,
  education text,
  experience text,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text;
alter table public.profiles add column if not exists education text;
alter table public.profiles add column if not exists experience text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'recruiter', 'super_admin')),
  status text not null default 'active'
    check (status in ('active', 'pending', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles add column if not exists role text;
alter table public.user_roles add column if not exists status text not null default 'active';
alter table public.user_roles add column if not exists created_at timestamptz not null default now();
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins
  add column if not exists created_at timestamptz not null default now();

-- Bootstrap the explicitly designated primary administrator. This requires
-- the confirmed account to exist and never relies on browser-supplied roles.
drop trigger if exists protect_primary_super_admin
  on public.super_admins;
do $$
declare
  primary_user_id uuid;
begin
  select u.id into primary_user_id
  from auth.users u
  where lower(u.email) = lower('ar3359499@gmail.com')
    and u.email_confirmed_at is not null;

  if primary_user_id is null then
    raise exception 'No confirmed CareerAI account was found for ar3359499@gmail.com. Confirm that this account exists and its email is verified, then rerun the setup.';
  end if;

  perform 1 from public.super_admins where user_id = primary_user_id;
  if not found then
    insert into public.super_admins (user_id) values (primary_user_id);
  end if;

  update public.user_roles
  set role = 'super_admin',
      status = 'active',
      updated_at = now()
  where user_id = primary_user_id;
  if not found then
    insert into public.user_roles (user_id, role, status, updated_at)
    values (primary_user_id, 'super_admin', 'active', now());
  end if;
end;
$$;

create table if not exists public.recruiter_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  company_name text not null,
  work_email text not null,
  website text,
  company_details text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.recruiter_requests add column if not exists full_name text;
alter table public.recruiter_requests add column if not exists company_name text;
alter table public.recruiter_requests add column if not exists work_email text;
alter table public.recruiter_requests add column if not exists website text;
alter table public.recruiter_requests add column if not exists company_details text;
alter table public.recruiter_requests add column if not exists status text not null default 'pending';
alter table public.recruiter_requests add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.recruiter_requests add column if not exists reviewed_at timestamptz;
alter table public.recruiter_requests add column if not exists created_at timestamptz not null default now();

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references auth.users(id) on delete set null,
  title text not null,
  company text,
  location text,
  description text not null,
  skills text,
  salary text,
  job_type text,
  application_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs add column if not exists recruiter_id uuid references auth.users(id) on delete set null;
alter table public.jobs add column if not exists title text;
alter table public.jobs add column if not exists company text;
alter table public.jobs add column if not exists location text;
alter table public.jobs add column if not exists description text;
alter table public.jobs add column if not exists skills text;
alter table public.jobs add column if not exists salary text;
alter table public.jobs add column if not exists job_type text;
alter table public.jobs add column if not exists application_url text;
alter table public.jobs add column if not exists created_at timestamptz not null default now();
alter table public.jobs add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'id'
  ) then
    raise exception 'public.jobs has no id column, which is required by existing job and application features.';
  end if;
  if exists (select 1 from public.jobs where id is null)
     or exists (select 1 from public.jobs group by id having count(*) > 1) then
    raise exception 'public.jobs has null or duplicate ids; resolve these before creating dependent tables.';
  end if;
end;
$$;
create unique index if not exists jobs_id_key on public.jobs (id);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'Applied',
  notes text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_check
    check (status in ('Applied', 'Screening', 'Interview', 'Offer', 'Rejected'))
);

alter table public.applications add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.applications add column if not exists job_id uuid references public.jobs(id) on delete cascade;
alter table public.applications add column if not exists status text not null default 'Applied';
alter table public.applications add column if not exists notes text;
alter table public.applications add column if not exists applied_at timestamptz not null default now();
alter table public.applications add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'id'
  ) then
    raise exception 'public.applications has no id column, which is required by screening answers.';
  end if;
  if exists (select 1 from public.applications where id is null)
     or exists (select 1 from public.applications group by id having count(*) > 1) then
    raise exception 'public.applications has null or duplicate ids; resolve these before creating dependent tables.';
  end if;
end;
$$;
create unique index if not exists applications_id_key on public.applications (id);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_jobs_user_job_unique unique (user_id, job_id)
);

alter table public.saved_jobs add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.saved_jobs add column if not exists job_id uuid references public.jobs(id) on delete cascade;
alter table public.saved_jobs add column if not exists created_at timestamptz not null default now();

create table if not exists public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  location text,
  job_type text,
  email_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_alerts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.job_alerts add column if not exists keyword text;
alter table public.job_alerts add column if not exists location text;
alter table public.job_alerts add column if not exists job_type text;
alter table public.job_alerts add column if not exists email_enabled boolean not null default true;
alter table public.job_alerts add column if not exists is_active boolean not null default true;
alter table public.job_alerts add column if not exists created_at timestamptz not null default now();
alter table public.job_alerts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.job_screening_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'short_text'
    check (question_type in ('short_text', 'long_text', 'yes_no', 'number')),
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.job_screening_questions add column if not exists job_id uuid references public.jobs(id) on delete cascade;
alter table public.job_screening_questions add column if not exists question_text text;
alter table public.job_screening_questions add column if not exists question_type text not null default 'short_text';
alter table public.job_screening_questions add column if not exists is_required boolean not null default true;
alter table public.job_screening_questions add column if not exists sort_order integer not null default 0;
alter table public.job_screening_questions add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'job_screening_questions'
      and column_name = 'id'
  ) then
    raise exception 'public.job_screening_questions has no id column, which is required by application answers.';
  end if;
  if exists (select 1 from public.job_screening_questions where id is null)
     or exists (
       select 1 from public.job_screening_questions
       group by id having count(*) > 1
     ) then
    raise exception 'public.job_screening_questions has null or duplicate ids; resolve these before creating dependent tables.';
  end if;
end;
$$;
create unique index if not exists job_screening_questions_id_key
  on public.job_screening_questions (id);

create table if not exists public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  question_id uuid not null references public.job_screening_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now(),
  constraint application_answers_application_question_unique
    unique (application_id, question_id)
);

alter table public.application_answers add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.application_answers add column if not exists question_id uuid references public.job_screening_questions(id) on delete cascade;
alter table public.application_answers add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.application_answers add column if not exists job_id uuid references public.jobs(id) on delete cascade;
alter table public.application_answers add column if not exists answer text;
alter table public.application_answers add column if not exists created_at timestamptz not null default now();

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.resumes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.resumes add column if not exists file_name text;
alter table public.resumes add column if not exists file_path text;
alter table public.resumes add column if not exists file_size bigint;
alter table public.resumes add column if not exists created_at timestamptz not null default now();

-- Repair missing role values from auth metadata before validating the table.
update public.user_roles ur
set role = case
      when sa.user_id is not null then 'super_admin'
      when u.raw_user_meta_data ->> 'account_type' = 'recruiter' then 'recruiter'
      else 'student'
    end,
    status = case
      when sa.user_id is not null then 'active'
      when u.raw_user_meta_data ->> 'account_type' = 'recruiter' then 'pending'
      else 'active'
    end
from auth.users u
left join public.super_admins sa on sa.user_id = u.id
where ur.user_id = u.id
  and ur.role is null;

update public.user_roles set status = 'active' where status is null;

-- Key checks prevent policies and foreign-key-dependent writes from being
-- installed against legacy tables with missing, null, or duplicate identities.
do $$
declare
  target_table text;
  identity_column text;
  has_duplicates boolean;
begin
  foreach target_table in array array[
    'profiles', 'user_roles', 'super_admins', 'recruiter_requests',
    'jobs', 'applications', 'saved_jobs', 'job_alerts',
    'job_screening_questions', 'application_answers', 'resumes'
  ]
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = target_table
        and column_name = case
          when target_table in ('user_roles', 'super_admins') then 'user_id'
          else 'id'
        end
    ) then
      raise exception 'Required identity column is missing from public.%', target_table;
    end if;
  end loop;
end;
$$;

-- Abort on legacy rows that cannot be assigned a safe identity or required
-- application data. Do not fabricate ownership or alert/job content.
do $$
begin
  if exists (select 1 from public.profiles where id is null) then
    raise exception 'public.profiles contains rows without id; map them to auth.users before continuing.';
  end if;
  if exists (select 1 from public.user_roles where user_id is null) then
    raise exception 'public.user_roles contains rows without user_id; resolve them before continuing.';
  end if;
  if exists (select 1 from public.user_roles where role is null) then
    raise exception 'public.user_roles contains roles that could not be backfilled; resolve them before continuing.';
  end if;
  if exists (select 1 from public.super_admins where user_id is null) then
    raise exception 'public.super_admins contains rows without user_id; resolve them before continuing.';
  end if;
  if exists (select 1 from public.recruiter_requests where id is null or user_id is null) then
    raise exception 'public.recruiter_requests contains rows without id or user_id; resolve them before continuing.';
  end if;
  if exists (select 1 from public.recruiter_requests where company_name is null or work_email is null) then
    raise exception 'public.recruiter_requests contains rows missing company_name or work_email; resolve them before continuing.';
  end if;
  if exists (select 1 from public.jobs where id is null or title is null or description is null) then
    raise exception 'public.jobs contains rows missing id, title, or description; resolve them before continuing.';
  end if;
  if exists (select 1 from public.applications where id is null or user_id is null or job_id is null) then
    raise exception 'public.applications contains rows without id, user_id, or job_id; resolve them before continuing.';
  end if;
  if exists (select 1 from public.saved_jobs where id is null or user_id is null or job_id is null) then
    raise exception 'public.saved_jobs contains rows without id, user_id, or job_id; resolve them before continuing.';
  end if;
  if exists (select 1 from public.job_alerts where id is null or user_id is null or keyword is null) then
    raise exception 'public.job_alerts contains rows missing id, user_id, or keyword; resolve them before continuing.';
  end if;
  if exists (select 1 from public.job_screening_questions where id is null or job_id is null or question_text is null) then
    raise exception 'public.job_screening_questions contains rows missing id, job_id, or question_text; resolve them before continuing.';
  end if;
  if exists (select 1 from public.application_answers where id is null or application_id is null or question_id is null or user_id is null or job_id is null or answer is null) then
    raise exception 'public.application_answers contains incomplete rows; resolve them before continuing.';
  end if;
  if exists (select 1 from public.resumes where id is null or user_id is null or file_name is null or file_path is null) then
    raise exception 'public.resumes contains incomplete rows; resolve them before continuing.';
  end if;

  for target_table, identity_column in
    select * from (values
      ('profiles', 'id'),
      ('user_roles', 'user_id'),
      ('super_admins', 'user_id'),
      ('recruiter_requests', 'id'),
      ('jobs', 'id'),
      ('applications', 'id'),
      ('saved_jobs', 'id'),
      ('job_alerts', 'id'),
      ('job_screening_questions', 'id'),
      ('application_answers', 'id'),
      ('resumes', 'id')
    ) as identity_columns(table_name, column_name)
  loop
    execute format(
      'select exists (select 1 from public.%I group by %I having count(*) > 1)',
      target_table,
      identity_column
    ) into has_duplicates;
    if has_duplicates then
      raise exception 'Duplicate identity values exist in public.%.%; resolve them before continuing.',
        target_table, identity_column;
    end if;
  end loop;
end;
$$;

-- Indexes for user-scoped access and recruiter/application lookups.
create unique index if not exists profiles_id_key on public.profiles (id);
create unique index if not exists user_roles_user_id_key on public.user_roles (user_id);
create unique index if not exists super_admins_user_id_key on public.super_admins (user_id);
create unique index if not exists recruiter_requests_id_key on public.recruiter_requests (id);
create unique index if not exists jobs_id_key on public.jobs (id);
create unique index if not exists applications_id_key on public.applications (id);
create unique index if not exists saved_jobs_id_key on public.saved_jobs (id);
create unique index if not exists job_alerts_id_key on public.job_alerts (id);
create unique index if not exists job_screening_questions_id_key on public.job_screening_questions (id);
create unique index if not exists application_answers_id_key on public.application_answers (id);
create unique index if not exists resumes_id_key on public.resumes (id);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_location_idx on public.jobs (location);
create index if not exists jobs_job_type_idx on public.jobs (job_type);
create index if not exists jobs_recruiter_created_idx on public.jobs (recruiter_id, created_at desc);
create index if not exists job_alerts_user_idx on public.job_alerts (user_id);
create index if not exists job_alerts_active_user_idx on public.job_alerts (user_id, is_active);
create index if not exists saved_jobs_user_created_idx on public.saved_jobs (user_id, created_at desc);
create index if not exists applications_user_updated_at_idx on public.applications (user_id, updated_at desc);
create index if not exists applications_job_applied_at_idx on public.applications (job_id, applied_at desc);
create index if not exists recruiter_requests_status_created_idx on public.recruiter_requests (status, created_at desc);
create index if not exists job_screening_questions_job_order_idx on public.job_screening_questions (job_id, sort_order);
create index if not exists application_answers_application_idx on public.application_answers (application_id);
create index if not exists resumes_user_created_idx on public.resumes (user_id, created_at desc);

-- Unique indexes are required by the application's upsert and duplicate
-- prevention behavior. Fail with a clear message rather than deleting rows.
do $$
begin
  if exists (
    select 1 from public.applications
    group by user_id, job_id having count(*) > 1
  ) then
    raise exception 'Duplicate (user_id, job_id) rows exist in applications; resolve duplicates before adding the unique index.';
  end if;
  create unique index if not exists applications_user_job_key
    on public.applications (user_id, job_id);

  if exists (
    select 1 from public.saved_jobs
    group by user_id, job_id having count(*) > 1
  ) then
    raise exception 'Duplicate (user_id, job_id) rows exist in saved_jobs; resolve duplicates before adding the unique index.';
  end if;
  create unique index if not exists saved_jobs_user_job_key
    on public.saved_jobs (user_id, job_id);

  if exists (
    select 1 from public.recruiter_requests
    group by user_id having count(*) > 1
  ) then
    raise exception 'Duplicate user_id rows exist in recruiter_requests; resolve duplicates before adding the unique index.';
  end if;
  create unique index if not exists recruiter_requests_user_key
    on public.recruiter_requests (user_id);

  if exists (
    select 1 from public.application_answers
    group by application_id, question_id having count(*) > 1
  ) then
    raise exception 'Duplicate application/question answers exist; resolve duplicates before adding the unique index.';
  end if;
  create unique index if not exists application_answers_application_question_key
    on public.application_answers (application_id, question_id);
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at before update on public.user_roles
for each row execute function public.set_updated_at();
drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at before update on public.applications
for each row execute function public.set_updated_at();
drop trigger if exists set_job_alerts_updated_at on public.job_alerts;
create trigger set_job_alerts_updated_at before update on public.job_alerts
for each row execute function public.set_updated_at();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.super_admins sa
    where sa.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_primary_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.super_admins sa on sa.user_id = u.id
    where u.id = (select auth.uid())
      and lower(u.email) = lower('ar3359499@gmail.com')
  );
$$;

create or replace function public.is_active_recruiter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'recruiter'
      and ur.status = 'active'
  );
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_primary_super_admin() from public;
revoke all on function public.is_active_recruiter() from public;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_primary_super_admin() to authenticated;
grant execute on function public.is_active_recruiter() to authenticated;

create or replace function public.prevent_primary_super_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from auth.users u
      where u.id = old.user_id
        and lower(u.email) = lower('ar3359499@gmail.com')
    ) then
      raise exception 'The primary Super Admin cannot be removed';
    end if;
    return old;
  end if;

  if old.user_id is distinct from new.user_id and exists (
    select 1 from auth.users u
    where u.id = old.user_id
      and lower(u.email) = lower('ar3359499@gmail.com')
  ) then
    raise exception 'The primary Super Admin cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_primary_super_admin
  on public.super_admins;
create trigger protect_primary_super_admin
before update or delete on public.super_admins
for each row execute function public.prevent_primary_super_admin_removal();

create or replace function public.update_recruiter_company_profile(
  p_full_name text,
  p_company_name text,
  p_work_email text,
  p_website text,
  p_company_details text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean_website text := nullif(btrim(p_website), '');
begin
  if current_user_id is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = current_user_id
      and ur.role = 'recruiter'
  ) then
    raise exception 'Only the recruiter who owns this company profile may update it';
  end if;

  if nullif(btrim(p_company_name), '') is null
     or length(btrim(p_company_name)) > 160 then
    raise exception 'Company name is required and must be 160 characters or fewer';
  end if;

  if length(btrim(p_full_name)) > 160 then
    raise exception 'Contact name must be 160 characters or fewer';
  end if;

  if nullif(btrim(p_work_email), '') is null
     or btrim(p_work_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     or length(btrim(p_work_email)) > 254 then
    raise exception 'Enter a valid company work email address';
  end if;

  if clean_website is not null and (
    length(clean_website) > 2048
    or clean_website !~* '^https?://[^[:space:]]+$'
  ) then
    raise exception 'Company website must be a valid HTTP or HTTPS URL';
  end if;

  if length(p_company_details) > 5000 then
    raise exception 'Company description must be 5000 characters or fewer';
  end if;

  update public.recruiter_requests
  set full_name = nullif(btrim(p_full_name), ''),
      company_name = btrim(p_company_name),
      work_email = btrim(p_work_email),
      website = clean_website,
      company_details = nullif(btrim(p_company_details), '')
  where user_id = current_user_id;

  if not found then
    raise exception 'No company profile is linked to this recruiter account';
  end if;
end;
$$;

create or replace function public.manage_super_admin(
  p_email text,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if not public.is_primary_super_admin() then
    raise exception 'Only the primary Super Admin can manage Super Admin accounts';
  end if;

  if p_action is null or p_action not in ('add', 'remove')
     or nullif(btrim(p_email), '') is null then
    raise exception 'A valid email and add or remove action are required';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email));

  if target_user_id is null then
    raise exception 'No registered account was found for that email';
  end if;

  if p_action = 'add' then
    if not exists (
      select 1 from public.user_roles ur
      where ur.user_id = target_user_id
        and ur.role = 'student'
        and ur.status = 'active'
    ) then
      raise exception 'Only an active student account can be promoted';
    end if;

    insert into public.super_admins (user_id)
    values (target_user_id)
    on conflict (user_id) do nothing;

    update public.user_roles
    set role = 'super_admin', status = 'active', updated_at = now()
    where user_id = target_user_id;
    return;
  end if;

  if exists (
    select 1
    from auth.users u
    where u.id = target_user_id
      and lower(u.email) = lower('ar3359499@gmail.com')
  ) then
    raise exception 'The primary Super Admin cannot be removed';
  end if;

  if not exists (
    select 1 from public.super_admins sa
    where sa.user_id = target_user_id
  ) then
    raise exception 'That account is not a Super Admin';
  end if;

  update public.user_roles
  set role = 'student', status = 'active', updated_at = now()
  where user_id = target_user_id and role = 'super_admin';

  delete from public.super_admins
  where user_id = target_user_id;
end;
$$;

create or replace function public.set_recruiter_access(
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a Super Admin can manage recruiter access';
  end if;
  if p_user_id is null or p_active is null then
    raise exception 'A recruiter account and access action are required';
  end if;
  if not exists (
    select 1
    from public.recruiter_requests rr
    where rr.user_id = p_user_id
      and rr.status = 'approved'
  ) then
    raise exception 'Only an approved recruiter account can be suspended or reactivated';
  end if;

  update public.user_roles
  set status = case when p_active then 'active' else 'suspended' end,
      updated_at = now()
  where user_id = p_user_id
    and role = 'recruiter'
    and status in ('active', 'suspended');

  if not found then
    raise exception 'Recruiter account was not found or cannot be changed';
  end if;
end;
$$;

revoke all on function public.update_recruiter_company_profile(
  text, text, text, text, text
) from public;
grant execute on function public.update_recruiter_company_profile(
  text, text, text, text, text
) to authenticated;
revoke all on function public.manage_super_admin(text, text) from public;
grant execute on function public.manage_super_admin(text, text)
  to authenticated;
revoke all on function public.set_recruiter_access(uuid, boolean) from public;
grant execute on function public.set_recruiter_access(uuid, boolean)
  to authenticated;

-- Create profile and role rows from trusted auth-user insertion. Recruiter
-- status is pending until the super administrator approves the request.
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  recruiter_company text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'account_type' = 'recruiter'
      then 'recruiter'
    else 'student'
  end;

  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email
  )
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email),
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.user_roles (user_id, role, status)
  values (
    new.id,
    requested_role,
    case when requested_role = 'recruiter' then 'pending' else 'active' end
  )
  on conflict (user_id) do nothing;

  if requested_role = 'recruiter' then
    recruiter_company := nullif(
      btrim(new.raw_user_meta_data ->> 'company_name'),
      ''
    );

    if recruiter_company is not null then
      insert into public.recruiter_requests (
        user_id, company_name, work_email, website, company_details, full_name, status
      )
      values (
        new.id,
        recruiter_company,
        coalesce(nullif(btrim(new.raw_user_meta_data ->> 'work_email'), ''), new.email),
        nullif(btrim(new.raw_user_meta_data ->> 'website'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'company_details'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        'pending'
      )
      on conflict (user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
after insert on auth.users
for each row execute function public.handle_new_user_role();

-- Idempotently backfill records for existing auth accounts.
insert into public.user_roles (user_id, role, status)
select
  u.id,
  case when sa.user_id is not null then 'super_admin'
       when u.raw_user_meta_data ->> 'account_type' = 'recruiter' then 'recruiter'
       else 'student' end,
  case when sa.user_id is not null then 'active'
       when u.raw_user_meta_data ->> 'account_type' = 'recruiter' then 'pending'
       else 'active' end
from auth.users u
left join public.super_admins sa on sa.user_id = u.id
on conflict (user_id) do nothing;

insert into public.profiles (id, full_name, email)
select
  u.id,
  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  u.email
from auth.users u
on conflict (id) do nothing;

insert into public.recruiter_requests (
  user_id, company_name, work_email, website, company_details, full_name, status
)
select
  u.id,
  nullif(btrim(u.raw_user_meta_data ->> 'company_name'), ''),
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'work_email'), ''), u.email),
  nullif(btrim(u.raw_user_meta_data ->> 'website'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'company_details'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  'pending'
from auth.users u
join public.user_roles ur on ur.user_id = u.id
where ur.role = 'recruiter'
  and ur.status = 'pending'
  and nullif(btrim(u.raw_user_meta_data ->> 'company_name'), '') is not null
on conflict (user_id) do nothing;

create or replace function public.review_recruiter_request(
  p_request_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only the Super Administrator can review recruiter requests';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select rr.user_id into target_user_id
  from public.recruiter_requests rr
  where rr.id = p_request_id and rr.status = 'pending'
  for update;

  if target_user_id is null then
    raise exception 'Pending recruiter request not found';
  end if;

  update public.recruiter_requests
  set status = p_decision,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_request_id;

  insert into public.user_roles (user_id, role, status, updated_at)
  values (
    target_user_id,
    'recruiter',
    case when p_decision = 'approved' then 'active' else 'rejected' end,
    now()
  )
  on conflict (user_id) do update
    set role = excluded.role,
        status = excluded.status,
        updated_at = now();
end;
$$;

revoke all on function public.review_recruiter_request(uuid, text) from public;
grant execute on function public.review_recruiter_request(uuid, text) to authenticated;

-- Replace existing application policies with one coherent set. This preserves
-- rows while preventing unknown permissive policies from bypassing ownership.
do $$
declare
  target record;
  existing_policy record;
begin
  for target in
    select unnest(array[
      'profiles', 'user_roles', 'super_admins', 'recruiter_requests',
      'jobs', 'applications', 'saved_jobs', 'job_alerts',
      'job_screening_questions', 'application_answers', 'resumes'
    ]) as table_name
  loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target.table_name
    loop
      execute format(
        'drop policy %I on public.%I',
        existing_policy.policyname,
        target.table_name
      );
    end loop;
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.super_admins enable row level security;
alter table public.recruiter_requests enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.job_alerts enable row level security;
alter table public.job_screening_questions enable row level security;
alter table public.application_answers enable row level security;
alter table public.resumes enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.super_admins to authenticated;
grant select on public.recruiter_requests to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, delete on public.saved_jobs to authenticated;
grant select, insert, update, delete on public.job_alerts to authenticated;
grant select, insert, update, delete on public.job_screening_questions to authenticated;
grant select, insert on public.application_answers to authenticated;
grant select, insert, delete on public.resumes to authenticated;

revoke all on public.profiles, public.user_roles, public.super_admins,
  public.recruiter_requests, public.jobs, public.applications, public.saved_jobs,
  public.job_alerts, public.job_screening_questions, public.application_answers,
  public.resumes from anon;
revoke all on public.jobs from anon;
grant select (
 id,
 title,
 company,
 location,
 description,
 skills,
 salary,
 job_type,
 application_url,
 created_at
) on public.jobs to anon;

create policy "profiles_read_authorized"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.is_super_admin()
  or (
    public.is_active_recruiter()
    and exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.user_id = profiles.id
        and j.recruiter_id = (select auth.uid())
    )
  )
);
create policy "profiles_insert_self"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "user_roles_read_self_or_admin"
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or public.is_super_admin());
create policy "super_admins_read_self_or_admin"
on public.super_admins for select to authenticated
using (user_id = (select auth.uid()) or public.is_super_admin());

create policy "recruiter_requests_read_owner_or_admin"
on public.recruiter_requests for select to authenticated
using (user_id = (select auth.uid()) or public.is_super_admin());

create policy "jobs_read_active_users"
on public.jobs for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.status = 'active'
  )
  or public.is_super_admin()
);
drop policy if exists "jobs_read_public" on public.jobs;
create policy "jobs_read_public"
on public.jobs for select to anon
using (true);
create policy "jobs_insert_recruiter_or_admin"
on public.jobs for insert to authenticated
with check (
  public.is_super_admin()
  or (
    recruiter_id = (select auth.uid())
    and public.is_active_recruiter()
  )
);
create policy "jobs_update_owner_or_admin"
on public.jobs for update to authenticated
using (
  public.is_super_admin()
  or (recruiter_id = (select auth.uid()) and public.is_active_recruiter())
)
with check (
  public.is_super_admin()
  or (recruiter_id = (select auth.uid()) and public.is_active_recruiter())
);
create policy "jobs_delete_owner_or_admin"
on public.jobs for delete to authenticated
using (
  public.is_super_admin()
  or (recruiter_id = (select auth.uid()) and public.is_active_recruiter())
);

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'applications'
  loop
    execute format(
      'drop policy %I on public.applications',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy "applications_read_candidate_recruiter_admin"
on public.applications for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_super_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
);
create policy "applications_insert_candidate"
on public.applications for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'Applied'
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'student'
      and ur.status = 'active'
  )
);
create policy "applications_update_owner_recruiter_admin"
on public.applications for update to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
);
create policy "applications_delete_owner_or_admin"
on public.applications for delete to authenticated
using (user_id = (select auth.uid()) or public.is_super_admin());

create policy "saved_jobs_owner_all"
on public.saved_jobs for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "job_alerts_owner_all"
on public.job_alerts for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "screening_questions_read_active_users"
on public.job_screening_questions for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.status = 'active'
  )
  or public.is_super_admin()
);
create policy "screening_questions_manage_job_owner_or_admin"
on public.job_screening_questions for all to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = job_screening_questions.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = job_screening_questions.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
);

create policy "application_answers_read_owner_recruiter_admin"
on public.application_answers for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_super_admin()
  or exists (
    select 1
    from public.jobs j
    where j.id = application_answers.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
);
create policy "application_answers_insert_candidate"
on public.application_answers for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.applications a
    join public.job_screening_questions q on q.id = application_answers.question_id
    where a.id = application_answers.application_id
      and a.user_id = (select auth.uid())
      and a.job_id = application_answers.job_id
      and q.job_id = application_answers.job_id
  )
);

create policy "resumes_owner_all"
on public.resumes for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Resume files remain private and are scoped to an auth user's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf'];

alter table storage.objects enable row level security;
drop policy if exists "resume_objects_read_owner" on storage.objects;
drop policy if exists "resume_objects_insert_owner" on storage.objects;
drop policy if exists "resume_objects_update_owner" on storage.objects;
drop policy if exists "resume_objects_delete_owner" on storage.objects;

create policy "resume_objects_read_owner"
on storage.objects for select to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume_objects_insert_owner"
on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume_objects_update_owner"
on storage.objects for update to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume_objects_delete_owner"
on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant usage on schema public to authenticated;
grant usage on schema storage to authenticated;

-- The confirmed ar3359499@gmail.com account is bootstrapped as primary above.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null
    check (notification_type in ('new_application', 'application_status')),
  title text not null,
  message text not null,
  application_id uuid not null
    references public.applications(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_recipient_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
  loop
    execute format(
      'drop policy %I on public.notifications',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy notifications_read_recipient
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy notifications_update_recipient
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create or replace function public.notify_recruiter_of_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recruiter_id uuid;
  target_job_title text;
begin
  select j.recruiter_id, j.title
  into target_recruiter_id, target_job_title
  from public.jobs j
  where j.id = new.job_id;

  if target_recruiter_id is not null and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = target_recruiter_id
      and ur.role = 'recruiter'
      and ur.status = 'active'
  ) then
    insert into public.notifications (
      recipient_id, notification_type, title, message, application_id
    )
    values (
      target_recruiter_id,
      'new_application',
      'New application received',
      'A student applied for "' || coalesce(target_job_title, 'your job') || '".',
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_student_of_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_title text;
begin
  if new.status is distinct from old.status then
    select j.title into target_job_title
    from public.jobs j where j.id = new.job_id;

    insert into public.notifications (
      recipient_id, notification_type, title, message, application_id
    )
    values (
      new.user_id,
      'application_status',
      'Application status updated',
      'Your application for "' || coalesce(target_job_title, 'a job')
        || '" is now ' || new.status || '.',
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.prevent_application_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.job_id is distinct from old.job_id then
    raise exception 'An application candidate and job cannot be changed';
  end if;
  return new;
end;
$$;

revoke all on function public.notify_recruiter_of_application() from public;
revoke all on function public.notify_student_of_application_status() from public;
revoke all on function public.prevent_application_identity_change()
  from public, anon, authenticated;

drop trigger if exists applications_notify_recruiter
  on public.applications;
create trigger applications_notify_recruiter
after insert on public.applications
for each row execute function public.notify_recruiter_of_application();

drop trigger if exists applications_prevent_identity_change
  on public.applications;
create trigger applications_prevent_identity_change
before update on public.applications
for each row execute function public.prevent_application_identity_change();

drop trigger if exists applications_notify_student_status
  on public.applications;
create trigger applications_notify_student_status
after update of status on public.applications
for each row execute function public.notify_student_of_application_status();

create table if not exists public.super_admin_invites (
  email text primary key,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint super_admin_invites_email_lowercase
    check (email = lower(email))
);

alter table public.super_admin_invites enable row level security;
revoke all on public.super_admin_invites from anon, authenticated;

create or replace function public.prepare_super_admin_invite(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(btrim(p_email));
  target_user_id uuid;
  target_role text;
  target_status text;
  target_email_confirmed_at timestamptz;
begin
  if not public.is_primary_super_admin() then
    raise exception 'Only the primary Super Admin can invite Super Admins';
  end if;
  if clean_email is null
     or length(clean_email) > 254
     or clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid email address';
  end if;

  select u.id, u.email_confirmed_at, ur.role, ur.status
  into target_user_id, target_email_confirmed_at, target_role, target_status
  from auth.users u
  left join public.user_roles ur on ur.user_id = u.id
  where lower(u.email) = clean_email;

  if target_user_id is not null then
    if target_role = 'super_admin' and target_email_confirmed_at is null then
      return true;
    end if;
    if target_role is distinct from 'student'
       or target_status is distinct from 'active' then
      raise exception 'Only a verified active Student account or a new email can be added';
    end if;

    insert into public.super_admins (user_id)
    values (target_user_id)
    on conflict (user_id) do nothing;
    update public.user_roles
    set role = 'super_admin', status = 'active', updated_at = now()
    where user_id = target_user_id;
    return target_email_confirmed_at is null;
  end if;

  insert into public.super_admin_invites (email, invited_by)
  values (clean_email, (select auth.uid()))
  on conflict (email) do update
    set invited_by = excluded.invited_by, created_at = now();
  return true;
end;
$$;

revoke all on function public.prepare_super_admin_invite(text) from public;
grant execute on function public.prepare_super_admin_invite(text)
  to authenticated;

create or replace function public.promote_invited_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;
  if exists (
    select 1 from public.super_admin_invites i
    where i.email = lower(new.email)
  ) then
    insert into public.super_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    insert into public.user_roles (user_id, role, status)
    values (new.id, 'super_admin', 'active')
    on conflict (user_id) do update
      set role = 'super_admin', status = 'active', updated_at = now();
    delete from public.super_admin_invites where email = lower(new.email);
  end if;
  return new;
end;
$$;

revoke all on function public.promote_invited_super_admin()
  from public, anon, authenticated;
drop trigger if exists zzz_promote_invited_super_admin on auth.users;
create trigger zzz_promote_invited_super_admin
after insert on auth.users
for each row execute function public.promote_invited_super_admin();
