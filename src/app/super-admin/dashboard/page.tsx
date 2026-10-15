
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

type Stats = {
  students: number | null;
  recruiters: number | null;
  pendingRecruiters: number | null;
  approvedRecruiters: number | null;
  jobs: number | null;
  applications: number | null;
};

type SuperAdminMember = {
  user_id: string;
  is_primary: boolean;
  email: string | null;
  full_name: string | null;
};

const initialStats: Stats = {
  students: null,
  recruiters: null,
  pendingRecruiters: null,
  approvedRecruiters: null,
  jobs: null,
  applications: null,
};

export default function SuperAdminDashboard() {
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminMember[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setAuthorized(false);
        setError("Please log in with your Super Admin account.");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (adminError || !admin) {
        setAuthorized(false);
        setError("Access denied. Super Admin permission is required.");
        return;
      }

      setAuthorized(true);
      const primaryAdmin = authData.user.email?.toLowerCase() ===
        "ar3359499@gmail.com";
      setIsPrimaryAdmin(primaryAdmin);

      const { data: adminRecords, error: adminListError } = await supabase
        .from("super_admins")
        .select("user_id");

      if (adminListError) {
        setSuperAdmins([]);
        setAdminError(
          `Could not load the Super Admin list (${adminListError.code || "database error"}): ${adminListError.message}. You can still add an account below.`
        );
      } else {
        const adminIds = (adminRecords ?? []).map((record) => record.user_id);
        const { data: profiles, error: profilesError } = adminIds.length
          ? await supabase
              .from("profiles")
              .select("id, email, full_name")
              .in("id", adminIds)
          : { data: [], error: null };

        if (profilesError) {
          setAdminError(
            `Could not load administrator profile details (${profilesError.code || "database error"}): ${profilesError.message}.`
          );
        } else {
          const profileById = new Map(
            (profiles ?? []).map((profile) => [profile.id, profile])
          );
          setSuperAdmins(
            (adminRecords ?? []).map((record) => {
              const profile = profileById.get(record.user_id);
              return {
                user_id: record.user_id,
                is_primary:
                  (primaryAdmin && record.user_id === authData.user.id) ||
                  profile?.email?.toLowerCase() === "ar3359499@gmail.com",
                email: profile?.email ?? null,
                full_name: profile?.full_name ?? null,
              };
            })
          );
          setAdminError("");
        }
      }

      const [
        studentsResult,
        recruitersResult,
        pendingResult,
        approvedResult,
        jobsResult,
        applicationsResult,
      ] = await Promise.all([
        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student")
          .eq("status", "active"),

        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "recruiter"),

        supabase
          .from("recruiter_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("recruiter_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),

        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("applications")
          .select("*", { count: "exact", head: true }),
      ]);

      setStats({
        students: studentsResult.error ? null : studentsResult.count,
        recruiters: recruitersResult.error ? null : recruitersResult.count,
        pendingRecruiters: pendingResult.error ? null : pendingResult.count,
        approvedRecruiters: approvedResult.error ? null : approvedResult.count,
        jobs: jobsResult.error ? null : jobsResult.count,
        applications: applicationsResult.error
          ? null
          : applicationsResult.count,
      });

      const failedQueries = [
        studentsResult,
        recruitersResult,
        pendingResult,
        approvedResult,
        jobsResult,
        applicationsResult,
      ].filter((result) => result.error);

      if (failedQueries.length > 0) {
        setError(
          "Some statistics could not load. Check your table names and Supabase permissions."
        );
      }
    } catch {
      setError("Something went wrong while loading the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  async function inviteSuperAdmin(email: string) {
    setAdminBusy(true);
    setAdminMessage("");
    setAdminError("");

    try {
      const { data: shouldSendInvite, error: prepareError } =
        await supabase.rpc("prepare_super_admin_invite", {
          p_email: email.trim(),
        });

      if (prepareError) {
        setAdminError(
          prepareError.code === "PGRST202" || prepareError.code === "42883"
            ? "The invite feature is not installed yet. Run supabase/migrations/20261015230000_invite_super_admin_without_service_key.sql in Supabase SQL Editor."
            : `Could not prepare Super Admin access: ${prepareError.message}`
        );
        return;
      }

      if (shouldSendInvite) {
        const { error: inviteError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/reset-password?type=invite`,
          },
        });
        if (inviteError) {
          setAdminError(
            `The invitation is prepared, but Supabase could not send the sign-in link: ${inviteError.message}. Check Auth email delivery and retry Add Super Admin to resend it.`
          );
          return;
        }
        setAdminMessage(
          `Invitation sent to ${email.trim()}. They can accept it and set their password to access CareerAI as a Super Admin.`
        );
      } else {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
          });
        setAdminMessage(
          resetError
            ? `${email.trim()} is now a Super Admin. Password setup email could not be sent: ${resetError.message}. They can request a reset link from Login.`
            : `${email.trim()} is now a Super Admin. A password setup link has been sent.`
        );
      }

      setAdminEmail("");
      await loadDashboard();
    } catch (inviteError) {
      setAdminError(
        inviteError instanceof Error
          ? `Could not invite Super Admin: ${inviteError.message}`
          : "Could not invite Super Admin. Please try again."
      );
    } finally {
      setAdminBusy(false);
    }
  }

  async function manageSuperAdmin(action: "add" | "remove", email: string) {
    if (action === "add") {
      await inviteSuperAdmin(email);
      return;
    }

    if (
      !window.confirm(
        `Remove ${email} as a Super Admin? Their account and history will remain.`
      )
    ) {
      return;
    }

    setAdminBusy(true);
    setAdminMessage("");
    setAdminError("");
    const { error: manageError } = await supabase.rpc("manage_super_admin", {
      p_email: email.trim(),
      p_action: "remove",
    });

    if (manageError) {
      const migrationMissing =
        manageError.code === "PGRST202" || manageError.code === "42883";
      setAdminError(
        migrationMissing
          ? "Super Admin database setup is missing. Run the account-management migration in Supabase SQL Editor."
          : `Could not remove Super Admin access (${manageError.code || "database error"}): ${manageError.message}`
      );
      setAdminBusy(false);
      return;
    }

    setAdminEmail("");
    setAdminMessage(
      `${email.trim()} no longer has Super Admin access. Their CareerAI account was not deleted.`
    );
    await loadDashboard();
    setAdminBusy(false);
  }

  useEffect(() => {
    async function initialize() {
      await loadDashboard();
    }

    void initialize();
  }, [loadDashboard]);

  const cards = [
    {
      title: "Active Students",
      value: stats.students,
      icon: "🎓",
      color: "border-blue-500",
    },
    {
      title: "Recruiter Accounts",
      value: stats.recruiters,
      icon: "🏢",
      color: "border-purple-500",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRecruiters,
      icon: "⏳",
      color: "border-yellow-500",
    },
    {
      title: "Approved Recruiters",
      value: stats.approvedRecruiters,
      icon: "✅",
      color: "border-green-500",
    },
    {
      title: "Total Jobs",
      value: stats.jobs,
      icon: "💼",
      color: "border-pink-500",
    },
    {
      title: "Applications",
      value: stats.applications,
      icon: "📄",
      color: "border-cyan-500",
    },
  ];

  const managementLinks = [
    {
      title: "Recruiter Management",
      description: "Review, approve or reject recruiter requests.",
      href: "/admin/recruiters",
      icon: "🏢",
    },
    {
      title: "Jobs Management",
      description: "View and manage platform job listings.",
      href: "/admin/jobs",
      icon: "💼",
    },
    {
      title: "Student Dashboard",
      description: "Open the main CareerAI dashboard.",
      href: "/dashboard",
      icon: "🎓",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 border-b border-gray-800 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              CareerAI Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Super Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Manage recruiters, students, companies, and jobs.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <AccountMenu />
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                void loadDashboard();
              }}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh Data"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-200"
          >
            {error}
          </div>
        )}

        {!authorized && !loading ? (
          <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-xl font-semibold">Dashboard unavailable</h2>
            <p className="mt-2 text-gray-400">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
            >
              Go to Login
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Platform Overview</h2>
                <span className="text-sm text-gray-500">
                  {loading ? "Loading statistics..." : "Latest available data"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.title}
                    className={`rounded-xl border border-gray-800 border-l-4 ${card.color} bg-gray-900 p-6 shadow-lg`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400">{card.title}</p>
                      <span className="text-2xl">{card.icon}</span>
                    </div>

                    <p className="mt-4 text-3xl font-bold">
                      {loading
                        ? "..."
                        : card.value === null
                          ? "—"
                          : card.value}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="mb-5 text-xl font-bold">Management</h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {managementLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500 hover:bg-gray-900/80"
                  >
                    <span className="text-3xl">{item.icon}</span>

                    <h3 className="mt-4 text-lg font-semibold group-hover:text-indigo-400">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {item.description}
                    </p>

                    <p className="mt-5 text-sm font-semibold text-indigo-400">
                      Open Management →
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-indigo-500/20 bg-gray-900 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
                    Protected access
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Super Admin accounts
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                    The primary Super Admin account ({`ar3359499@gmail.com`}) is
                    protected. Only that account can add or remove other Super Admins; additional
                    Super Admins keep administrative access but cannot manage
                    administrator membership.
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    Enter any email address. Existing active Student accounts
                    are promoted; new addresses receive an invitation and are
                    registered as Super Admins after accepting it. They set
                    their own password using the secure link.
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                    Removing access removes only the Super Admin role; it does
                    not delete the person&apos;s CareerAI account or history.
                  </p>
                </div>
                {isPrimaryAdmin && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-200">
                    Primary Super Admin
                  </span>
                )}
              </div>

              {isPrimaryAdmin ? (
                <form
                  className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void manageSuperAdmin("add", adminEmail);
                  }}
                >
                  <label className="sr-only" htmlFor="new-super-admin-email">
                    Email address to invite or promote
                  </label>
                  <input
                    id="new-super-admin-email"
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                    placeholder="Email address (registered or new)"
                    className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={adminBusy}
                    className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adminBusy ? "Updating..." : "Add Super Admin"}
                  </button>
                </form>
              ) : (
                <p className="mt-6 border-t border-white/10 pt-6 text-sm text-gray-400">
                  Only the primary Super Admin can add or remove administrator
                  accounts. You can continue to manage recruiter approvals and
                  platform jobs.
                </p>
              )}

              {adminMessage && (
                <p role="status" className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  {adminMessage}
                </p>
              )}
              {adminError && (
                <p role="alert" className="mt-4 whitespace-pre-wrap rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-200">
                  {adminError}
                </p>
              )}

              <div className="mt-6 space-y-3">
                {superAdmins.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-gray-950/60 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {member.full_name || member.email || "Super Admin"}
                      </p>
                      <p className="mt-1 truncate text-sm text-gray-400">
                        {member.email || member.user_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.is_primary
                          ? "bg-amber-400/10 text-amber-200"
                          : "bg-indigo-400/10 text-indigo-200"
                      }`}>
                        {member.is_primary ? "Primary" : "Super Admin"}
                      </span>
                      {isPrimaryAdmin && !member.is_primary && (
                        <button
                          type="button"
                          disabled={adminBusy || !member.email}
                          onClick={() =>
                            member.email &&
                            void manageSuperAdmin("remove", member.email)
                          }
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove access
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && superAdmins.length === 0 && !adminError && (
                  <p className="text-sm text-gray-400">
                    No Super Admin account records were found.
                  </p>
                )}
              </div>
            </section>

            <footer className="mt-12 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">
              CareerAI © {new Date().getFullYear()} · Super Admin Panel
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
