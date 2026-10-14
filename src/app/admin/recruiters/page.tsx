"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type RecruiterRequest = {
  id: string;
  user_id: string;
  full_name: string | null;
  company_name: string;
  work_email: string;
  website: string | null;
  company_details: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export default function AdminRecruitersPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState<RecruiterRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    const { data, error: requestError } = await supabase
      .from("recruiter_requests")
      .select(
        "id, user_id, full_name, company_name, work_email, website, company_details, status, created_at, reviewed_at"
      )
      .order("created_at", { ascending: false });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setRequests((data ?? []) as RecruiterRequest[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!active) return;

      if (adminError) {
        setError(`Could not verify administrator access: ${adminError.message}`);
        setLoading(false);
        return;
      }

      if (!admin) {
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const { data, error: requestError } = await supabase
        .from("recruiter_requests")
        .select(
          "id, user_id, full_name, company_name, work_email, website, company_details, status, created_at, reviewed_at"
        )
        .order("created_at", { ascending: false });

      if (!active) return;

      if (requestError) {
        setError(requestError.message);
      } else {
        setRequests((data ?? []) as RecruiterRequest[]);
      }

      setLoading(false);
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function reviewRequest(
    request: RecruiterRequest,
    decision: "approved" | "rejected"
  ) {
    const actionLabel = decision === "approved" ? "approve" : "reject";
    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} ${request.company_name}'s recruiter request?`
      )
    ) {
      return;
    }

    setBusyId(request.id);
    setError("");
    setMessage("");

    const { error: reviewError } = await supabase.rpc(
      "review_recruiter_request",
      {
        p_request_id: request.id,
        p_decision: decision,
      }
    );

    if (reviewError) {
      setError(`Could not ${actionLabel} request: ${reviewError.message}`);
      setBusyId(null);
      return;
    }

    setMessage(
      decision === "approved"
        ? `${request.company_name} is approved. The recruiter can now log in.`
        : `${request.company_name}'s request was rejected.`
    );

    await loadRequests();
    setBusyId(null);
  }

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading recruiter requests...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-3 text-gray-400">
            Recruiter requests are only available to the Super Administrator.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          )}
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
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Super Administrator
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Recruiter Requests
            </h1>
            <p className="mt-2 text-gray-400">
              Review company details before allowing recruiters to access the
              platform.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/jobs"
              className="rounded-lg border border-gray-700 px-4 py-2 hover:bg-gray-800"
            >
              Manage Jobs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-700 px-4 py-2 hover:bg-gray-800"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div>
            <p className="text-sm text-gray-400">Awaiting your review</p>
            <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRequests()}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Refresh requests
          </button>
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

        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <h2 className="text-lg font-semibold">No recruiter requests yet</h2>
            <p className="mt-2 text-gray-400">
              New recruiter applications will appear here after registration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">
                        {request.company_name}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "pending"
                            ? "bg-amber-500/10 text-amber-300"
                            : request.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-300">
                      {request.full_name || "Recruiter"} · {request.work_email}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Submitted{" "}
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() =>
                          void reviewRequest(request, "rejected")
                        }
                        className="rounded-lg border border-red-900 px-4 py-2 text-red-300 hover:bg-red-950 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() =>
                          void reviewRequest(request, "approved")
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {busyId === request.id ? "Saving..." : "Approve"}
                      </button>
                    </div>
                  )}
                </div>

                {request.website && (
                  <p className="mt-4 text-sm">
                    <span className="text-gray-500">Website: </span>
                    <a
                      href={request.website}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-blue-300 hover:text-blue-200"
                    >
                      {request.website}
                    </a>
                  </p>
                )}
                {request.company_details && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                    {request.company_details}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
