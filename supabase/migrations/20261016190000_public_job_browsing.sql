-- Allow visitors to browse job listings without creating an account.
-- Application, profile, and recruiter data remain restricted by their own policies.

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

drop policy if exists "jobs_read_public" on public.jobs;
create policy "jobs_read_public"
on public.jobs for select to anon
using (true);
