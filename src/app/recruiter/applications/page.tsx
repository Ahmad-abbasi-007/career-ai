
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  company: string;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  notes: string | null;
  applied_at: string;
  updated_at: string | null;
};

type ScreeningQuestion = {
  id: string;
  job_id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
};

type SavedAnswer = {
  id: string;
  application_id: string;
  question_id: string;
  answer: string;
};

type DisplayAnswer = {
  question: string;
  answer: string;
};

type ApplicationRow = Application & {
  jobTitle: string;
  company: string;
  studentName: string;
  studentEmail: string;
  screeningAnswers: DisplayAnswer[];
};

const STATUSES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
];

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const userId = authData.user.id;

      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) {
        throw new Error(
          `Could not verify recruiter account: ${roleError.message}`
        );
      }

      if (role?.role !== "recruiter" || role.status !== "active") {
        if (role?.role === "super_admin") {
          router.replace("/super-admin/dashboard");
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, company")
        .eq("recruiter_id", userId);

      if (jobsError) {
        throw new Error(`Could not load your jobs: ${jobsError.message}`);
      }

      const ownJobs = (jobs ?? []) as Job[];

      if (ownJobs.length === 0) {
        setApplications([]);
        return;
      }

      const jobIds = ownJobs.map((job) => job.id);

      const { data: applicationData, error: applicationsError } =
        await supabase
          .from("applications")
          .select(
            "id, user_id, job_id, status, notes, applied_at, updated_at"
          )
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false });

      if (applicationsError) {
        throw new Error(
          `Could not load applications: ${applicationsError.message}`
        );
      }

      const rawApplications = (applicationData ?? []) as Application[];

      if (rawApplications.length === 0) {
        setApplications([]);
        return;
      }

      const studentIds = [
        ...new Set(rawApplications.map((application) => application.user_id)),
      ];

      const applicationIds = rawApplications.map(
        (application) => application.id
      );

      // Load student profiles.
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds);

      if (profilesError) {
        throw new Error(
          `Could not read student profiles: ${profilesError.message}`
        );
      }

      // Load the screening answers submitted with these applications.
      const { data: answerData, error: answersError } = await supabase
        .from("application_answers")
        .select("id, application_id, question_id, answer")
        .in("application_id", applicationIds);

      if (answersError) {
        throw new Error(
          `Could not load screening answers: ${answersError.message}`
        );
      }

      const savedAnswers = (answerData ?? []) as SavedAnswer[];

      // Get the question text for the saved answers.
      const questionIds = [
        ...new Set(savedAnswers.map((answer) => answer.question_id)),
      ];

      let screeningQuestions: ScreeningQuestion[] = [];

      if (questionIds.length > 0) {
        const { data: questionData, error: questionsError } = await supabase
          .from("job_screening_questions")
          .select("id, job_id, question_text, question_type, sort_order")
          .in("id", questionIds);

        if (questionsError) {
          throw new Error(
            `Could not load screening questions: ${questionsError.message}`
          );
        }

        screeningQuestions = (questionData ?? []) as ScreeningQuestion[];
      }

      const jobMap = new Map(ownJobs.map((job) => [job.id, job]));

      const profileMap = new Map(
        ((profiles ?? []) as StudentProfile[]).map((profile) => [
          profile.id,
          profile,
        ])
      );

      const questionMap = new Map(
        screeningQuestions.map((question) => [
          question.id,
          question.question_text,
        ])
      );

      const answersByApplication = new Map<string, DisplayAnswer[]>();

      for (const answer of savedAnswers) {
        const questionText = questionMap.get(answer.question_id);

        if (!questionText) continue;

        const currentAnswers =
          answersByApplication.get(answer.application_id) ?? [];

        currentAnswers.push({
          question: questionText,
          answer: answer.answer,
        });

        answersByApplication.set(answer.application_id, currentAnswers);
      }

      const rows: ApplicationRow[] = rawApplications.map((application) => {
        const job = jobMap.get(application.job_id);
        const student = profileMap.get(application.user_id);

        return {
          ...application,
          jobTitle: job?.title ?? "Job title unavailable",
          company: job?.company ?? "Company",
          studentName: student?.full_name ?? "Student",
          studentEmail: student?.email ?? "Email unavailable",
          screeningAnswers:
            answersByApplication.get(application.id) ?? [],
        };
      });

      setApplications(rows);
    } catch (err) {
      console.error("Could not load recruiter applications:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading applications."
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function updateStatus(
    application: ApplicationRow,
    newStatus: string
  ) {
    if (application.status === newStatus) return;

    setUpdatingId(application.id);
    setError("");
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (
        roleError ||
        role?.role !== "recruiter" ||
        role.status !== "active"
      ) {
        throw new Error(
          "Your active recruiter access could not be verified."
        );
      }

      const { error: updateError } = await supabase
        .from("applications")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id)
        .eq("job_id", application.job_id);

      if (updateError) {
        throw new Error(
          `Could not update application: ${updateError.message}`
        );
      }

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setMessage(
        `${application.studentName}'s application status changed to ${newStatus}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update application status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredApplications =
    filter === "All"
      ? applications
      : applications.filter(
          (application) => application.status === filter
        );

  const countFor = (status: string) =>
    applications.filter((application) => application.status === status)
      .length;

  function statusStyle(status: string) {
    switch (status) {
      case "Offer":
        return "bg-emerald-500/10 text-emerald-300";
      case "Interview":
        return "bg-blue-500/10 text-blue-300";
      case "Screening":
        return "bg-amber-500/10 text-amber-300";
      case "Rejected":
        return "bg-red-500/10 text-red-300";
      default:
        return "bg-gray-700 text-gray-200";
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Recruiter Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Manage Applications
            </h1>
            <p className="mt-2 text-gray-400">
              Review candidates, read screening answers, and update application
              statuses.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/recruiter/jobs"
              className="rounded-lg border border-gray-700 px-4 py-2 hover:bg-gray-800"
            >
              Manage Jobs
            </Link>
            <Link
              href="/recruiter/dashboard"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 break-words rounded-xl border border-red-900 bg-red-950 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-900 bg-emerald-950 p-4 text-emerald-300"
          >
            {message}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Applications", value: applications.length },
            { label: "In Screening", value: countFor("Screening") },
            { label: "Interviews", value: countFor("Interview") },
            { label: "Offers", value: countFor("Offer") },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Candidate Applications</h2>

          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
              aria-label="Filter applications by status"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadApplications()}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-400">
            Loading applications...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <h3 className="text-lg font-semibold">
              {applications.length === 0
                ? "No applications yet"
                : "No applications match this filter"}
            </h3>
            <p className="mt-2 text-gray-400">
              {applications.length === 0
                ? "Applications will appear here when students apply to your jobs."
                : "Choose another status to see more applications."}
            </p>
            <Link
              href="/recruiter/jobs"
              className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
            >
              View Your Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <article
                key={application.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold">
                        {application.studentName}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(application.status)}`}
                      >
                        {application.status}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-sm text-indigo-300">
                      {application.studentEmail}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-gray-500">Applied for</p>
                        <p className="mt-1 font-medium">
                          {application.jobTitle}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Company</p>
                        <p className="mt-1 font-medium">
                          {application.company}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Application date</p>
                        <p className="mt-1">
                          {application.applied_at
                            ? new Date(
                                application.applied_at
                              ).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    {application.notes && (
                      <div className="mt-4 rounded-lg bg-gray-800/70 p-3">
                        <p className="text-xs font-semibold text-gray-400">
                          Applicant notes
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                          {application.notes}
                        </p>
                      </div>
                    )}

                    {/* Screening question answers */}
                    <section className="mt-6 rounded-xl border border-indigo-900/70 bg-gray-950 p-4">
                      <h4 className="text-base font-semibold text-indigo-300">
                        Screening Questions &amp; Answers
                      </h4>

                      {application.screeningAnswers.length > 0 ? (
                        <div className="mt-4 space-y-4">
                          {application.screeningAnswers.map(
                            (item, index) => (
                              <div
                                key={`${application.id}-${index}`}
                                className="border-b border-gray-800 pb-4 last:border-0 last:pb-0"
                              >
                                <p className="text-sm font-medium text-gray-300">
                                  {index + 1}. {item.question}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white">
                                  {item.answer}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          No screening answers were saved for this application.
                          This may be an older application submitted before
                          screening questions were enabled.
                        </p>
                      )}
                    </section>
                  </div>

                  <div className="w-full lg:w-56">
                    <label
                      htmlFor={`status-${application.id}`}
                      className="mb-2 block text-sm font-medium text-gray-300"
                    >
                      Update application status
                    </label>
                    <select
                      id={`status-${application.id}`}
                      value={application.status}
                      disabled={updatingId === application.id}
                      onChange={(event) =>
                        void updateStatus(application, event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-sm disabled:opacity-50"
                    >
                      {!STATUSES.includes(application.status) && (
                        <option value={application.status}>
                          {application.status}
                        </option>
                      )}
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {updatingId === application.id && (
                      <p className="mt-2 text-xs text-gray-400">
                        Updating status...
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
