"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Resume = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
};

type Analysis = {
  score: number;
  summary: string;
  skills: string[];
  strengths: string[];
  missingKeywords: string[];
  improvements: string[];
  experienceLevel: string;
};

export default function ResumePage() {
  const supabase = createClient();

  const [resume, setResume] = useState<Resume | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  // Load current user's resume
  useEffect(() => {
    loadResume();
  }, []);

  async function loadResume() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please login first.");
      }

      const { data, error: resumeError } =
        await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (resumeError) {
        throw new Error(resumeError.message);
      }

      setResume(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load resume."
      );
    } finally {
      setLoading(false);
    }
  }

  // Upload resume
  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");
    setAnalysis(null);

    // PDF check
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    // 5MB check
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be smaller than 5MB.");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please login first.");
      }

      // Delete old resume first
      if (resume) {
        await supabase.storage
          .from("resumes")
          .remove([resume.file_path]);

        await supabase
          .from("resumes")
          .delete()
          .eq("id", resume.id);
      }

      // Create unique file name
      const filePath = `${user.id}/${crypto.randomUUID()}.pdf`;

      // Upload to Supabase Storage
      const { error: uploadError } =
        await supabase.storage
          .from("resumes")
          .upload(filePath, file, {
            contentType: "application/pdf",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Save metadata
      const { data, error: insertError } =
        await supabase
          .from("resumes")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
          })
          .select()
          .single();

      if (insertError) {
        // Remove uploaded file if database insert fails
        await supabase.storage
          .from("resumes")
          .remove([filePath]);

        throw new Error(insertError.message);
      }

      setResume(data);

      setMessage(
        "Resume uploaded successfully!"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Resume upload failed."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }

  // Open resume
  async function handleOpenResume() {
    if (!resume) {
      return;
    }

    setError("");

    try {
      const { data, error } =
        await supabase.storage
          .from("resumes")
          .createSignedUrl(
            resume.file_path,
            120
          );

      if (error || !data?.signedUrl) {
        throw new Error(
          error?.message ||
            "Could not create resume URL."
        );
      }

      window.open(
        data.signedUrl,
        "_blank"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open resume."
      );
    }
  }

  // Delete resume
  async function handleDelete() {
    if (!resume) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this resume?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const { error: storageError } =
        await supabase.storage
          .from("resumes")
          .remove([resume.file_path]);

      if (storageError) {
        throw new Error(
          storageError.message
        );
      }

      const { error: databaseError } =
        await supabase
          .from("resumes")
          .delete()
          .eq("id", resume.id);

      if (databaseError) {
        throw new Error(
          databaseError.message
        );
      }

      setResume(null);
      setAnalysis(null);

      setMessage(
        "Resume deleted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete resume."
      );
    }
  }

  // Analyze resume with Gemini
  async function handleAnalyze() {
    if (!resume) {
      setError(
        "Please upload a resume first."
      );
      return;
    }

    setAnalyzing(true);
    setAnalysisStep("Preparing your resume...");
    setMessage("");
    setError("");
    setAnalysis(null);

    try {
      setAnalysisStep("Downloading your resume...");
      const { data: blob, error: downloadError } =
        await supabase.storage
          .from("resumes")
          .download(resume.file_path);

      if (downloadError || !blob) {
        throw new Error(
          downloadError?.message || "Could not download resume for analysis."
        );
      }

      // Create File object
      const file = new File(
        [blob],
        resume.file_name,
        {
          type: "application/pdf",
        }
      );

      // FormData
      const formData = new FormData();

      formData.append(
        "file",
        file
      );

      setAnalysisStep("Gemini is analyzing your resume...");
      const response = await fetch(
        "/api/analyze-resume",
        {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(55_000),
        }
      );

      const result: {
        analysis?: Analysis;
        error?: string;
      } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gemini analysis failed."
        );
      }

      if (!result.analysis) {
        throw new Error(
          "Gemini returned an invalid resume analysis. Please try again."
        );
      }

      setAnalysis(
        result.analysis
      );

      setMessage(
        "Gemini AI resume analysis completed successfully!"
      );
    } catch (err) {
      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "Resume analysis timed out. Please try again."
          : err instanceof Error
          ? err.message
          : "Resume analysis failed."
      );
    } finally {
      setAnalyzing(false);
      setAnalysisStep("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-400">
            Loading resume...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-400">
            CareerAI
          </p>

          <h1 className="text-4xl font-bold">
            AI Resume Analyzer
          </h1>

          <p className="mt-3 max-w-2xl text-gray-400">
            Upload your resume and let Gemini AI
            analyze your skills, strengths,
            missing keywords, and improvements.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 rounded-lg border border-green-800 bg-green-950/40 px-4 py-3 text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {/* Upload Card */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">

          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Resume
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              PDF only • Maximum 5MB
            </p>
          </div>

          {!resume ? (
            <div className="rounded-xl border-2 border-dashed border-gray-700 p-10 text-center">

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/20 text-2xl">
                📄
              </div>

              <h3 className="text-lg font-semibold">
                Upload your resume
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Upload a PDF resume to start
                AI analysis.
              </p>

              <label className="mt-6 inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700">
                {uploading
                  ? "Uploading..."
                  : "Choose PDF"}

                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>
                  <p className="font-semibold">
                    {resume.file_name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {resume.file_size
                      ? `${(
                          resume.file_size /
                          1024 /
                          1024
                        ).toFixed(2)} MB`
                      : "PDF"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={
                      handleOpenResume
                    }
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-800"
                  >
                    View Resume
                  </button>

                  <label className="cursor-pointer rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-800">
                    Replace

                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={
                        handleUpload
                      }
                      disabled={uploading}
                    />
                  </label>

                  <button
                    onClick={handleDelete}
                    className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950"
                  >
                    Delete
                  </button>

                </div>
              </div>
            </div>
          )}
        </section>

        {/* AI Analyzer */}
        {resume && (
          <section className="mt-8 rounded-2xl border border-blue-900/50 bg-blue-950/20 p-6">

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div>
                <p className="text-sm font-semibold text-blue-400">
                  GEMINI AI
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Analyze Your Resume
                </h2>

                <p className="mt-2 max-w-xl text-gray-400">
                  Get an AI-powered evaluation of
                  your resume, including score,
                  skills, strengths, missing
                  keywords, and improvement
                  suggestions.
                </p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                aria-busy={analyzing}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing
                  ? "Analyzing..."
                  : "Analyze with Gemini"}
              </button>

            </div>

            {analyzing && (
              <p
                className="mt-4 text-sm text-blue-300"
                role="status"
                aria-live="polite"
              >
                {analysisStep}
              </p>
            )}
          </section>
        )}

        {/* Analysis */}
        {analysis && (
          <section className="mt-8 space-y-6">

            {/* Score */}
            <div className="grid gap-6 md:grid-cols-2">

              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">

                <p className="text-sm text-gray-400">
                  Resume Score
                </p>

                <div className="mt-4 text-6xl font-bold text-blue-400">
                  {analysis.score}
                  <span className="text-2xl text-gray-500">
                    /100
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-500">
                  AI-generated resume score
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">

                <p className="text-sm text-gray-400">
                  Experience Level
                </p>

                <div className="mt-5 text-3xl font-bold">
                  {analysis.experienceLevel}
                </div>

                <p className="mt-3 text-sm text-gray-500">
                  Based on your resume
                </p>
              </div>

            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

              <h2 className="text-xl font-bold">
                Resume Summary
              </h2>

              <p className="mt-4 leading-7 text-gray-300">
                {analysis.summary}
              </p>

            </div>

            {/* Skills */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

              <h2 className="text-xl font-bold">
                Detected Skills
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">

                {analysis.skills.map(
                  (skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full bg-blue-600/20 px-4 py-2 text-sm text-blue-300"
                    >
                      {skill}
                    </span>
                  )
                )}

              </div>
            </div>

            {/* Strengths */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

              <h2 className="text-xl font-bold">
                Strengths
              </h2>

              <ul className="mt-4 space-y-3">

                {analysis.strengths.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="flex gap-3 text-gray-300"
                    >
                      <span className="text-green-400">
                        ✓
                      </span>

                      <span>{item}</span>
                    </li>
                  )
                )}

              </ul>
            </div>

            {/* Missing Keywords */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

              <h2 className="text-xl font-bold">
                Missing Keywords
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">

                {analysis.missingKeywords.length >
                0 ? (
                  analysis.missingKeywords.map(
                    (keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="rounded-full bg-yellow-600/20 px-4 py-2 text-sm text-yellow-300"
                      >
                        {keyword}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-gray-400">
                    No major missing keywords
                    identified.
                  </p>
                )}

              </div>
            </div>

            {/* Improvements */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

              <h2 className="text-xl font-bold">
                Improvement Suggestions
              </h2>

              <ol className="mt-4 space-y-4">

                {analysis.improvements.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="flex gap-4 text-gray-300"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                        {index + 1}
                      </span>

                      <span className="pt-1">
                        {item}
                      </span>
                    </li>
                  )
                )}

              </ol>
            </div>

          </section>
        )}

      </div>
    </main>
  );
}