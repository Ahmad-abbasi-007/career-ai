"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type UserRole = "student" | "recruiter" | "super_admin";

function isUserRole(role: string): role is UserRole {
  return role === "student" || role === "recruiter" || role === "super_admin";
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: roleRecord, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError || !roleRecord) {
        console.error("Could not load account role:", roleError);
        setAccountError("Could not verify your account permissions.");
        return;
      }

      if (roleRecord.status !== "active") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!isUserRole(roleRecord.role)) {
        setAccountError("Your account has an invalid role configuration.");
        return;
      }

      setRole(roleRecord.role);
    }

    getUser();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              Welcome to{" "}
              <span className="text-blue-500">
                CareerAI
              </span>
            </h1>

            <p className="mt-2 text-gray-400">
              Hello,{" "}
              {user.user_metadata?.full_name || user.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {role === "super_admin" && (
              <>
                <button
                  onClick={() => router.push("/admin/recruiters")}
                  className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500"
                >
                  Recruiter Requests
                </button>
                <button
                  onClick={() => router.push("/admin/jobs")}
                  className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-700"
                >
                  Manage Jobs
                </button>
              </>
            )}

            <button
              onClick={() => router.push("/profile")}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
            >
              My Profile
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {accountError && (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-red-950 p-4 text-red-300"
          >
            {accountError}
          </p>
        )}

        {role === "recruiter" && (
          <div className="mt-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
              Approved Recruiter
            </p>
            <h2 className="mt-2 text-xl font-bold">Welcome to CareerAI</h2>
            <p className="mt-2 text-gray-400">
              Your recruiter account is active. Recruiter job and applicant
              management will be available from this account.
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          {/* Resume */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/50">
  <div className="text-4xl">
    📄
  </div>

  <h2 className="mt-4 text-xl font-bold">
    Resume
  </h2>

  <p className="mt-3 text-gray-400">
    Upload and manage your resume for AI analysis.
  </p>

  <button
    onClick={() => router.push("/resume")}
    className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
  >
    Manage Resume →
  </button>
</div>

          {/* Job Matching */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/50">
            <div className="text-4xl">
              🎯
            </div>

            <h2 className="mt-4 text-xl font-bold">
              Job Matching
            </h2>

            <p className="mt-3 text-gray-400">
              Compare your profile with any job description using AI.
            </p>

            <button
              onClick={() => router.push("/job-match")}
              className="mt-5 text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              Analyze Job Match →
            </button>
          </div>

          {/* Application Tracker */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/50">
            <div className="text-4xl">📋</div>

            <h2 className="mt-4 text-xl font-bold">
              Application Tracker
            </h2>

            <p className="mt-3 text-gray-400">
              Track applications from Applied to Interview, Offer, or Rejected.
            </p>

            <button
              onClick={() => router.push("/applications")}
              className="mt-5 text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              View Applications →
            </button>
          </div>

          {/* Interview Coach */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-500/50">
            <div className="text-4xl">🤖</div>

            <h2 className="mt-4 text-xl font-bold">AI Interview Coach</h2>

            <p className="mt-3 text-gray-400">
              Practice technical, behavioral and HR questions with
              AI-powered feedback.
            </p>

            <button
              onClick={() => router.push("/interview")}
              className="mt-5 text-sm font-semibold text-purple-400 hover:text-purple-300"
            >
              Start Interview Practice →
            </button>
          </div>

        </div>

        {/* Profile Section */}
        <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">

          <h2 className="text-xl font-bold">
            Complete Your CareerAI Profile
          </h2>

          <p className="mt-2 text-gray-400">
            Add your skills, education and experience so CareerAI
            can provide better job recommendations.
          </p>

          <button
            onClick={() => router.push("/profile")}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
          >
            Complete Profile
          </button>

        </div>

      </div>
    </main>
  );
}