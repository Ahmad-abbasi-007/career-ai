
"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase";

type JobAlert = {
  id: string;
  keyword: string;
  location: string | null;
  job_type: string | null;
  email_enabled: boolean;
  is_active: boolean;
  created_at: string;
};

type MatchingJob = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  job_type: string | null;
};

export default function AlertsPage() {
  const [supabase] = useState(() => createClient());

  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [matchingJobs, setMatchingJobs] = useState<MatchingJob[]>([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAlerts() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Please log in to manage job alerts.");

    const { data, error: queryError } = await supabase
      .from("job_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;

    setAlerts((data ?? []) as JobAlert[]);
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error("Please log in to manage job alerts.");
        }

        const { data, error: queryError } = await supabase
          .from("job_alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        if (isMounted) setAlerts((data ?? []) as JobAlert[]);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load alerts."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!keyword.trim()) {
      setError("Enter a job title or keyword.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("job_alerts")
          .update({
            keyword: keyword.trim(),
            location: location.trim() || null,
            job_type: jobType || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select("id");

        if (updateError) throw updateError;
        if (!data?.length) throw new Error("Alert was not updated.");
      } else {
        const { error: insertError } = await supabase
          .from("job_alerts")
          .insert({
            user_id: user.id,
            keyword: keyword.trim(),
            location: location.trim() || null,
            job_type: jobType || null,
            email_enabled: true,
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      setKeyword("");
      setLocation("");
      setJobType("");
      setEditingId(null);

      await loadAlerts();
      setMatchingJobs([]);
      setHasSearched(false);
      setMessage(
        editingId
          ? "Job alert updated successfully."
          : "Job alert created successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create alert."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateAlert(
    alert: JobAlert,
    changes: Partial<Pick<JobAlert, "is_active" | "email_enabled">>
  ) {
    try {
      setUpdatingId(alert.id);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const { error: updateError } = await supabase
        .from("job_alerts")
        .update({
          ...changes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alert.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? { ...item, ...changes } : item
        )
      );

      setMatchingJobs([]);
      setHasSearched(false);
      setMessage("Alert settings updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update alert."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteAlert(id: string) {
    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const { error: deleteError } = await supabase
        .from("job_alerts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setAlerts((current) => current.filter((item) => item.id !== id));
      setMatchingJobs([]);
      setHasSearched(false);
      if (editingId === id) cancelEditing();
      setMessage("Alert deleted.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete alert."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function startEditing(alert: JobAlert) {
    setEditingId(alert.id);
    setKeyword(alert.keyword);
    setLocation(alert.location ?? "");
    setJobType(alert.job_type ?? "");
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setKeyword("");
    setLocation("");
    setJobType("");
  }

  async function findMatchingJobs() {
    try {
      setMatchingLoading(true);
      setError("");
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Please log in first.");

      const response = await fetch("/api/notifications/matches", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result: { matches?: MatchingJob[]; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not find matching jobs.");
      }

      const matches = result.matches ?? [];
      setMatchingJobs(matches);
      setHasSearched(true);
      setMessage(`${matches.length} matching jobs found.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not find matching jobs."
      );
    } finally {
      setMatchingLoading(false);
    }
  }

  async function sendTestEmail() {
    try {
      setEmailLoading(true);
      setError("");
      setMessage("Sending test email...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Please log in first.");

      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject: "CareerAI email notification test",
          message:
            "Your CareerAI email notification setup has been tested. You can manage your job alerts from your dashboard.",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Test email failed.");
      }

      setMessage("Test email sent. Check your inbox.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send test email."
      );
      setMessage("");
    } finally {
      setEmailLoading(false);
    }
  }

  async function emailMatchingJobs() {
    try {
      setEmailLoading(true);
      setError("");
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Please log in first.");

      const matchesResponse = await fetch(
        "/api/notifications/matches?emailOnly=true",
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const matchesResult: { matches?: MatchingJob[]; error?: string } =
        await matchesResponse.json();

      if (!matchesResponse.ok) {
        throw new Error(
          matchesResult.error || "Could not load email-enabled matches."
        );
      }

      const emailMatches = matchesResult.matches ?? [];
      if (emailMatches.length === 0) {
        setMessage("No matching jobs are enabled for email notifications.");
        return;
      }

      const body = emailMatches
        .slice(0, 5)
        .map(
          (job) =>
            `${job.title.slice(0, 100)} at ${(job.company || "Company not specified").slice(0, 100)}\n` +
            `Location: ${(job.location || "Not specified").slice(0, 80)} · Type: ${(job.job_type || "Not specified").slice(0, 40)}\n` +
            `${window.location.origin}/jobs/${job.id}`
        )
        .join("\n\n");
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject: "CareerAI jobs matching your alerts",
          message: `Here are jobs matching your active alerts:\n\n${body}`,
        }),
      });
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not email matching jobs.");
      }

      setMessage("Matching jobs were emailed to your account address.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not email matching jobs."
      );
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 pt-20 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-12">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
            CareerAI Alerts
          </p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Job Alerts
          </h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Manage your job preferences and find jobs that match your alerts.
          </p>
        </header>

        {error && (
          <p className="mt-6 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-6 break-words rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            {message}
          </p>
        )}

        <form
          onSubmit={createAlert}
          className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <h2 className="text-xl font-bold">Create a Job Alert</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Job title or keyword *
              </label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                required
                maxLength={100}
                placeholder="e.g. React Developer"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Preferred location
                </label>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  maxLength={100}
                  placeholder="e.g. Remote or Lahore"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Job type
                </label>
                <select
                  value={jobType}
                  onChange={(event) => setJobType(event.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">Any type</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? editingId
                  ? "Saving..."
                  : "Creating..."
                : editingId
                  ? "Save Changes"
                  : "Create Alert"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="ml-3 rounded-xl border border-gray-700 px-6 py-3 font-semibold hover:bg-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Email Notifications</h2>
              <p className="mt-2 text-sm text-gray-400">
                Send a test email to your account email address.
              </p>
            </div>

            <button
              type="button"
              onClick={sendTestEmail}
              disabled={emailLoading}
              className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
            >
              {emailLoading ? "Sending..." : "Send Test Email"}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Matching Jobs</h2>
              <p className="mt-2 text-sm text-gray-400">
                Find jobs matching your active alerts.
              </p>
            </div>

            <button
              type="button"
              onClick={findMatchingJobs}
              disabled={matchingLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {matchingLoading ? "Searching..." : "Find Matching Jobs"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {matchingJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-xl border border-gray-700 p-4"
              >
                <h3 className="font-bold">{job.title}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {job.company} · {job.location || "Location not specified"}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {job.job_type || "Type not specified"}
                </p>
                <Link
                  href={`/jobs/${job.id}`}
                  className="mt-3 inline-block text-sm text-blue-400 hover:underline"
                >
                  View Job →
                </Link>
              </article>
            ))}

            {!matchingLoading && hasSearched && matchingJobs.length === 0 && (
              <p className="text-sm text-gray-400">
                No jobs match your active alerts. Try changing your alert preferences.
              </p>
            )}
            {!matchingLoading && !hasSearched && matchingJobs.length === 0 && (
              <p className="text-sm text-gray-400">
                Create an alert, then click Find Matching Jobs to see relevant opportunities.
              </p>
            )}
            {matchingJobs.length > 0 &&
              alerts.some((alert) => alert.is_active && alert.email_enabled) && (
                <button
                  type="button"
                  onClick={emailMatchingJobs}
                  disabled={emailLoading}
                  className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
                >
                  {emailLoading ? "Sending..." : "Email Matching Jobs"}
                </button>
              )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Your Alerts</h2>
            <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-sm text-gray-300">
              {alerts.length} saved
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
              Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
              No alerts yet. Create your first job alert above.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <article
                  key={alert.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-5 transition hover:border-blue-500/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{alert.keyword}</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        {alert.location || "Any location"}
                        {" · "}
                        {alert.job_type || "Any job type"}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        Alert: {alert.is_active ? "Active" : "Paused"}
                        {" · "}
                        Email: {alert.email_enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(alert)}
                        disabled={deletingId === alert.id || updatingId === alert.id}
                        className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10 disabled:opacity-60"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateAlert(alert, {
                            is_active: !alert.is_active,
                          })
                        }
                        disabled={updatingId === alert.id || deletingId === alert.id}
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm hover:bg-gray-800 disabled:opacity-60"
                      >
                        {updatingId === alert.id
                          ? "Updating..."
                          : alert.is_active
                            ? "Pause"
                            : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateAlert(alert, {
                            email_enabled: !alert.email_enabled,
                          })
                        }
                        disabled={updatingId === alert.id || deletingId === alert.id}
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm hover:bg-gray-800 disabled:opacity-60"
                      >
                        {alert.email_enabled ? "Disable Email" : "Enable Email"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAlert(alert.id)}
                        disabled={deletingId === alert.id || updatingId === alert.id}
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
