"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type ApplicationStatus =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Rejected";

type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  notes: string | null;
  applied_at: string;
  updated_at: string;
  jobs:
    | {
        id: string;
        title: string;
        company: string | null;
        location: string | null;
        salary: string | null;
        job_type: string | null;
      }
    | {
        id: string;
        title: string;
        company: string | null;
        location: string | null;
        salary: string | null;
        job_type: string | null;
      }[]
    | null;
};

const applicationStatuses: ApplicationStatus[] = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
];

const statuses = [
  "All",
  ...applicationStatuses,
];

function isApplicationStatus(value: string): value is ApplicationStatus {
  return applicationStatuses.some((status) => status === value);
}

export default function ApplicationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("All");

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      try {
        setError("");

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

        const { data, error: applicationError } = await supabase
          .from("applications")
          .select(`
          id,
          user_id,
          job_id,
          status,
          notes,
          applied_at,
          updated_at,
          jobs (
            id,
            title,
            company,
            location,
            salary,
            job_type
          )
          `)
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (applicationError) {
          throw applicationError;
        }

        if (!cancelled) {
          setApplications((data || []) as Application[]);
        }
      } catch (err) {
        console.error("Could not load applications:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load applications."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApplications();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const filteredApplications = useMemo(() => {
    if (selectedStatus === "All") {
      return applications;
    }

    return applications.filter(
      (application) =>
        application.status === selectedStatus
    );
  }, [applications, selectedStatus]);

  async function updateStatus(
    applicationId: string,
    newStatus: ApplicationStatus
  ) {
    setError("");
    const updatedAt = new Date().toISOString();

    try {
      const {
        error: updateError,
      } = await supabase
        .from("applications")
        .update({
          status: newStatus,
          updated_at: updatedAt,
        })
        .eq("id", applicationId);

      if (updateError) {
        throw updateError;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                status: newStatus,
                updated_at: updatedAt,
              }
            : application
        )
      );
    } catch (err) {
      console.error("Could not update application status:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not update application."
      );
    }
  }

  async function deleteApplication(
    applicationId: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error: deleteError,
      } = await supabase
        .from("applications")
        .delete()
        .eq("id", applicationId);

      if (deleteError) {
        throw deleteError;
      }

      setApplications((current) =>
        current.filter(
          (application) =>
            application.id !== applicationId
        )
      );
    } catch (err) {
      console.error("Could not delete application:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not delete application."
      );
    }
  }

  const counts = {
    applied: applications.filter(
      (item) => item.status === "Applied"
    ).length,

    screening: applications.filter(
      (item) => item.status === "Screening"
    ).length,

    interview: applications.filter(
      (item) => item.status === "Interview"
    ).length,

    offer: applications.filter(
      (item) => item.status === "Offer"
    ).length,

    rejected: applications.filter(
      (item) => item.status === "Rejected"
    ).length,
  };

  function getStatusClass(status: string) {
    switch (status) {
      case "Applied":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";

      case "Screening":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";

      case "Interview":
        return "border-purple-500/30 bg-purple-500/10 text-purple-400";

      case "Offer":
        return "border-green-500/30 bg-green-500/10 text-green-400";

      case "Rejected":
        return "border-red-500/30 bg-red-500/10 text-red-400";

      default:
        return "border-gray-700 bg-gray-800 text-gray-300";
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 pt-20 text-white">
      <Navbar />
      {/* Header */}

      <section className="border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            📋 CareerAI
          </div>

          <h1 className="mt-5 text-4xl font-bold md:text-5xl">
            Application Tracker
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-gray-400">
            Keep track of every job application and
            monitor your progress.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Statistics */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Applied"
            value={counts.applied}
          />

          <StatCard
            label="Screening"
            value={counts.screening}
          />

          <StatCard
            label="Interview"
            value={counts.interview}
          />

          <StatCard
            label="Offers"
            value={counts.offer}
          />

          <StatCard
            label="Rejected"
            value={counts.rejected}
          />
        </div>

        {/* Filter */}

        <div className="mt-10 flex flex-wrap gap-3">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() =>
                setSelectedStatus(status)
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedStatus === status
                  ? "bg-blue-600 text-white"
                  : "border border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Error */}

        {error && (
          <div className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            ❌ {error}
          </div>
        )}

        {/* Loading */}

        {loading && (
          <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
            <p className="text-gray-400">
              Loading applications...
            </p>
          </div>
        )}

        {/* Empty */}

        {!loading &&
          filteredApplications.length === 0 && (
            <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
              <div className="text-5xl">
                📭
              </div>

              <h2 className="mt-5 text-2xl font-bold">
                No Applications Found
              </h2>

              <p className="mt-2 text-gray-400">
                Start applying to jobs and your
                applications will appear here.
              </p>

              <Link
                href="/jobs"
                className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
              >
                Find Jobs →
              </Link>
            </div>
          )}

        {/* Applications */}

        {!loading &&
          filteredApplications.length > 0 && (
            <div className="mt-8 space-y-5">
              {filteredApplications.map(
                (application) => {
                  const job = Array.isArray(application.jobs)
                    ? application.jobs[0]
                    : application.jobs;

                  if (!job) {
                    return null;
                  }

                  return (
                    <article
                      key={application.id}
                      className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
                    >
                      <div className="flex flex-col justify-between gap-6 md:flex-row">
                        <div>
                          <h2 className="text-2xl font-bold">
                            {job.title}
                          </h2>

                          <p className="mt-1 text-blue-400">
                            {job.company ||
                              "Company not provided"}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-400">
                            {job.location && (
                              <span>
                                📍 {job.location}
                              </span>
                            )}

                            {job.job_type && (
                              <span>
                                💼 {job.job_type}
                              </span>
                            )}

                            {job.salary && (
                              <span>
                                💰 {job.salary}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClass(
                              application.status
                            )}`}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-gray-800 pt-6">
                        <div className="grid gap-5 md:grid-cols-3">
                          <div>
                            <p className="text-sm text-gray-500">
                              Applied
                            </p>

                            <p className="mt-1 text-gray-300">
                              {new Date(
                                application.applied_at
                              ).toLocaleDateString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">
                              Last Updated
                            </p>

                            <p className="mt-1 text-gray-300">
                              {new Date(
                                application.updated_at
                              ).toLocaleDateString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">
                              Change Status
                            </p>

                            <select
                              value={
                                application.status
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                if (isApplicationStatus(value)) {
                                  void updateStatus(application.id, value);
                                }
                              }}
                              className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            >
                              {applicationStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-800"
                        >
                          View Job
                        </Link>

                        <Link
                          href={`/job-match?jobId=${job.id}`}
                          className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/20"
                        >
                          🎯 AI Match
                        </Link>

                        <button
                          onClick={() =>
                            deleteApplication(
                              application.id
                            )
                          }
                          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}