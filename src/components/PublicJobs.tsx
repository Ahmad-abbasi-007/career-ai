"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Job } from "@/types";

export default function PublicJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRecentJobs() {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("jobs")
        .select(
          "id, title, company, location, description, skills, salary, job_type"
        )
        .order("created_at", { ascending: false })
        .limit(3);

      if (!active) return;
      if (queryError) {
        setError("Job listings are temporarily unavailable. Please try again later.");
      } else {
        setJobs((data ?? []) as Job[]);
      }
      setLoading(false);
    }

    void loadRecentJobs();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="jobs" className="scroll-mt-20 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Start exploring
            </p>
            <h2 className="mt-2 text-3xl font-bold">Latest opportunities</h2>
            <p className="mt-3 text-gray-400">
              Browse jobs first. Sign in only when you&apos;re ready to apply.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex w-fit items-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-blue-400/50 hover:bg-white/5"
          >
            View all jobs →
          </Link>
        </div>

        {loading && (
          <p role="status" className="mt-8 text-gray-400">
            Loading opportunities...
          </p>
        )}
        {error && (
          <p role="alert" className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </p>
        )}
        {!loading && !error && jobs.length === 0 && (
          <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-gray-400">
            There are no open jobs yet. Please check back soon.
          </p>
        )}

        {jobs.length > 0 && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40"
              >
                <p className="text-sm font-medium text-blue-300">
                  {job.company || "Company not provided"}
                </p>
                <h3 className="mt-2 text-xl font-bold text-white">{job.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-400">
                  {job.location && (
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      {job.location}
                    </span>
                  )}
                  {job.job_type && (
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      {job.job_type}
                    </span>
                  )}
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
                  {job.description}
                </p>
                <Link
                  href={`/jobs/${job.id}`}
                  className="mt-auto pt-6 text-sm font-semibold text-blue-300 hover:text-blue-200"
                >
                  View job details →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
