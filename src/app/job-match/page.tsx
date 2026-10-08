"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import type { CandidateProfile, Job, JobMatchAnalysis } from "@/types";

export default function JobMatchPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] =
    useState<CandidateProfile | null>(null);

  const [jobTitle, setJobTitle] =
    useState("");

  const [jobDescription, setJobDescription] =
    useState("");

  const [selectedJob, setSelectedJob] =
    useState<Job | null>(null);

  const [resumeText, setResumeText] =
    useState("");

  const [analysis, setAnalysis] =
    useState<JobMatchAnalysis | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [matching, setMatching] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, job_title, bio, skills, education, experience")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        setProfile(data);

        const jobId = new URLSearchParams(window.location.search).get("jobId");
        if (jobId) {
          const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id, title, description, job_type")
            .eq("id", jobId)
            .maybeSingle<Job>();

          if (jobError) {
            throw jobError;
          }

          if (!job) {
            throw new Error("The selected job could not be found.");
          }

          setSelectedJob(job);
          setJobTitle(job.title);
          setJobDescription(job.description);
        }
      } catch (err) {
        console.error("Could not load job match profile:", err);
        setError(
          err instanceof Error ? err.message : "Could not load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router, supabase]);

  async function handleMatch() {
    setError("");
    setMessage("");
    setAnalysis(null);

    if (!jobDescription.trim()) {
      setError(
        "Please enter a job description."
      );

      return;
    }

    if (jobDescription.trim().length < 50) {
      setError(
        "Please enter a more detailed job description."
      );

      return;
    }

    setMatching(true);

    try {
      const response = await fetch(
        "/api/job-match",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            jobTitle,
            jobDescription,
            resumeText,
          }),
          signal: AbortSignal.timeout(55_000),
        }
      );

      const result: {
        analysis?: JobMatchAnalysis;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Job matching failed."
        );
      }

      if (!result.analysis) {
        throw new Error(
          "Gemini returned an invalid job match. Please try again."
        );
      }

      setAnalysis(result.analysis);

      setMessage(
        "AI job matching completed successfully!"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "Job matching timed out. Please try again."
          : err instanceof Error
          ? err.message
          : "AI job matching failed."
      );
    } finally {
      setMatching(false);
    }
  }

  function getScoreMessage(score: number) {
    if (score >= 80) {
      return "Excellent Match";
    }

    if (score >= 60) {
      return "Good Match";
    }

    if (score >= 40) {
      return "Moderate Match";
    }

    return "Low Match";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 pt-20 text-white">
        <Navbar />
          <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
          <p className="text-gray-400">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 pt-20 text-white">
      <Navbar />
      {/* Header */}

      <section className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-4 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            🤖 CareerAI
          </div>

          <h1 className="text-4xl font-bold md:text-5xl">
            AI Job Matching
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-gray-400">
            Compare your profile with a job description
            and discover how well you match the position.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Candidate Information */}

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-2xl font-bold">
              Your Profile
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              CareerAI will use your profile information
              to calculate the match.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm text-gray-400">
                  Name
                </label>

                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 p-3">
                  {profile?.full_name ||
                    "Not provided"}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">
                  Current Job Title
                </label>

                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 p-3">
                  {profile?.job_title ||
                    "Not provided"}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">
                  Skills
                </label>

                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 p-3">
                  {profile?.skills ||
                    "No skills added"}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">
                  Education
                </label>

                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 p-3 whitespace-pre-wrap">
                  {profile?.education || "No education added"}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">
                  Experience
                </label>

                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 p-3 whitespace-pre-wrap">
                  {profile?.experience ||
                    "No experience added"}
                </div>
              </div>
            </div>
          </div>

          {/* Job Information */}

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-2xl font-bold">
              Job Information
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Paste the job description you want CareerAI
              to analyze.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Job Title
                </label>

                <input
                  type="text"
                  value={jobTitle}
                  maxLength={200}
                  readOnly={Boolean(selectedJob)}
                  onChange={(e) =>
                    setJobTitle(e.target.value)
                  }
                  placeholder="e.g. Frontend Developer"
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 read-only:cursor-not-allowed read-only:opacity-75"
                />
                {selectedJob?.job_type && (
                  <p className="mt-2 text-sm text-gray-400">
                    Job type: {selectedJob.job_type}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Job Description
                </label>

                <textarea
                  value={jobDescription}
                  onChange={(e) =>
                    setJobDescription(
                      e.target.value
                    )
                  }
                  maxLength={20_000}
                  readOnly={Boolean(selectedJob)}
                  placeholder="Paste the complete job description here..."
                  rows={12}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 read-only:cursor-not-allowed read-only:opacity-75"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Additional Resume Information
                </label>

                <textarea
                  value={resumeText}
                  onChange={(e) =>
                    setResumeText(
                      e.target.value
                    )
                  }
                  maxLength={15_000}
                  placeholder="Optional: paste important resume text here..."
                  rows={5}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleMatch}
                disabled={matching}
                className="w-full rounded-lg bg-blue-600 px-6 py-4 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {matching
                  ? "🤖 Analyzing Match..."
                  : "🎯 Analyze Job Match"}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}

        {error && (
          <div className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            ❌ {error}
          </div>
        )}

        {message && (
          <div className="mt-8 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-400">
            ✅ {message}
          </div>
        )}

        {/* Results */}

        {analysis && (
          <section className="mt-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">
                AI Match Results
              </h2>

              <p className="mt-2 text-gray-400">
                CareerAI analyzed your profile against
                the provided job.
              </p>
            </div>

            {/* Score */}

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
                <p className="text-sm text-gray-400">
                  Match Score
                </p>

                <div className="mt-4 text-6xl font-bold text-blue-500">
                  {analysis.matchScore}%
                </div>

                <p className="mt-3 font-semibold">
                  {getScoreMessage(
                    analysis.matchScore
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 md:col-span-2">
                <h3 className="text-xl font-bold">
                  Match Summary
                </h3>

                <p className="mt-4 leading-7 text-gray-300">
                  {analysis.summary}
                </p>
              </div>
            </div>

            {/* Matching Skills */}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-green-500/20 bg-gray-900 p-6">
                <h3 className="text-xl font-bold text-green-400">
                  ✅ Matching Skills
                </h3>

                <div className="mt-5 flex flex-wrap gap-3">
                  {analysis.matchingSkills
                    .length > 0 ? (
                    analysis.matchingSkills.map(
                      (skill, index) => (
                        <span
                          key={index}
                          className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300"
                        >
                          {skill}
                        </span>
                      )
                    )
                  ) : (
                    <p className="text-gray-400">
                      No matching skills found.
                    </p>
                  )}
                </div>
              </div>

              {/* Missing Skills */}

              <div className="rounded-2xl border border-red-500/20 bg-gray-900 p-6">
                <h3 className="text-xl font-bold text-red-400">
                  ❌ Missing Skills
                </h3>

                <div className="mt-5 flex flex-wrap gap-3">
                  {analysis.missingSkills
                    .length > 0 ? (
                    analysis.missingSkills.map(
                      (skill, index) => (
                        <span
                          key={index}
                          className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300"
                        >
                          {skill}
                        </span>
                      )
                    )
                  ) : (
                    <p className="text-gray-400">
                      No major missing skills detected.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Why Good Match */}

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-xl font-bold text-blue-400">
                💡 Why You&apos;re a Good Match
              </h3>

              <div className="mt-5 space-y-3">
                {analysis.whyGoodMatch.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="flex gap-3"
                    >
                      <span className="text-blue-400">
                        ✓
                      </span>

                      <p className="text-gray-300">
                        {item}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Improvements */}

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-xl font-bold text-yellow-400">
                📈 What You Should Improve
              </h3>

              <div className="mt-5 space-y-3">
                {analysis.improvements.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="flex gap-3"
                    >
                      <span className="text-yellow-400">
                        →
                      </span>

                      <p className="text-gray-300">
                        {item}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}