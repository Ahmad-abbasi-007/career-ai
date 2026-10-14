alter table public.recruiter_requests
  add column if not exists full_name text;

grant select, update on table public.recruiter_requests to authenticated;

drop policy if exists "Super admin views recruiter requests"
  on public.recruiter_requests;

create policy "Super admin views recruiter requests"
  on public.recruiter_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  );

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
  if not exists (
    select 1
    from public.super_admins sa
    where sa.user_id = (select auth.uid())
  ) then
    raise exception 'Only the Super Administrator can review recruiter requests';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select rr.user_id
    into target_user_id
  from public.recruiter_requests rr
  where rr.id = p_request_id
    and rr.status = 'pending'
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
  set role = 'recruiter',
      status = excluded.status,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.review_recruiter_request(uuid, text) from public;
grant execute on function public.review_recruiter_request(uuid, text)
  to authenticated;

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
        full_name,
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
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        'pending'
      )
      on conflict (user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Include recruiter accounts created before request capture was enabled.
insert into public.recruiter_requests (
  user_id,
  company_name,
  work_email,
  website,
  company_details,
  full_name,
  status
)
select
  u.id,
  nullif(btrim(u.raw_user_meta_data ->> 'company_name'), ''),
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'work_email'), ''),
    u.email
  ),
  nullif(btrim(u.raw_user_meta_data ->> 'website'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'company_details'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  'pending'
from auth.users u
join public.user_roles ur on ur.user_id = u.id
where ur.role = 'recruiter'
  and ur.status = 'pending'
  and nullif(btrim(u.raw_user_meta_data ->> 'company_name'), '') is not null
on conflict (user_id) do update
set full_name = coalesce(
  public.recruiter_requests.full_name,
  excluded.full_name
);
