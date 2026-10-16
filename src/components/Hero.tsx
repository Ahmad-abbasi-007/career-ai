"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function searchJobs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/jobs?search=${encodeURIComponent(query)}` : "/jobs");
  }

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-36 sm:pb-24 sm:pt-40">
      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
          Career opportunities, all in one place
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Find work that moves
          <span className="block text-blue-500">your career forward.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
          Explore opportunities from trusted employers, compare roles, and take
          the next step in your career.
        </p>

        <form
          onSubmit={searchJobs}
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="home-job-search">
            Search jobs by title, company, or skills
          </label>
          <input
            id="home-job-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Job title, company, or skills"
            className="flex-1 rounded-xl bg-gray-900 px-5 py-3 text-white outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
          >
            Search jobs
          </button>
        </form>

        <div className="mt-7 flex flex-wrap justify-center gap-4">
          <Link
            href="/jobs"
            className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/10"
          >
            Browse all jobs
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-gray-950 hover:bg-gray-200"
          >
            Create a free account
          </Link>
        </div>
      </div>
    </section>
  );
}
