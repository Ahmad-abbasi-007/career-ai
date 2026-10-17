"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";

function getDisplayName(user: User) {
  const name = user.user_metadata?.full_name;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : user.email || "CareerAI member";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function AccountMenu() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) {
        if (authError.name === "AuthSessionMissingError") return;
        console.error("Could not load account menu user:", authError);
        setError("Could not load your account.");
        return;
      }
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setOpen(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function positionMenu() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const margin = 12;
      const gap = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = Math.min(
        menu.offsetWidth,
        window.innerWidth - margin * 2
      );
      const naturalHeight = menu.scrollHeight;
      const belowSpace = window.innerHeight - triggerRect.bottom - gap - margin;
      const aboveSpace = triggerRect.top - gap - margin;
      const placeBelow =
        naturalHeight <= belowSpace || belowSpace >= aboveSpace;
      const availableHeight = Math.max(
        80,
        placeBelow ? belowSpace : aboveSpace
      );
      const menuHeight = Math.min(naturalHeight, availableHeight);
      const left = Math.max(
        margin,
        Math.min(
          triggerRect.right - menuWidth,
          window.innerWidth - menuWidth - margin
        )
      );
      const top = placeBelow
        ? triggerRect.bottom + gap
        : triggerRect.top - gap - menuHeight;

      setMenuPosition({ left, top, maxHeight: availableHeight });
    }

    const frame = window.requestAnimationFrame(positionMenu);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open, error]);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error("Could not log out:", logoutError);
      setError("Could not log out. Please try again.");
      setLoggingOut(false);
      return;
    }

    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  if (!user) return null;

  const displayName = getDisplayName(user);

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <NotificationBell />
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setError("");
          setMenuPosition(null);
          setOpen((current) => !current);
        }}
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 pr-3 text-left transition hover:border-blue-400/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-950/40">
          {getInitials(displayName)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium text-gray-200 sm:block">
          {displayName}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account menu"
            className="fixed z-[100] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-gray-900 p-2 shadow-2xl shadow-black/40"
            style={{
              left: menuPosition?.left ?? 12,
              top: menuPosition?.top ?? 12,
              maxHeight: menuPosition?.maxHeight ?? "calc(100dvh - 1.5rem)",
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            <div className="border-b border-white/10 px-3 py-3">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
              {user.email && (
                <p className="mt-1 truncate text-xs text-gray-400">{user.email}</p>
              )}
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-200 transition hover:bg-white/5 hover:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4 text-gray-400">
                  <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 17c.4-2.7 2.5-4 6-4s5.6 1.3 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Profile
              </Link>
            </div>

            {error && (
              <p role="alert" className="mx-2 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="border-t border-white/10 pt-1">
              <button
                type="button"
                role="menuitem"
                disabled={loggingOut}
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                  <path d="M8 3.5H4.5v13H8m3-3 3-3-3-3m3 3H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {loggingOut ? "Signing out..." : "Log out"}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
