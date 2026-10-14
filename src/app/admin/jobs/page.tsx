"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  skills: string | null;
  salary: string | null;
  job_type: string | null;
  application_url: string | null;
  created_at: string;
};

type JobForm = {
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string;
  salary: string;
  job_type: string;
  application_url: string;
};

const emptyForm: JobForm = {
  title: "",
  company: "",
  location: "",
  description: "",
  skills: "",
  salary: "",
  job_type: "Full Time",
  application_url: "",
};

export default function AdminJobsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    const { data, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (jobsError) {
      setError(jobsError.message);
      return;
    }

    setJobs((data ?? []) as Job[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!active) return;

      if (adminError || !admin) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const { data, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (jobsError) {
        setError(jobsError.message);
      } else {
        setJobs((data ?? []) as Job[]);
      }

      setLoading(false);
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  function updateField(field: keyof JobForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(job: Job) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      company: job.company ?? "",
      location: job.location ?? "",
      description: job.description,
      skills: job.skills ?? "",
      salary: job.salary ?? "",
      job_type: job.job_type ?? "Full Time",
      application_url: job.application_url ?? "",
    });
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      title: form.title.trim(),
      company: form.company.trim() || null,
      location: form.location.trim() || null,
      description: form.description.trim(),
      skills: form.skills.trim() || null,
      salary: form.salary.trim() || null,
      job_type: form.job_type || null,
      application_url: form.application_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (!payload.title || !payload.description) {
      setError("Job title and description are required.");
      setSaving(false);
      return;
    }

    const result = editingId
      ? await supabase
          .from("jobs")
          .update(payload)
          .eq("id", editingId)
          .select("id")
      : await supabase
          .from("jobs")
          .insert(payload)
          .select("id");

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (!result.data || result.data.length === 0) {
      setError(
        "No job was changed. Check your admin permissions and try again."
      );
      setSaving(false);
      return;
    }

    setMessage(
      editingId ? "Job updated successfully." : "Job added successfully."
    );
    setForm(emptyForm);
    setEditingId(null);

    await loadJobs();
    setSaving(false);
  }

  async function deleteJob(job: Job) {
    const confirmed = window.confirm(
      `Delete "${job.title}"? This can also delete applications and saved-job records linked to this job.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { data, error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id)
      .select("id");

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (!data || data.length === 0) {
      setError("Job was not deleted. Check your admin permissions.");
      return;
    }

    if (editingId === job.id) resetForm();

    setMessage("Job deleted successfully.");
    await loadJobs();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Checking admin access...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-3 text-slate-400">
            This page is only available to authorized CareerAI administrators.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              CareerAI Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Job Management
            </h1>
            <p className="mt-2 text-slate-400">
              Create and maintain the jobs available on your platform.
            </p>
          </div>

          <Link
            href="/jobs"
            className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
          >
            View Job Marketplace
          </Link>
        </div>

        {message && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-emerald-950 p-4 text-emerald-300"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-950 p-4 text-red-300"
          >
            {error}
          </p>
        )}

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="mb-6 text-xl font-bold">
            {editingId ? "Edit Job Listing" : "Add a New Job"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Job title *
                </label>
                <input
                  id="title"
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Frontend Developer"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Company
                </label>
                <input
                  id="company"
                  value={form.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="Company name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Location
                </label>
                <input
                  id="location"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Remote / Lahore / Islamabad"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="job_type"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Employment type
                </label>
                <select
                  id="job_type"
                  value={form.job_type}
                  onChange={(e) => updateField("job_type", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                >
                  <option>Full Time</option>
                  <option>Part Time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                  <option>Freelance</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="salary"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Salary
                </label>
                <input
                  id="salary"
                  value={form.salary}
                  onChange={(e) => updateField("salary", e.target.value)}
                  placeholder="e.g. PKR 80,000/month"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="skills"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Skills
                </label>
                <input
                  id="skills"
                  value={form.skills}
                  onChange={(e) => updateField("skills", e.target.value)}
                  placeholder="React, TypeScript, Tailwind CSS"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="application_url"
                className="mb-2 block text-sm text-slate-300"
              >
                External application URL
              </label>
              <input
                id="application_url"
                type="url"
                value={form.application_url}
                onChange={(e) => updateField("application_url", e.target.value)}
                placeholder="https://example.com/careers"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm text-slate-300"
              >
                Job description *
              </label>
              <textarea
                id="description"
                required
                rows={7}
                maxLength={20000}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the role, responsibilities, and requirements..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update Job" : "Publish Job"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-700 px-6 py-3 hover:bg-slate-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Published Jobs</h2>
            <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
              {jobs.length} total
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
              No jobs found. Add your first listing above.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="flex flex-col justify-between gap-5 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">{job.title}</h3>
                    <p className="mt-1 text-slate-400">
                      {[job.company, job.location, job.job_type]
                        .filter(Boolean)
                        .join(" · ") || "Job details"}
                    </p>
                    {job.salary && (
                      <p className="mt-1 text-sm text-emerald-400">{job.salary}</p>
                    )}
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(job)}
                      className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteJob(job)}
                      className="rounded-lg border border-red-900 px-4 py-2 text-red-300 hover:bg-red-950"
                    >
                      Delete
                    </button>
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
