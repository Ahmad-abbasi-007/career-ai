
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Stats = {
  students: number | null;
  recruiters: number | null;
  pendingRecruiters: number | null;
  approvedRecruiters: number | null;
  jobs: number | null;
  applications: number | null;
};

const initialStats: Stats = {
  students: null,
  recruiters: null,
  pendingRecruiters: null,
  approvedRecruiters: null,
  jobs: null,
  applications: null,
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setAuthorized(false);
        setError("Please log in with your Super Admin account.");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (adminError || !admin) {
        setAuthorized(false);
        setError("Access denied. Super Admin permission is required.");
        return;
      }

      setAuthorized(true);

      const [
        studentsResult,
        recruitersResult,
        pendingResult,
        approvedResult,
        jobsResult,
        applicationsResult,
      ] = await Promise.all([
        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student")
          .eq("status", "active"),

        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "recruiter"),

        supabase
          .from("recruiter_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("recruiter_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),

        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("applications")
          .select("*", { count: "exact", head: true }),
      ]);

      setStats({
        students: studentsResult.error ? null : studentsResult.count,
        recruiters: recruitersResult.error ? null : recruitersResult.count,
        pendingRecruiters: pendingResult.error ? null : pendingResult.count,
        approvedRecruiters: approvedResult.error ? null : approvedResult.count,
        jobs: jobsResult.error ? null : jobsResult.count,
        applications: applicationsResult.error
          ? null
          : applicationsResult.count,
      });

      const failedQueries = [
        studentsResult,
        recruitersResult,
        pendingResult,
        approvedResult,
        jobsResult,
        applicationsResult,
      ].filter((result) => result.error);

      if (failedQueries.length > 0) {
        setError(
          "Some statistics could not load. Check your table names and Supabase permissions."
        );
      }
    } catch {
      setError("Something went wrong while loading the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const cards = [
    {
      title: "Active Students",
      value: stats.students,
      icon: "🎓",
      color: "border-blue-500",
    },
    {
      title: "Recruiter Accounts",
      value: stats.recruiters,
      icon: "🏢",
      color: "border-purple-500",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRecruiters,
      icon: "⏳",
      color: "border-yellow-500",
    },
    {
      title: "Approved Recruiters",
      value: stats.approvedRecruiters,
      icon: "✅",
      color: "border-green-500",
    },
    {
      title: "Total Jobs",
      value: stats.jobs,
      icon: "💼",
      color: "border-pink-500",
    },
    {
      title: "Applications",
      value: stats.applications,
      icon: "📄",
      color: "border-cyan-500",
    },
  ];

  const managementLinks = [
    {
      title: "Recruiter Management",
      description: "Review, approve or reject recruiter requests.",
      href: "/admin/recruiters",
      icon: "🏢",
    },
    {
      title: "Jobs Management",
      description: "View and manage platform job listings.",
      href: "/admin/jobs",
      icon: "💼",
    },
    {
      title: "Student Dashboard",
      description: "Open the main CareerAI dashboard.",
      href: "/dashboard",
      icon: "🎓",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 border-b border-gray-800 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              CareerAI Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Super Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Manage recruiters, students, companies, and jobs.
            </p>
          </div>

          <button
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh Data"}
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-200"
          >
            {error}
          </div>
        )}

        {!authorized && !loading ? (
          <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-xl font-semibold">Dashboard unavailable</h2>
            <p className="mt-2 text-gray-400">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
            >
              Go to Login
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Platform Overview</h2>
                <span className="text-sm text-gray-500">
                  {loading ? "Loading statistics..." : "Latest available data"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.title}
                    className={`rounded-xl border border-gray-800 border-l-4 ${card.color} bg-gray-900 p-6 shadow-lg`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400">{card.title}</p>
                      <span className="text-2xl">{card.icon}</span>
                    </div>

                    <p className="mt-4 text-3xl font-bold">
                      {loading
                        ? "..."
                        : card.value === null
                          ? "—"
                          : card.value}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="mb-5 text-xl font-bold">Management</h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {managementLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500 hover:bg-gray-900/80"
                  >
                    <span className="text-3xl">{item.icon}</span>

                    <h3 className="mt-4 text-lg font-semibold group-hover:text-indigo-400">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {item.description}
                    </p>

                    <p className="mt-5 text-sm font-semibold text-indigo-400">
                      Open Management →
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <footer className="mt-12 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">
              CareerAI © {new Date().getFullYear()} · Super Admin Panel
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
