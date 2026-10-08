"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Resume = {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
};

export default function ResumePage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [resume, setResume] = useState<Resume | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResume() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setError(error.message);
      }

      if (data) {
        setResume(data);
      }

      setLoading(false);
    }

    loadResume();
  }, [router, supabase]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");
    setError("");

    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !userId) {
      setError("Please select a PDF resume first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      // Delete previous resume if it exists
      if (resume) {
        await supabase.storage
          .from("resumes")
          .remove([resume.file_path]);

        await supabase
          .from("resumes")
          .delete()
          .eq("id", resume.id);
      }

      const fileExtension = selectedFile.name.split(".").pop() || "pdf";

      const filePath = `${userId}/${crypto.randomUUID()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data, error: databaseError } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
        })
        .select()
        .single();

      if (databaseError) {
        await supabase.storage
          .from("resumes")
          .remove([filePath]);

        throw new Error(databaseError.message);
      }

      setResume(data);
      setSelectedFile(null);

      setMessage("Resume uploaded successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!resume) return;

    setError("");

    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resume.file_path, 60);

    if (error) {
      setError(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete() {
    if (!resume) return;

    setDeleting(true);
    setMessage("");
    setError("");

    try {
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([resume.file_path]);

      if (storageError) {
        throw new Error(storageError.message);
      }

      const { error: databaseError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);

      if (databaseError) {
        throw new Error(databaseError.message);
      }

      setResume(null);
      setMessage("Resume deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting."
      );
    } finally {
      setDeleting(false);
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "Unknown size";

    const mb = bytes / (1024 * 1024);

    return `${mb.toFixed(2)} MB`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading resume...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-5 text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-4xl font-bold">
            My <span className="text-blue-500">Resume</span>
          </h1>

          <p className="mt-2 text-gray-400">
            Upload your resume and prepare it for AI analysis.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            ❌ {error}
          </div>
        )}

        {/* Upload Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">

          <h2 className="text-2xl font-bold">
            Upload Resume
          </h2>

          <p className="mt-2 text-gray-400">
            Upload your latest resume in PDF format.
          </p>

          <div className="mt-6 rounded-xl border-2 border-dashed border-gray-700 p-8 text-center">

            <div className="text-5xl">
              📄
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              Choose your resume
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              PDF only · Maximum 5MB
            </p>

            <label className="mt-6 inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700">
              Choose PDF

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {selectedFile && (
              <div className="mt-5 rounded-lg bg-gray-900 p-4">
                <p className="font-medium">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            )}

          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading Resume..." : "Upload Resume"}
          </button>

        </div>

        {/* Existing Resume */}
        {resume && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>
                <p className="text-sm text-gray-500">
                  Current Resume
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  {resume.file_name}
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  {formatFileSize(resume.file_size)}
                </p>
              </div>

              <div className="flex gap-3">

                <button
                  onClick={handleDownload}
                  className="rounded-lg border border-gray-700 px-5 py-3 font-semibold hover:bg-gray-800"
                >
                  View Resume
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* AI Coming Soon */}
        {resume && (
          <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-8">

            <div className="flex items-start gap-4">

              <div className="text-4xl">
                🤖
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  AI Resume Analysis
                </h2>

                <p className="mt-2 text-gray-400">
                  Your resume is ready for the next step.
                  Soon CareerAI will analyze your resume,
                  identify skills, detect missing keywords,
                  and provide improvement suggestions.
                </p>

                <span className="mt-4 inline-block rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
                  Coming in Day 6
                </span>
              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}