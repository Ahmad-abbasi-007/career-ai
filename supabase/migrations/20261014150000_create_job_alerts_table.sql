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

create index if not exists job_alerts_user_idx
  on public.job_alerts (user_id);

alter table public.job_alerts enable row level security;

drop policy if exists "Users can view their own job alerts" on public.job_alerts;
create policy "Users can view their own job alerts"
  on public.job_alerts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own job alerts" on public.job_alerts;
create policy "Users can create their own job alerts"
  on public.job_alerts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own job alerts" on public.job_alerts;
create policy "Users can update their own job alerts"
  on public.job_alerts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own job alerts" on public.job_alerts;
create policy "Users can delete their own job alerts"
  on public.job_alerts
  for delete
  to authenticated
  using (auth.uid() = user_id);
