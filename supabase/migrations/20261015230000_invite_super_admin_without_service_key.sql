-- Allow the primary Super Admin to invite an unregistered email without
-- exposing or requiring the Supabase service-role key in the application.

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
    set role = 'super_admin',
        status = 'active',
        updated_at = now()
    where user_id = target_user_id;

    return target_email_confirmed_at is null;
  end if;

  insert into public.super_admin_invites (email, invited_by)
  values (clean_email, (select auth.uid()))
  on conflict (email) do update
    set invited_by = excluded.invited_by,
        created_at = now();

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
    select 1
    from public.super_admin_invites i
    where i.email = lower(new.email)
  ) then
    insert into public.super_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.user_roles (user_id, role, status)
    values (new.id, 'super_admin', 'active')
    on conflict (user_id) do update
      set role = 'super_admin',
          status = 'active',
          updated_at = now();

    delete from public.super_admin_invites
    where email = lower(new.email);
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
