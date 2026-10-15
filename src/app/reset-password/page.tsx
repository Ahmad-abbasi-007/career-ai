"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient());
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        (event === "PASSWORD_RECOVERY" ||
          (event === "SIGNED_IN" &&
            (window.location.hash.includes("type=invite") ||
              new URLSearchParams(window.location.search).get("type") ===
                "invite"))) &&
        session
      ) {
        setRecoveryReady(true);
        setLoading(false);
      }
    });

    async function checkRecoverySession() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        setError("Could not verify the password setup link. Request a new one.");
      } else {
        const recoveryLink =
          window.location.hash.includes("type=recovery") ||
          window.location.hash.includes("type=invite") ||
          new URLSearchParams(window.location.search).get("type") ===
            "recovery" ||
          new URLSearchParams(window.location.search).get("type") === "invite" ||
          new URLSearchParams(window.location.search).has("code");
        setRecoveryReady(Boolean(data.session && recoveryLink));
      }
      setLoading(false);
    }

    void checkRecoverySession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(`Could not set the password: ${updateError.message}`);
      } else {
        setPassword("");
        setConfirmPassword("");
        setMessage("Your password is set. You can now sign in to CareerAI.");
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? `Could not set the password: ${updateError.message}`
          : "Could not set the password. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-blue-400">
          CareerAI
        </p>
        <h1 className="mt-3 text-center text-3xl font-bold">
          Set your password
        </h1>
        <p className="mt-3 text-center text-gray-400">
          Choose a private password for your account. The person who invited
          you cannot see it.
        </p>

        {loading ? (
          <p className="mt-8 text-center text-gray-400">
            Verifying your secure link...
          </p>
        ) : !recoveryReady ? (
          <div className="mt-8 space-y-4 text-center">
            <p role="alert" className="text-sm text-amber-200">
              This password setup link is invalid or expired. Request a new
              link from the Login page.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
            >
              Go to Login
            </Link>
          </div>
        ) : message ? (
          <div className="mt-8 space-y-4 text-center">
            <p role="status" className="text-sm text-emerald-300">
              {message}
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving password..." : "Set password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
