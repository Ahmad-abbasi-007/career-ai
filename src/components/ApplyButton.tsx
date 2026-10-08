"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkApplication() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          return;
        }

        const { data, error: applicationError } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", user.id)
          .eq("job_id", jobId)
          .maybeSingle();

        if (applicationError) {
          throw applicationError;
        }

        if (!cancelled) {
          setApplied(Boolean(data));
        }
      } catch (err) {
        console.error("Could not check job application:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not check your application status."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void checkApplication();
    return () => {
      cancelled = true;
    };
  }, [jobId, supabase]);

  async function applyForJob() {
    setApplying(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("Please log in before applying.");
        return;
      }

      const { error: insertError } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: "Applied",
        });

      if (insertError?.code === "23505") {
        setApplied(true);
        return;
      }

      if (insertError) {
        throw insertError;
      }

      setApplied(true);
    } catch (err) {
      console.error("Could not apply for job:", err);
      setError(
        err instanceof Error ? err.message : "Could not apply for this job."
      );
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-lg border border-gray-700 px-5 py-3 text-center text-gray-400"
        role="status"
      >
        Checking application status...
      </div>
    );
  }

  return (
    <div>
      {applied ? (
        <div className="space-y-3">
          <button
            disabled
            className="w-full rounded-lg bg-green-700/40 px-5 py-3 font-semibold text-green-300"
          >
            ✓ Applied
          </button>
          <Link
            href="/applications"
            className="block text-center text-sm text-blue-400 hover:text-blue-300"
          >
            View in Application Tracker →
          </Link>
        </div>
      ) : (
        <button
          onClick={applyForJob}
          disabled={applying}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {applying ? "Applying..." : "Apply & Track Job"}
        </button>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          ❌ {error}
        </p>
      )}
    </div>
  );
}
