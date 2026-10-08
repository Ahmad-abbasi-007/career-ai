create index if not exists jobs_created_at_idx
  on public.jobs (created_at desc);

create index if not exists jobs_location_idx
  on public.jobs (location);

create index if not exists jobs_job_type_idx
  on public.jobs (job_type);

update public.jobs
set job_type = 'Full Time'
where title = 'React Developer'
  and company = 'Software House'
  and job_type = 'Remote';

insert into public.jobs
  (title, company, location, description, skills, salary, job_type, application_url)
values
  (
    'Next.js Developer',
    'WebCraft Pakistan',
    'Lahore, Pakistan',
    'We are hiring a Next.js developer to build scalable web applications using React, Next.js, TypeScript and Tailwind CSS. Experience with REST APIs and Git is required.',
    'Next.js, React, TypeScript, Tailwind CSS, REST API, Git',
    'PKR 100,000 - 160,000',
    'Full Time',
    null
  ),
  (
    'Junior React Developer',
    'CodeLab',
    'Karachi, Pakistan',
    'Looking for a junior React developer with knowledge of JavaScript, React, HTML, CSS and Git. Fresh graduates are encouraged to apply.',
    'React, JavaScript, HTML, CSS, Git',
    'PKR 50,000 - 80,000',
    'Full Time',
    null
  ),
  (
    'Frontend Intern',
    'Startup Hub',
    'Remote',
    'Frontend development internship for students and fresh graduates. Candidates should know HTML, CSS, JavaScript and React.',
    'HTML, CSS, JavaScript, React',
    'PKR 25,000 - 40,000',
    'Internship',
    null
  ),
  (
    'Node.js Backend Developer',
    'Cloud Systems',
    'Islamabad, Pakistan',
    'Develop backend APIs using Node.js and Express. Experience with PostgreSQL, REST APIs and authentication is required.',
    'Node.js, Express, PostgreSQL, REST API, Authentication',
    'PKR 100,000 - 160,000',
    'Full Time',
    null
  ),
  (
    'Full Stack Intern',
    'Digital Labs',
    'Remote',
    'Work with React, Next.js, Node.js and databases to develop modern web applications. This internship is suitable for final year students and fresh graduates.',
    'React, Next.js, Node.js, PostgreSQL',
    'PKR 30,000 - 50,000',
    'Internship',
    null
  )
on conflict (title, company) do nothing;
