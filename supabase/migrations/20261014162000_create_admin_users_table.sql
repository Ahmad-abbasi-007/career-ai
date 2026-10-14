create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

grant select on table public.admin_users to authenticated;

drop policy if exists "Users can view their own admin record" on public.admin_users;
create policy "Users can view their own admin record"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- Allow admins to manage jobs through the app.
grant select, insert, update, delete on table public.jobs to authenticated;

drop policy if exists "Authenticated users can view jobs" on public.jobs;
create policy "Authenticated users can view jobs"
  on public.jobs
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can create jobs" on public.jobs;
create policy "Admins can create jobs"
  on public.jobs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can update jobs" on public.jobs;
create policy "Admins can update jobs"
  on public.jobs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can delete jobs" on public.jobs;
create policy "Admins can delete jobs"
  on public.jobs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
