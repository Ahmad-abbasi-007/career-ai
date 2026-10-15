-- Persist application events for the candidate and the job-owning recruiter.
-- Safe to rerun; notifications are created only for new applications and
-- actual status transitions.

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
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
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
      recipient_id,
      notification_type,
      title,
      message,
      application_id
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
    select j.title
    into target_job_title
    from public.jobs j
    where j.id = new.job_id;

    insert into public.notifications (
      recipient_id,
      notification_type,
      title,
      message,
      application_id
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

create or replace function public.is_active_recruiter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'recruiter'
      and ur.status = 'active'
  );
$$;

revoke all on function public.is_active_recruiter() from public;
grant execute on function public.is_active_recruiter() to authenticated;

-- Student status edits would allow fabricated recruiter updates. Keep them
-- read-only for candidates; only the job owner or a Super Admin may change it.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
  loop
    execute format(
      'drop policy %I on public.applications',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy applications_read_candidate_recruiter_admin
on public.applications for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_super_admin()
  or exists (
    select 1
    from public.jobs j
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
);

create policy applications_insert_candidate
on public.applications for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'Applied'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'student'
      and ur.status = 'active'
  )
);

create policy applications_update_owner_recruiter_admin
on public.applications for update to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.jobs j
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.jobs j
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and public.is_active_recruiter()
  )
);

create policy applications_delete_owner_or_admin
on public.applications for delete to authenticated
using (user_id = (select auth.uid()) or public.is_super_admin());
