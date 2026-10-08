create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'Applied',
  notes text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_user_job_key unique (user_id, job_id),
  constraint applications_status_check
    check (status in ('Applied', 'Screening', 'Interview', 'Offer', 'Rejected'))
);

create index if not exists applications_user_updated_at_idx
  on public.applications (user_id, updated_at desc);

alter table public.applications enable row level security;

grant select, insert, update, delete on table public.applications to authenticated;

drop policy if exists "Users can view their own applications" on public.applications;
create policy "Users can view their own applications"
  on public.applications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own applications" on public.applications;
create policy "Users can create their own applications"
  on public.applications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own applications" on public.applications;
create policy "Users can update their own applications"
  on public.applications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own applications" on public.applications;
create policy "Users can delete their own applications"
  on public.applications
  for delete
  to authenticated
  using (auth.uid() = user_id);
