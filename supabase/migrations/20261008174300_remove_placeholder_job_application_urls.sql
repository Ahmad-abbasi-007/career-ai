update public.jobs
set application_url = null
where application_url ~* '^https?://(www\.)?example\.com(/|$)';
