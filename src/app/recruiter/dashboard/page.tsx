
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

type RecruiterRequest = {
  full_name: string | null;
  company_name: string;
  work_email: string;
  website: string | null;
  company_details: string | null;
  status: "pending" | "approved" | "rejected";
};

export default function RecruiterDashboard() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<RecruiterRequest | null>(null);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (roleError) {
        setError("Could not verify your account. Please try again.");
        return;
      }

      if (!role || role.role !== "recruiter") {
        if (role?.role === "super_admin") {
          router.replace("/super-admin/dashboard");
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      if (role.status !== "active") {
        setError(
          role.status === "pending"
            ? "Your recruiter account is awaiting Super Admin approval."
            : "Your recruiter account is not active. Please contact the administrator."
        );
        return;
      }

      const { data: request, error: requestError } = await supabase
        .from("recruiter_requests")
        .select(
          "full_name, company_name, work_email, website, company_details, status"
        )
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (requestError) {
        setError("Could not load company details: " + requestError.message);
        return;
      }

      setCompany(request);
    } catch {
      setError("Something went wrong. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    async function initialize() {
      await loadDashboard();
    }

    void initialize();
  }, [loadDashboard]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading recruiter dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              CareerAI · Recruiter Portal
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Recruiter Dashboard
            </h1>
            <p className="mt-2 text-gray-400">
              Manage your company and recruitment activities.
            </p>
          </div>

          <AccountMenu />
        </header>

        {error && (
          <section
            role="alert"
            className="mt-6 rounded-xl border border-amber-700 bg-amber-950/40 p-5"
          >
            <h2 className="font-semibold text-amber-300">
              Account Information
            </h2>
            <p className="mt-2 text-sm text-amber-100">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                void loadDashboard();
              }}
              className="mt-4 rounded-lg border border-amber-700 px-4 py-2 hover:bg-amber-900/50"
            >
              Try Again
            </button>
          </section>
        )}

        {company && !error && (
          <>
            <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-400">Your Company</p>
                  <h2 className="mt-2 text-2xl font-bold">
                    {company.company_name}
                  </h2>
                  <p className="mt-2 text-gray-300">
                    {company.full_name || "Recruiter"} · {company.work_email}
                  </p>
                </div>

                <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  Approved Recruiter
                </span>
              </div>

              {company.website && (
                <p className="mt-4 break-all text-sm text-indigo-300">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {company.website}
                  </a>
                </p>
              )}

              {company.company_details && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                  {company.company_details}
                </p>
              )}
            </section>

            <section className="mt-8">
              <h2 className="mb-5 text-xl font-bold">Recruitment Management</h2>

              <div className="grid gap-5 md:grid-cols-2">
                <article className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                  <div className="text-3xl">💼</div>
                  <h3 className="mt-4 text-xl font-semibold">Manage Jobs</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Create job listings and manage vacancies for your company.
                  </p>
                  <Link
                    href="/recruiter/jobs"
                    className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
                  >
                    Open My Jobs →
                  </Link>
                </article>

                <article className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                  <div className="text-3xl">👥</div>
                  <h3 className="mt-4 text-xl font-semibold">
                    Manage Applicants
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Review applications and update applicant statuses.
                  </p>
                  <Link
                    href="/recruiter/applications"
                    className="mt-5 inline-block rounded-lg border border-gray-700 px-5 py-3 font-semibold hover:bg-gray-800"
                  >
                    View Applicants →
                  </Link>
                </article>
              </div>
            </section>
          </>
        )}

        {!company && !error && (
          <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold">Company details unavailable</h2>
            <p className="mt-2 text-gray-400">
              Your recruiter account is active, but no company request was found.
              Contact the Super Admin to check your account record.
            </p>
          </section>
        )}

        <footer className="mt-12 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">
          CareerAI Recruiter Portal
        </footer>
      </div>
    </main>
  );
}
