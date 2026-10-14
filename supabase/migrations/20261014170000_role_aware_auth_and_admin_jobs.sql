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
        user_id,
        company_name,
        work_email,
        website,
        company_details,
        status
      )
      values (
        new.id,
        recruiter_company,
        coalesce(
          nullif(btrim(new.raw_user_meta_data ->> 'work_email'), ''),
          new.email
        ),
        nullif(btrim(new.raw_user_meta_data ->> 'website'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'company_details'), ''),
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
for each row
execute function public.handle_new_user_role();

insert into public.user_roles (user_id, role, status)
select
  u.id,
  case
    when sa.user_id is not null then 'super_admin'
    when u.raw_user_meta_data ->> 'account_type' = 'recruiter'
      then 'recruiter'
    else 'student'
  end,
  case
    when sa.user_id is not null then 'active'
    when u.raw_user_meta_data ->> 'account_type' = 'recruiter'
      then 'pending'
    else 'active'
  end
from auth.users u
left join public.super_admins sa on sa.user_id = u.id
on conflict (user_id) do nothing;

grant select on table public.user_roles to authenticated;
grant select, insert, update on table public.recruiter_requests to authenticated;

alter table public.jobs enable row level security;
grant select, insert, update, delete on table public.jobs to authenticated;
revoke insert, update, delete on table public.jobs from anon;

drop policy if exists "Admins can create jobs" on public.jobs;
drop policy if exists "Admins can insert jobs" on public.jobs;
drop policy if exists "Admins can update jobs" on public.jobs;
drop policy if exists "Admins can delete jobs" on public.jobs;
drop policy if exists "Super admins can create jobs" on public.jobs;
drop policy if exists "Super admins can update jobs" on public.jobs;
drop policy if exists "Super admins can delete jobs" on public.jobs;

drop policy if exists "Authenticated users can view jobs" on public.jobs;
create policy "Authenticated users can view jobs"
  on public.jobs
  for select
  to authenticated
  using (true);

create policy "Super admins can create jobs"
  on public.jobs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  );

create policy "Super admins can update jobs"
  on public.jobs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  );

create policy "Super admins can delete jobs"
  on public.jobs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  );
