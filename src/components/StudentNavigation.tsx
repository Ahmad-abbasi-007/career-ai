"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

const links = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/jobs", label: "Jobs", icon: "💼" },
  { href: "/job-match", label: "AI Job Match", icon: "✦" },
  { href: "/interview", label: "AI Interview", icon: "◎" },
  { href: "/applications", label: "Applications", icon: "▤" },
  { href: "/saved-jobs", label: "Saved Jobs", icon: "♡" },
  { href: "/alerts", label: "Job Alerts", icon: "◉" },
  { href: "/resume", label: "Resume", icon: "▧" },
  { href: "/profile", label: "Profile", icon: "◌" },
];

export default function StudentNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [student, setStudent] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRole(userId: string | undefined) {
      if (!userId) {
        if (active) setStudent(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Could not load student navigation role:", error);
        setStudent(false);
        return;
      }
      setStudent(data?.role === "student" && data.status === "active");
    }

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error && error.name !== "AuthSessionMissingError") {
        console.error("Could not load navigation account:", error);
      }
      void checkRole(data.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void checkRole(session?.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!student) return <>{children}</>;

  const pageHasAccountMenu = ["/dashboard", "/profile", "/resume"].includes(
    pathname
  );
  const navigationLinks = (
    <>
      {links.map((link) => {
        const selected =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            aria-current={selected ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              selected
                ? "bg-blue-600/15 text-blue-300 ring-1 ring-blue-500/20"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span aria-hidden="true" className="w-5 text-center text-base">
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
      <div className="my-2 border-t border-white/10" />
      <Link
        href="/#features"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <span aria-hidden="true" className="w-5 text-center">✧</span>
        Features
      </Link>
      <Link
        href="/#about"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <span aria-hidden="true" className="w-5 text-center">ⓘ</span>
        About CareerAI
      </Link>
    </>
  );

  return (
    <div className="min-h-screen pt-16 lg:pl-64 lg:pt-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-gray-950 px-4 py-6 lg:flex">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 text-2xl font-bold"
        >
          <Image
            src="/logo.png"
            alt=""
            width={48}
            height={48}
            className="size-11 rounded-lg bg-[#424242] object-contain"
          />
          <span>
            Career<span className="text-blue-500">AI</span>
          </span>
        </Link>
        <p className="mb-5 mt-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Student workspace
        </p>
        <nav aria-label="Student navigation" className="flex-1 space-y-1 overflow-y-auto">
          {navigationLinks}
        </nav>
        {!pageHasAccountMenu && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <AccountMenu />
          </div>
        )}
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-gray-950/95 px-4 backdrop-blur lg:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="size-9 rounded-lg bg-[#424242] object-contain"
          />
          <span>
            Career<span className="text-blue-500">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {!pageHasAccountMenu && <AccountMenu />}
          <button
            type="button"
            aria-label={mobileOpen ? "Close student navigation" : "Open student navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg border border-white/10 px-3 py-2 text-white hover:bg-white/5"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <nav
          aria-label="Student navigation"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-white/10 bg-gray-950 p-4 lg:hidden"
        >
          <div className="space-y-1">{navigationLinks}</div>
        </nav>
      )}

      {children}
    </div>
  );
}
