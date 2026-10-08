"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
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

          <div className="flex gap-3">

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

        {/* Cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">

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

          {/* Interview */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/50">
            <div className="text-4xl">
              🎤
            </div>

            <h2 className="mt-4 text-xl font-bold">
              AI Interviews
            </h2>

            <p className="mt-3 text-gray-400">
              Prepare for interviews using AI.
            </p>

            <button className="mt-5 text-sm font-semibold text-blue-400 hover:text-blue-300">
              Coming Soon →
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