"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ApplyButton from "@/components/ApplyButton";
import { createClient } from "@/lib/supabase";
import type { Job } from "@/types";

type JobDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function getExternalApplicationUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.hostname === "example.com" ||
      url.hostname.endsWith(".example.com")
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function JobDetailsPage({ params }: JobDetailsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error: jobError } = await supabase
          .from("jobs")
          .select(
            "id, title, company, location, description, skills, salary, job_type, application_url"
          )
          .eq("id", id)
          .maybeSingle<Job>();

        if (jobError) {
          throw jobError;
        }

        if (!cancelled) {
          setJob(data);
          if (!data) {
            setError("This job does not exist or has been removed.");
          }
        }
      } catch (err) {
        console.error("Could not load job details:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load job details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadJob();
    return () => {
      cancelled = true;
    };
  }, [id, router, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 pt-20 text-white">
        <Navbar />
        <p className="mx-auto max-w-5xl px-6 py-16 text-gray-400">
          Loading job details...
        </p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-950 pt-20 text-white">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="text-6xl">😕</div>
          <h1 className="mt-6 text-3xl font-bold">Job Not Found</h1>
          <p className="mt-3 text-gray-400">
            {error || "The job you are looking for does not exist."}
          </p>
          <Link
            href="/jobs"
            className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
          >
            ← Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  const skills = job.skills
    ? job.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
    : [];
  const applicationUrl = getExternalApplicationUrl(job.application_url);

  return (
    <main className="min-h-screen bg-gray-950 pt-20 text-white">
      <Navbar />
      <section className="border-b border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Link
            href="/jobs"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Jobs
          </Link>

          <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
                💼 Job Opportunity
              </div>
              <h1 className="text-4xl font-bold md:text-5xl">{job.title}</h1>
              <p className="mt-4 text-xl text-blue-400">
                {job.company || "Company not provided"}
              </p>
            </div>
            <div className="flex items-start">
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-4">
                <p className="text-sm text-gray-500">Job Type</p>
                <p className="mt-1 font-semibold">{job.job_type || "Not specified"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <h2 className="text-2xl font-bold">Job Description</h2>
              <div className="mt-6 whitespace-pre-line leading-8 text-gray-300">
                {job.description}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <h2 className="text-2xl font-bold">Required Skills</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {skills.length > 0 ? (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-400">No specific skills listed.</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <ApplyButton jobId={job.id} />

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-xl font-bold">Job Information</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="mt-1">📍 {job.location || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Salary</p>
                  <p className="mt-1 text-green-400">💰 {job.salary || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Job Type</p>
                  <p className="mt-1">💼 {job.job_type || "Not specified"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
              <div className="text-3xl">🤖</div>
              <h2 className="mt-4 text-xl font-bold">AI Job Match</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Let CareerAI compare your profile with this job and calculate your match score.
              </p>
              <Link
                href={`/job-match?jobId=${encodeURIComponent(job.id)}`}
                className="mt-5 block rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-700"
              >
                🎯 Check My Match
              </Link>
            </div>

            {applicationUrl ? (
              <a
                href={applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-700 bg-gray-900 px-5 py-4 text-center font-semibold hover:bg-gray-800"
              >
                Apply for Job ↗
              </a>
            ) : (
              <p className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-4 text-center text-sm text-gray-400">
                No external application link is available for this listing.
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
