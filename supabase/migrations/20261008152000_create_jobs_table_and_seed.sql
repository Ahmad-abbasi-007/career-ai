create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  location text,
  description text not null,
  skills text,
  salary text,
  job_type text,
  application_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists jobs_title_company_key
  on public.jobs (title, company);

alter table public.jobs enable row level security;

grant select on table public.jobs to authenticated;

drop policy if exists "Authenticated users can view jobs" on public.jobs;
create policy "Authenticated users can view jobs"
  on public.jobs
  for select
  to authenticated
  using (true);

insert into public.jobs
  (title, company, location, description, skills, salary, job_type, application_url)
values
  (
    'Frontend Developer',
    'Tech Solutions',
    'Lahore, Pakistan',
    'We are looking for a frontend developer to build modern responsive web applications. The candidate should have experience with React, JavaScript, TypeScript, HTML, CSS and Tailwind CSS.',
    'React, JavaScript, TypeScript, HTML, CSS, Tailwind CSS',
    'PKR 80,000 - 120,000',
    'Full Time',
    null
  ),
  (
    'Full Stack Developer',
    'Digital Innovations',
    'Islamabad, Pakistan',
    'We are looking for a full stack developer who can develop modern web applications using React, Next.js, Node.js, Express, PostgreSQL and REST APIs. Knowledge of AI APIs is a plus.',
    'React, Next.js, Node.js, Express, PostgreSQL, REST API, AI',
    'PKR 120,000 - 180,000',
    'Full Time',
    null
  ),
  (
    'React Developer',
    'Software House',
    'Remote',
    'Build responsive web interfaces using React and modern frontend technologies. Experience with JavaScript, TypeScript, Git, REST APIs and Tailwind CSS is required.',
    'React, JavaScript, TypeScript, Git, REST API, Tailwind CSS',
    'PKR 90,000 - 140,000',
    'Full Time',
    null
  )
on conflict (title, company) do nothing;
