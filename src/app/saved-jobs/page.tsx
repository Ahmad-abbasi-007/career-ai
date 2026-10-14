"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase";

type SavedJob = {
  id: string;
  job_id: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    description: string;
    skills: string | null;
    salary: string | null;
    job_type: string | null;
  } | null;
};

export default function SavedJobsPage() {
  const supabase = createClient();

  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSavedJobs = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (isMounted) {
            setError("Please log in to view your saved jobs.");
          }
          return;
        }

        const { data, error: queryError } = await supabase
          .from("saved_jobs")
          .select(
            `
              id,
              job_id,
              created_at,
              jobs (
                id,
                title,
                company,
                location,
                description,
                skills,
                salary,
                job_type
              )
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        if (isMounted) {
          setJobs((data ?? []) as unknown as SavedJob[]);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load saved jobs."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSavedJobs();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function removeJob(savedJobId: string) {
    try {
      setRemovingId(savedJobId);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const { error: deleteError } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("id", savedJobId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setJobs((current) => current.filter((job) => job.id !== savedJobId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove saved job."
      );
    } finally {
      setRemovingId("");
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 pt-20 text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
              Your Bookmarks
            </p>
            <h1 className="mt-2 text-4xl font-bold md:text-5xl">Saved Jobs</h1>
            <p className="mt-3 text-gray-400">
              Revisit the opportunities you want to apply for.
            </p>
          </div>

          <Link
            href="/jobs"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
          >
            Explore Jobs
          </Link>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
            Loading saved jobs...
          </div>
        ) : !error && jobs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">
            <div className="text-5xl">☆</div>
            <h2 className="mt-4 text-2xl font-bold">No saved jobs yet</h2>
            <p className="mt-3 text-gray-400">
              Browse the job marketplace and save roles that match your goals.
            </p>
            <Link
              href="/jobs"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
            >
              Find Jobs
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {jobs.map((saved) => {
              const job = saved.jobs;

              if (!job) return null;

              return (
                <article
                  key={saved.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-blue-500/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{job.title}</h2>
                      <p className="mt-2 text-gray-400">
                        {job.company || "Company not provided"}
                      </p>
                    </div>
                    <span className="text-2xl text-amber-400">★</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    {job.location && (
                      <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                        📍 {job.location}
                      </span>
                    )}
                    {job.job_type && (
                      <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                        💼 {job.job_type}
                      </span>
                    )}
                    {job.salary && (
                      <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                        💰 {job.salary}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 line-clamp-3 leading-7 text-gray-400">
                    {job.description}
                  </p>

                  {job.skills && (
                    <p className="mt-3 text-sm text-gray-300">
                      <span className="font-semibold text-white">Skills:</span>{" "}
                      {job.skills}
                    </p>
                  )}

                  <p className="mt-4 text-xs text-gray-500">
                    Saved on {new Date(saved.created_at).toLocaleDateString()}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700"
                    >
                      View Job
                    </Link>

                    <Link
                      href={`/job-match?jobId=${job.id}`}
                      className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 font-semibold text-purple-300 hover:bg-purple-500/20"
                    >
                      AI Match
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeJob(saved.id)}
                      disabled={removingId === saved.id}
                      className="rounded-lg border border-red-500/40 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      {removingId === saved.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
