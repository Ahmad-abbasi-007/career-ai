
"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      const user = data.user;

      if (!user) {
        await supabase.auth.signOut();
        setError("Unable to verify your account. Please try again.");
        return;
      }

      const { data: roleRecord, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError || !roleRecord) {
        await supabase.auth.signOut();
        setError(
          "We could not verify your account role. Please contact support."
        );
        return;
      }

      if (roleRecord.status !== "active") {
        await supabase.auth.signOut();

        if (roleRecord.role === "recruiter" && roleRecord.status === "pending") {
          setError("Your recruiter account is awaiting Super Admin approval.");
        } else if (roleRecord.status === "rejected") {
          setError(
            "Your account request was rejected. Please contact support."
          );
        } else if (roleRecord.status === "suspended") {
          setError("Your account is suspended. Please contact support.");
        } else if (roleRecord.status === "pending") {
          setError("Your account is awaiting approval.");
        } else {
          setError("Your account does not have active access.");
        }

        return;
      }

      switch (roleRecord.role) {
        case "super_admin":
          router.replace("/super-admin/dashboard");
          break;

        case "recruiter":
          router.replace("/recruiter/dashboard");
          break;

        case "student":
          router.replace("/dashboard");
          break;

        default:
          await supabase.auth.signOut();
          setError("Your account role is invalid. Please contact support.");
          return;
      }

      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            CareerAI
          </p>

          <h1 className="mt-3 text-3xl font-bold">Welcome Back</h1>

          <p className="mt-3 text-gray-400">
            Login to your CareerAI account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying account..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            Create Account
          </Link>
        </p>
      </div>
    </main>
  );
}
