
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function SaveJobButton({
  jobId,
}: {
  jobId: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSaved() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (active) setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from("saved_jobs")
          .select("id")
          .eq("user_id", user.id)
          .eq("job_id", jobId)
          .maybeSingle();

        if (queryError) throw queryError;

        if (active) setSaved(Boolean(data));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not check saved job."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkSaved();

    return () => {
      active = false;
    };
  }, [jobId, supabase]);

  async function toggleSaved() {
    try {
      setBusy(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please log in to save jobs.");
        return;
      }

      if (saved) {
        const { error: deleteError } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);

        if (deleteError) throw deleteError;

        setSaved(false);
      } else {
        const { error: insertError } = await supabase
          .from("saved_jobs")
          .insert({
            user_id: user.id,
            job_id: jobId,
          });

        if (insertError && insertError.code !== "23505") {
          throw insertError;
        }

        setSaved(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update saved job."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleSaved}
        disabled={loading || busy}
        aria-pressed={saved}
        className={`rounded-lg border px-4 py-2 font-medium transition disabled:opacity-60 ${
          saved
            ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
            : "border-gray-700 text-gray-300 hover:border-yellow-500"
        }`}
      >
        {loading
          ? "Checking..."
          : busy
          ? "Saving..."
          : saved
          ? "★ Saved"
          : "☆ Save Job"}
      </button>

      {error && (
        <p className="mt-2 max-w-xs break-words text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
