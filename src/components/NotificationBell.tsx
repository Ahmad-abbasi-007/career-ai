"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type NotificationRecord = {
  id: string;
  notification_type: "new_application" | "application_status";
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export default function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    const [listResult, unreadResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, notification_type, title, message, created_at, read_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null),
    ]);

    if (listResult.error || unreadResult.error) {
      const failed = listResult.error || unreadResult.error;
      setError(
        `Notifications could not be loaded: ${failed?.message || "database error"}`
      );
      return;
    }

    setNotifications((listResult.data ?? []) as NotificationRecord[]);
    setUnreadCount(unreadResult.count ?? 0);
    setError("");
  }, [supabase, userId]);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) {
        setUserId(null);
        setRole(null);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!active) return;
      if (roleError) {
        console.error("Could not verify notification account role:", roleError);
        setError("Could not verify your account for notifications.");
        return;
      }
      setUserId(data.user.id);
      setRole(
        roleData?.status === "active" &&
          (roleData.role === "student" || roleData.role === "recruiter")
          ? roleData.role
          : null
      );
    }

    void loadAccount();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUserId(null);
        setRole(null);
        setNotifications([]);
        setUnreadCount(0);
      } else {
        void loadAccount();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId || !role) return;
    const initialLoad = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    const interval = window.setInterval(() => void loadNotifications(), 30_000);
    const handleFocus = () => void loadNotifications();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications, role, userId]);

  async function markRead(notificationId: string) {
    const timestamp = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: timestamp })
      .eq("id", notificationId)
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (updateError) {
      console.error("Could not mark notification as read:", updateError);
      setError(`Could not mark notification as read: ${updateError.message}`);
      return;
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read_at: timestamp } : item
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    if (!userId || unreadCount === 0) return;
    setUpdating(true);
    const timestamp = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: timestamp })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (updateError) {
      console.error("Could not mark all notifications as read:", updateError);
      setError(`Could not update notifications: ${updateError.message}`);
    } else {
      setNotifications((current) =>
        current.map((item) =>
          item.read_at ? item : { ...item, read_at: timestamp }
        )
      );
      setUnreadCount(0);
      setError("");
    }
    setUpdating(false);
  }

  if (!userId || !role) return null;

  const destination =
    role === "recruiter" ? "/recruiter/applications" : "/applications";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setError("");
        }}
        className="relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
          <path
            d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-[70] mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/50"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="font-semibold text-white">Notifications</h2>
              <p className="text-xs text-gray-400">
                {unreadCount ? `${unreadCount} unread` : "You are all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={updating}
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-blue-300 hover:text-blue-200 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {error}
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              !error && (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  No notifications yet.
                </p>
              )
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={destination}
                  onClick={() => {
                    setOpen(false);
                    if (!notification.read_at) void markRead(notification.id);
                  }}
                  className={`block border-b border-white/5 px-4 py-3 transition hover:bg-white/5 ${
                    notification.read_at ? "opacity-70" : "bg-blue-500/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read_at && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-400" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-gray-300">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
