
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type QuestionType = "short_text" | "long_text" | "yes_no" | "number";

type ScreeningQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  sort_order: number;
};

export default function ApplyButton({ jobId }: { jobId: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionLoadFailed, setQuestionLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadApplyData() {
      try {
        const { data: questionData, error: questionError } = await supabase
          .from("job_screening_questions")
          .select(
            "id, question_text, question_type, is_required, sort_order"
          )
          .eq("job_id", jobId)
          .order("sort_order", { ascending: true });

        if (questionError) {
          throw questionError;
        }

        if (!cancelled) {
          setQuestions((questionData ?? []) as ScreeningQuestion[]);
        }

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

        const { data: application, error: applicationError } =
          await supabase
            .from("applications")
            .select("id")
            .eq("user_id", user.id)
            .eq("job_id", jobId)
            .maybeSingle();

        if (applicationError) {
          throw applicationError;
        }

        if (!cancelled) {
          setApplied(Boolean(application));
        }
      } catch (err) {
        console.error("Could not load application data:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the application form."
          );

          setQuestionLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApplyData();

    return () => {
      cancelled = true;
    };
  }, [jobId, supabase]);

  function updateAnswer(questionId: string, value: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  }

  async function applyForJob() {
    setApplying(true);
    setError("");

    let applicationCreated = false;

    try {
      if (questionLoadFailed) {
        throw new Error(
          "The screening questions could not be loaded. Refresh the page and try again."
        );
      }

      const missingRequiredQuestion = questions.find(
        (question) =>
          question.is_required && !(answers[question.id] ?? "").trim()
      );

      if (missingRequiredQuestion) {
        throw new Error(
          `Please answer the required question: ${missingRequiredQuestion.question_text}`
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Please log in before applying.");
      }

      const { data: application, error: insertError } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: "Applied",
        })
        .select("id")
        .single();

      if (insertError?.code === "23505") {
        setApplied(true);
        return;
      }

      if (insertError) {
        throw insertError;
      }

      applicationCreated = true;

      const answerRows = questions
        .filter((question) => (answers[question.id] ?? "").trim() !== "")
        .map((question) => ({
          application_id: application.id,
          question_id: question.id,
          user_id: user.id,
          job_id: jobId,
          answer: answers[question.id].trim(),
        }));

      if (answerRows.length > 0) {
        const { error: answerError } = await supabase
          .from("application_answers")
          .insert(answerRows);

        if (answerError) {
          console.error("Application answers could not be saved:", answerError);

          setApplied(true);

          throw new Error(
            "Your application was created, but your screening answers could not be saved. Please contact support before applying again."
          );
        }
      }

      setApplied(true);
    } catch (err) {
      console.error("Could not apply for job:", err);

      if (applicationCreated) {
        setApplied(true);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Could not apply for this job."
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
        Loading application form...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applied ? (
        <div className="space-y-3">
          <button
            type="button"
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
        <>
          {questions.length > 0 && (
            <div className="space-y-5 rounded-xl border border-gray-700 bg-gray-900/50 p-4 sm:p-5">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Application Questions
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Please answer the employer&apos;s questions below.
                  Questions marked with * are required.
                </p>
              </div>

              {questions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <label
                    htmlFor={`screening-${question.id}`}
                    className="block text-sm font-medium text-gray-200"
                  >
                    {index + 1}. {question.question_text}
                    {question.is_required && (
                      <span className="ml-1 text-red-400">*</span>
                    )}
                  </label>

                  {question.question_type === "long_text" ? (
                    <textarea
                      id={`screening-${question.id}`}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        updateAnswer(question.id, event.target.value)
                      }
                      required={question.is_required}
                      rows={4}
                      maxLength={5000}
                      placeholder="Write your answer..."
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                    />
                  ) : question.question_type === "yes_no" ? (
                    <select
                      id={`screening-${question.id}`}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        updateAnswer(question.id, event.target.value)
                      }
                      required={question.is_required}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-white outline-none focus:border-blue-500"
                    >
                      <option value="">Select an answer</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    <input
                      id={`screening-${question.id}`}
                      type={
                        question.question_type === "number"
                          ? "number"
                          : "text"
                      }
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        updateAnswer(question.id, event.target.value)
                      }
                      required={question.is_required}
                      maxLength={
                        question.question_type === "short_text"
                          ? 500
                          : undefined
                      }
                      placeholder={
                        question.question_type === "number"
                          ? "Enter a number"
                          : "Write your answer..."
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-white outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={applyForJob}
            disabled={applying || questionLoadFailed}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {applying
              ? "Submitting Application..."
              : questions.length > 0
                ? "Submit Application"
                : "Apply & Track Job"}
          </button>
        </>
      )}

      {error && (
        <p
          className="mt-3 break-words text-sm text-red-400"
          role="alert"
        >
          ❌ {error}
        </p>
      )}
    </div>
  );
}
