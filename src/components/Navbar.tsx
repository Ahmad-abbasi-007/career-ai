"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
      setAuthError("");
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    setAuthError("");

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError("Could not log out. Please try again.");
      console.error("Could not log out:", error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link href="/" className="text-2xl font-bold">
          Career<span className="text-blue-500">AI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-gray-300 hover:text-white">
            Home
          </Link>

          <Link href="/jobs" className="text-gray-300 hover:text-white">
            Jobs
          </Link>

          <Link href="/job-match" className="text-gray-300 hover:text-white">
            AI Job Match
          </Link>

          <Link href="/interview" className="text-gray-300 hover:text-white">
            AI Interview
          </Link>

          <Link href="/applications" className="text-gray-300 hover:text-white">
            Applications
          </Link>

          <Link href="/saved-jobs" className="text-gray-300 hover:text-white">
            Saved Jobs
          </Link>

          <Link href="/alerts" className="text-gray-300 hover:text-white">
            Job Alerts
          </Link>

          <Link href="#features" className="text-gray-300 hover:text-white">
            Features
          </Link>

          <Link href="#about" className="text-gray-300 hover:text-white">
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {authReady &&
            (user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg px-4 py-2 text-gray-300 hover:text-white"
                >
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-lg px-4 py-2 text-gray-300 hover:text-white sm:block"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </>
            ))}
        </div>

      </div>
      {authError && (
        <p role="alert" className="absolute right-6 top-full rounded-b-lg bg-red-950 px-4 py-2 text-sm text-red-300">
          {authError}
        </p>
      )}
    </nav>
  );
}