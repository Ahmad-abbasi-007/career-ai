
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

type Job = {
  id: string;
  recruiter_id: string | null;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string;
  salary: string;
  job_type: string;
  application_url: string;
  created_at: string;
};

type ScreeningQuestion = {
  question_text: string;
  question_type: "short_text" | "long_text" | "yes_no" | "number";
  is_required: boolean;
};

const emptyForm = {
  title: "",
  location: "",
  description: "",
  skills: "",
  salary: "",
  job_type: "Full-time",
  application_url: "",
};

const emptyQuestion: ScreeningQuestion = {
  question_text: "",
  question_type: "short_text",
  is_required: true,
};

export default function RecruiterJobsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [company, setCompany] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadJobs = useCallback(async () => {
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const currentUserId = authData.user.id;
    setUserId(currentUserId);

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (roleError) {
      setError(roleError.message);
      return;
    }

    if (role?.role !== "recruiter") {
      router.replace(
        role?.role === "super_admin"
          ? "/super-admin/dashboard"
          : "/dashboard"
      );
      return;
    }

    if (role.status !== "active") {
      setError(
        role.status === "pending"
          ? "Your account is awaiting Super Admin approval."
          : "Your recruiter account is not active."
      );
      return;
    }

    const { data: request, error: requestError } = await supabase
      .from("recruiter_requests")
      .select("company_name")
      .eq("user_id", currentUserId)
      .eq("status", "approved")
      .maybeSingle();

    if (requestError || !request) {
      setError(
        requestError?.message ||
          "Your approved company record could not be found."
      );
      return;
    }

    setCompany(request.company_name);

    const { data: jobData, error: jobsError } = await supabase
      .from("jobs")
      .select(
        "id, recruiter_id, title, company, location, description, skills, salary, job_type, application_url, created_at"
      )
      .eq("recruiter_id", currentUserId)
      .order("created_at", { ascending: false });

    if (jobsError) {
      setError("Could not load your jobs: " + jobsError.message);
      return;
    }

    setJobs((jobData ?? []) as Job[]);
  }, [router, supabase]);

  useEffect(() => {
    async function initialize() {
      try {
        await loadJobs();
      } catch {
        setError("Something went wrong while loading your jobs.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadJobs]);

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      { ...emptyQuestion },
    ]);
    setShowQuestions(true);
  }

  function updateQuestion(
    index: number,
    updates: Partial<ScreeningQuestion>
  ) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index ? { ...question, ...updates } : question
      )
    );
  }

  function removeQuestion(index: number) {
    setQuestions((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!userId || !company) {
      setError("Your recruiter account has not been verified.");
      return;
    }

    if (
      !form.title.trim() ||
      !form.location.trim() ||
      !form.description.trim()
    ) {
      setError("Please fill in the job title, location and description.");
      return;
    }

    const validQuestions = questions.filter(
      (question) => question.question_text.trim()
    );

    if (validQuestions.length !== questions.length) {
      setError(
        "Please enter text for every question, or remove the empty question."
      );
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user || authData.user.id !== userId) {
        setError("Your session has expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (role?.role !== "recruiter" || role.status !== "active") {
        setError("Your recruiter account is not active.");
        return;
      }

      const { data: newJob, error: insertError } = await supabase
        .from("jobs")
        .insert({
          recruiter_id: userId,
          title: form.title.trim(),
          company,
          location: form.location.trim(),
          description: form.description.trim(),
          skills: form.skills.trim(),
          salary: form.salary.trim(),
          job_type: form.job_type,
          application_url: form.application_url.trim(),
        })
        .select("id")
        .single();

      if (insertError || !newJob) {
        setError(
          "Could not post job: " +
            (insertError?.message || "The new job ID was not returned.")
        );
        return;
      }

      if (validQuestions.length > 0) {
        const questionRows = validQuestions.map((question, index) => ({
          job_id: newJob.id,
          question_text: question.question_text.trim(),
          question_type: question.question_type,
          is_required: question.is_required,
          sort_order: index,
        }));

        const { error: questionsError } = await supabase
          .from("job_screening_questions")
          .insert(questionRows);

        if (questionsError) {
          // Roll back the job if its questions could not be saved.
          await supabase
            .from("jobs")
            .delete()
            .eq("id", newJob.id)
            .eq("recruiter_id", userId);

          setError(
            "The job questions could not be saved. The job was rolled back. " +
              questionsError.message
          );
          return;
        }
      }

      setForm(emptyForm);
      setQuestions([]);
      setShowQuestions(false);
      setMessage(
        validQuestions.length > 0
          ? `Job posted successfully with ${validQuestions.length} custom question(s)!`
          : "Job posted successfully without screening questions!"
      );

      await loadJobs();
    } catch {
      setError("An unexpected error occurred while posting the job.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(job: Job) {
    if (!window.confirm(`Delete the job "${job.title}"?`)) return;

    setDeletingId(job.id);
    setError("");
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user || authData.user.id !== userId) {
        setError("Please log in again.");
        router.replace("/login");
        return;
      }

      const { error: deleteError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", job.id)
        .eq("recruiter_id", userId);

      if (deleteError) {
        setError("Could not delete job: " + deleteError.message);
        return;
      }

      setJobs((current) =>
        current.filter((item) => item.id !== job.id)
      );
      setMessage("Job deleted successfully.");
    } catch {
      setError("An unexpected error occurred while deleting the job.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        Loading your jobs...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <Link
              href="/recruiter/dashboard"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              ← Back to Recruiter Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Manage Jobs</h1>
            <p className="mt-2 text-gray-400">
              Company: {company || "Loading company..."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-gray-700 px-4 py-2 text-sm">
              {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"}
            </span>
            <AccountMenu />
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-950 p-4 text-red-300"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-emerald-950 p-4 text-emerald-300"
          >
            {message}
          </p>
        )}

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
          <h2 className="text-xl font-bold">Post a New Job</h2>
          <p className="mt-2 text-sm text-gray-400">
            Your listing will be associated with your approved company.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm">
                Job Title *
              </label>
              <input
                id="title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Frontend Developer"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="location" className="mb-2 block text-sm">
                Location *
              </label>
              <input
                id="location"
                required
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="Lahore / Remote"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="job_type" className="mb-2 block text-sm">
                Job Type
              </label>
              <select
                id="job_type"
                value={form.job_type}
                onChange={(e) =>
                  setForm({ ...form, job_type: e.target.value })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Internship</option>
                <option>Contract</option>
                <option>Remote</option>
              </select>
            </div>

            <div>
              <label htmlFor="salary" className="mb-2 block text-sm">
                Salary
              </label>
              <input
                id="salary"
                value={form.salary}
                onChange={(e) =>
                  setForm({ ...form, salary: e.target.value })
                }
                placeholder="PKR 80,000 - 120,000"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="skills" className="mb-2 block text-sm">
                Required Skills
              </label>
              <input
                id="skills"
                value={form.skills}
                onChange={(e) =>
                  setForm({ ...form, skills: e.target.value })
                }
                placeholder="React, TypeScript, Tailwind CSS"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="mb-2 block text-sm">
                Job Description *
              </label>
              <textarea
                id="description"
                required
                rows={5}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the responsibilities and requirements..."
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="application_url" className="mb-2 block text-sm">
                Application URL (optional)
              </label>
              <input
                id="application_url"
                type="url"
                value={form.application_url}
                onChange={(e) =>
                  setForm({ ...form, application_url: e.target.value })
                }
                placeholder="https://example.com/apply"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-gray-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    Add Custom Questions (Optional)
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Ask applicants anything relevant to this job. You can also
                    post without questions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
                >
                  + Add Question
                </button>
              </div>

              {showQuestions && questions.length > 0 && (
                <div className="mt-5 space-y-4">
                  {questions.map((question, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-700 bg-gray-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor={`question-${index}`}
                          className="text-sm font-medium"
                        >
                          Question {index + 1}
                        </label>

                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="text-sm text-red-300 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>

                      <textarea
                        id={`question-${index}`}
                        rows={2}
                        required
                        value={question.question_text}
                        onChange={(e) =>
                          updateQuestion(index, {
                            question_text: e.target.value,
                          })
                        }
                        placeholder="Write your own question..."
                        className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-indigo-500"
                      />

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`type-${index}`}
                            className="mb-2 block text-sm"
                          >
                            Answer Type
                          </label>
                          <select
                            id={`type-${index}`}
                            value={question.question_type}
                            onChange={(e) =>
                              updateQuestion(index, {
                                question_type: e.target.value as ScreeningQuestion["question_type"],
                              })
                            }
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 outline-none focus:border-indigo-500"
                          >
                            <option value="short_text">Short text</option>
                            <option value="long_text">Long answer</option>
                            <option value="yes_no">Yes / No</option>
                            <option value="number">Number</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 self-end pb-2 text-sm">
                          <input
                            type="checkbox"
                            checked={question.is_required}
                            onChange={(e) =>
                              updateQuestion(index, {
                                is_required: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-indigo-500"
                          />
                          Required question
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {questions.length === 0 && (
                <p className="mt-4 text-sm text-gray-500">
                  No questions added. Applicants can apply without answering
                  custom questions.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || !company}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Posting Job..." : "+ Post Job"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="mb-5 text-xl font-bold">Your Job Listings</h2>

          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
              <h3 className="text-lg font-semibold">No jobs posted yet</h3>
              <p className="mt-2 text-gray-400">
                Use the form above to publish your first job.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{job.title}</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        {job.company} · {job.location} · {job.job_type}
                      </p>
                      {job.salary && (
                        <p className="mt-2 text-sm text-emerald-300">
                          {job.salary}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === job.id}
                      onClick={() => void handleDelete(job)}
                      className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
                    >
                      {deletingId === job.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                    {job.description}
                  </p>

                  {job.skills && (
                    <p className="mt-3 text-sm text-gray-400">
                      <span className="font-semibold text-gray-300">
                        Skills:{" "}
                      </span>
                      {job.skills}
                    </p>
                  )}

                  <p className="mt-4 text-xs text-gray-500">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
