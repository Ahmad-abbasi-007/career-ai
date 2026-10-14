"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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

export default function AlertsPage() {
  const supabase = createClient();

  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          if (isMounted) {
            setError("Please log in to manage job alerts.");
          }
          return;
        }

        const { data, error: queryError } = await supabase
          .from("job_alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        if (isMounted) {
          setAlerts((data ?? []) as JobAlert[]);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load alerts."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAlerts();

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

      const { error: insertError } = await supabase.from("job_alerts").insert({
        user_id: user.id,
        keyword: keyword.trim(),
        location: location.trim() || null,
        job_type: jobType || null,
        email_enabled: true,
        is_active: true,
      });

      if (insertError) throw insertError;

      setKeyword("");
      setLocation("");
      setJobType("");
      setMessage("Job alert created successfully.");

      const {
        data: refreshedAlerts,
        error: refreshError,
      } = await supabase
        .from("job_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (refreshError) throw refreshError;
      setAlerts((refreshedAlerts ?? []) as JobAlert[]);
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
      setMessage("Alert settings updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update alert."
      );
    }
  }

  async function deleteAlert(id: string) {
    try {
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
      setMessage("Alert deleted.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete alert."
      );
    }
  }

  async function sendTestEmail() {
    try {
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

      setMessage("Email accepted by the provider. Check your inbox.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send test email."
      );
      setMessage("");
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
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">Job Alerts</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Save your search preferences and manage personalized job email alerts.
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
          className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-blue-950/10"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Create a Job Alert</h2>
              <p className="mt-2 text-sm text-gray-400">
                Get notified when new jobs match your preferences.
              </p>
            </div>
          </div>

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
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Job type
                </label>
                <select
                  value={jobType}
                  onChange={(event) => setJobType(event.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition focus:border-blue-500"
                >
                  <option value="">Any type</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Alert"}
            </button>
          </div>
        </form>

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Email Notifications</h2>
              <p className="mt-2 text-sm text-gray-400">
                Send a test email to your authenticated account address.
              </p>
            </div>

            <button
              type="button"
              onClick={sendTestEmail}
              className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 font-semibold text-blue-200 transition hover:bg-blue-500/20"
            >
              Send Test Email
            </button>
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
                      <h3 className="text-lg font-bold text-white">{alert.keyword}</h3>
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
                        onClick={() =>
                          updateAlert(alert, {
                            is_active: !alert.is_active,
                          })
                        }
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        {alert.is_active ? "Pause" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateAlert(alert, {
                            email_enabled: !alert.email_enabled,
                          })
                        }
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        {alert.email_enabled ? "Disable Email" : "Enable Email"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAlert(alert.id)}
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
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
