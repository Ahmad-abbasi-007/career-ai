"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import type { Job } from "@/types";

export default function JobsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All");
  const [jobType, setJobType] = useState("All");

  useEffect(() => {
    async function loadJobs() {
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

        const { data, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false });

        if (jobsError) {
          throw jobsError;
        }

        setJobs(data ?? []);
      } catch (err) {
        console.error("Could not load jobs:", err);
        setError(err instanceof Error ? err.message : "Could not load jobs.");
      } finally {
        setLoading(false);
      }
    }

    void loadJobs();
  }, [router, supabase]);

  const locations = useMemo(() => {
    const values = jobs
      .map((job) => job.location)
      .filter(Boolean) as string[];

    return ["All", ...Array.from(new Set(values))];
  }, [jobs]);

  const jobTypes = useMemo(() => {
    const values = jobs
      .map((job) => job.job_type)
      .filter(Boolean) as string[];

    return ["All", ...Array.from(new Set(values))];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return jobs.filter((job) => {
      const searchableText = `
        ${job.title || ""}
        ${job.company || ""}
        ${job.location || ""}
        ${job.description || ""}
        ${job.skills || ""}
      `.toLowerCase();

      const matchesSearch =
        !searchValue ||
        searchableText.includes(searchValue);

      const matchesLocation =
        location === "All" ||
        job.location === location;

      const matchesJobType =
        jobType === "All" ||
        job.job_type === jobType;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesJobType
      );
    });
  }, [jobs, search, location, jobType]);

  function clearFilters() {
    setSearch("");
    setLocation("All");
    setJobType("All");
  }

  return (
    <main className="min-h-screen bg-gray-950 pt-20 text-white">
      <Navbar />
      {/* Header */}

      <section className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            💼 CareerAI Jobs
          </div>

          <h1 className="mt-5 text-4xl font-bold md:text-5xl">
            Find Your Next Job
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-gray-400">
            Search thousands of opportunities and use
            AI to discover how well your skills match.
          </p>
        </div>
      </section>

      {/* Search */}

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-gray-400">
                Search Jobs
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search React, Developer, Next.js..."
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Location */}

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Location
              </label>

              <select
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Type */}

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Job Type
              </label>

              <select
                value={jobType}
                onChange={(e) =>
                  setJobType(e.target.value)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                {jobTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {filteredJobs.length}
              </span>{" "}
              jobs
            </p>

            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* Jobs */}

      <section className="mx-auto max-w-7xl px-6 pb-16">
        {loading && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
            <p className="text-gray-400">
              Loading jobs...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
            ❌ {error}
          </div>
        )}

        {!loading &&
          !error &&
          filteredJobs.length === 0 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
              <div className="text-5xl">🔎</div>

              <h2 className="mt-5 text-2xl font-bold">
                No Jobs Found
              </h2>

              <p className="mt-2 text-gray-400">
                Try changing your search or filters.
              </p>

              <button
                onClick={clearFilters}
                className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
              >
                Reset Filters
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          filteredJobs.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:-translate-y-1 hover:border-blue-500/50"
                >
                  {/* Company */}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        {job.title}
                      </h2>

                      <p className="mt-1 text-blue-400">
                        {job.company ||
                          "Company not provided"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-xl">
                      💼
                    </div>
                  </div>

                  {/* Location */}

                  <div className="mt-5 flex flex-wrap gap-2 text-sm">
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
                  </div>

                  {/* Description */}

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-400">
                    {job.description}
                  </p>

                  {/* Skills */}

                  {job.skills && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {job.skills
                        .split(",")
                        .slice(0, 5)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Salary */}

                  {job.salary && (
                    <p className="mt-5 font-semibold text-green-400">
                      💰 {job.salary}
                    </p>
                  )}

                  {/* Buttons */}

                  <div className="mt-auto flex gap-3 pt-6">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold hover:bg-blue-700"
                    >
                      View Details
                    </Link>

                    <Link
                      href={`/job-match?jobId=${job.id}`}
                      className="rounded-lg border border-gray-700 px-4 py-3 text-center text-sm font-semibold hover:bg-gray-800"
                    >
                      🎯 AI
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
    </main>
  );
}