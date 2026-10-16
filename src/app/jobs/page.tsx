import JobsBrowser from "@/app/jobs/JobsBrowser";

type JobsPageProps = {
  searchParams: Promise<{ search?: string | string[] }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const search = Array.isArray(params.search) ? params.search[0] : params.search;

  return <JobsBrowser initialSearch={search ?? ""} />;
}
