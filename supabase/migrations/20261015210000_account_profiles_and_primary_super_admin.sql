create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admins
  add column if not exists created_at timestamptz not null default now();
alter table public.super_admins enable row level security;
grant select on public.super_admins to authenticated;
revoke all on public.super_admins from anon;

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
    raise exception 'No confirmed CareerAI account was found for ar3359499@gmail.com. Confirm that this account exists and its email is verified, then rerun the migration.';
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

revoke insert, update, delete on public.super_admins from anon, authenticated;

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

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

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

revoke all on function public.is_primary_super_admin() from public;
grant execute on function public.is_primary_super_admin() to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'super_admins'
  loop
    execute format(
      'drop policy %I on public.super_admins',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy "super_admins_read_self_or_admin"
on public.super_admins for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_super_admin()
);

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

revoke all on function public.update_recruiter_company_profile(
  text, text, text, text, text
) from public;
grant execute on function public.update_recruiter_company_profile(
  text, text, text, text, text
) to authenticated;

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

revoke all on function public.manage_super_admin(text, text) from public;
grant execute on function public.manage_super_admin(text, text)
  to authenticated;

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

revoke all on function public.set_recruiter_access(uuid, boolean) from public;
grant execute on function public.set_recruiter_access(uuid, boolean)
  to authenticated;
