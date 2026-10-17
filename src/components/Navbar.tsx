"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

export default function Navbar() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!user) {
        setStudent(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Could not load navigation account role:", error);
        setStudent(false);
        return;
      }
      setStudent(data?.role === "student" && data.status === "active");
    }

    void loadRole();
    return () => {
      active = false;
    };
  }, [supabase, user]);

  if (student) return null;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link
          href="/"
          aria-label="CareerAI home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <Image
            src="/logo.png"
            alt=""
            width={48}
            height={48}
            priority
            className="size-11 rounded-lg bg-[#424242] object-contain"
          />
          <span className="text-xl font-bold sm:text-2xl">
            Career<span className="text-blue-500">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:text-white"
          >
            Browse jobs
          </Link>
          <Link
            href="/#contact"
            className="hidden rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:text-white sm:block"
          >
            Contact
          </Link>
          {authReady &&
            (user ? (
              <AccountMenu />
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
    </nav>
  );
}