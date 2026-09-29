"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        Loading...
      </main>
    );
  }

  if (!user) {
    router.push("/login");

    return null;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Welcome back
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              {user.name || "CareerAI User"}
            </h1>

            <p className="mt-2 text-gray-400">
              {user.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/10 px-5 py-3 hover:bg-white/10"
          >
            Logout
          </button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">
              📄 Resume
            </h2>

            <p className="mt-2 text-gray-400">
              Upload and analyze your resume.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">
              🤖 AI Job Matches
            </h2>

            <p className="mt-2 text-gray-400">
              Find jobs matching your skills.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">
              🎯 Interviews
            </h2>

            <p className="mt-2 text-gray-400">
              Prepare for interviews with AI.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}