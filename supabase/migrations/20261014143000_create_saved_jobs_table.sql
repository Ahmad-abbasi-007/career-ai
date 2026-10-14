create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_jobs_user_job_unique unique (user_id, job_id)
);

create index if not exists saved_jobs_user_created_idx
  on public.saved_jobs (user_id, created_at desc);

alter table public.saved_jobs enable row level security;

drop policy if exists "Users can view their own saved jobs" on public.saved_jobs;
create policy "Users can view their own saved jobs"
  on public.saved_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save their own jobs" on public.saved_jobs;
create policy "Users can save their own jobs"
  on public.saved_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their saved jobs" on public.saved_jobs;
create policy "Users can remove their saved jobs"
  on public.saved_jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);
