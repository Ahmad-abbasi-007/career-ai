"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase";

type Question = {
  question: string;
  difficulty: string;
};

type Questions = {
  technical: Question[];
  behavioral: Question[];
  hr: Question[];
};

type Evaluation = {
  score: number;
  rating: string;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  betterAnswer: string;
};

export default function InterviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [questions, setQuestions] = useState<Questions | null>(null);

  const [selectedQuestion, setSelectedQuestion] =
    useState("");

  const [answer, setAnswer] = useState("");

  const [evaluation, setEvaluation] =
    useState<Evaluation | null>(null);

  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        if (userError) {
          throw userError;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("job_title")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!cancelled && data?.job_title) {
          setJobTitle(data.job_title);
        }
      } catch (err) {
        console.error("Could not load interview profile:", err);

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load profile."
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function generateQuestions() {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");
      setQuestions(null);
      setSelectedQuestion("");
      setAnswer("");
      setEvaluation(null);

      const response = await fetch(
        "/api/interview/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle,
            jobDescription,
          }),
        }
      );

      const result: {
        questions?: Questions;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not generate interview questions."
        );
      }

      if (
        !result.questions ||
        !Array.isArray(result.questions.technical) ||
        !Array.isArray(result.questions.behavioral) ||
        !Array.isArray(result.questions.hr)
      ) {
        throw new Error("The interview API returned invalid questions.");
      }

      setQuestions(result.questions);

      setMessage(
        "AI interview questions generated successfully!"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Question generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function evaluateAnswer() {
    if (!selectedQuestion) {
      setError("Please select an interview question.");
      return;
    }

    if (!answer.trim()) {
      setError("Please write your answer first.");
      return;
    }

    try {
      setEvaluating(true);
      setError("");
      setMessage("");
      setEvaluation(null);

      const response = await fetch(
        "/api/interview/evaluate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: selectedQuestion,
            answer,
            jobTitle,
            jobDescription,
          }),
        }
      );

      const result: {
        evaluation?: Evaluation;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not evaluate your answer."
        );
      }

      if (!result.evaluation) {
        throw new Error("The interview API returned an invalid evaluation.");
      }

      setEvaluation(result.evaluation);

      setMessage(
        "AI evaluation completed successfully!"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Answer evaluation failed."
      );
    } finally {
      setEvaluating(false);
    }
  }

  function renderQuestionList(
    title: string,
    items: Question[]
  ) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-xl font-bold">
          {title}
        </h2>

        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <button
              key={item.question}
              onClick={() => {
                setSelectedQuestion(item.question);
                setAnswer("");
                setEvaluation(null);
                setError("");
              }}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedQuestion === item.question
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-800 bg-gray-950 hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-200">
                  {index + 1}. {item.question}
                </span>

                <span className="shrink-0 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                  {item.difficulty}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 pb-10 pt-24 text-white">
      <Navbar />
      <div className="mx-auto max-w-6xl">
        {profileLoading && (
          <p className="mb-6 text-sm text-gray-400" role="status">
            Loading your profile...
          </p>
        )}

        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            🤖 AI Interview Coach
          </div>

          <h1 className="text-4xl font-bold md:text-5xl">
            Prepare for Your Interview
          </h1>

          <p className="mt-4 max-w-3xl text-gray-400">
            Generate job-specific interview questions
            and get AI-powered feedback on your answers.
          </p>
        </div>

        {/* Job Information */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-2xl font-bold">
            1. Job Information
          </h2>

          <div className="mt-6 space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Job Title
              </label>

              <input
                value={jobTitle}
                onChange={(e) =>
                  setJobTitle(e.target.value)
                }
                placeholder="e.g. Frontend Developer"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Job Description
              </label>

              <textarea
                value={jobDescription}
                onChange={(e) =>
                  setJobDescription(e.target.value)
                }
                rows={8}
                placeholder="Paste the job description here..."
                className="w-full resize-none rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={generateQuestions}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Generating Questions..."
                : "✨ Generate Interview Questions"}
            </button>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            ❌ {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
            ✓ {message}
          </div>
        )}

        {/* Questions */}
        {questions && (
          <section className="mt-8">
            <h2 className="mb-5 text-2xl font-bold">
              2. AI Interview Questions
            </h2>

            <div className="grid gap-6 lg:grid-cols-3">

              {renderQuestionList(
                "💻 Technical",
                questions.technical
              )}

              {renderQuestionList(
                "🧠 Behavioral",
                questions.behavioral
              )}

              {renderQuestionList(
                "👔 HR",
                questions.hr
              )}

            </div>
          </section>
        )}

        {/* Answer Section */}
        {selectedQuestion && (
          <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-2xl font-bold">
              3. Answer the Question
            </h2>

            <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
              <p className="text-sm text-blue-400">
                Selected Question
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {selectedQuestion}
              </p>
            </div>

            <textarea
              value={answer}
              onChange={(e) =>
                setAnswer(e.target.value)
              }
              maxLength={10_000}
              rows={8}
              placeholder="Write your interview answer here..."
              className="mt-5 w-full resize-none rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-right text-xs text-gray-500">
              {answer.length.toLocaleString()} / 10,000
            </p>

            <button
              onClick={evaluateAnswer}
              disabled={evaluating}
              className="mt-5 rounded-xl bg-purple-600 px-6 py-3 font-semibold transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {evaluating
                ? "AI is Evaluating..."
                : "🤖 Evaluate My Answer"}
            </button>
          </section>
        )}

        {/* Evaluation */}
        {evaluation && (
          <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">

            <h2 className="text-2xl font-bold">
              4. AI Evaluation
            </h2>

            {/* Score */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 text-center">
                <p className="text-sm text-gray-400">
                  Score
                </p>

                <p className="mt-2 text-6xl font-bold text-blue-400">
                  {evaluation.score}
                </p>

                <p className="mt-2 text-gray-400">
                  out of 100
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 text-center">
                <p className="text-sm text-gray-400">
                  Rating
                </p>

                <p className="mt-5 text-3xl font-bold">
                  {evaluation.rating}
                </p>
              </div>

            </div>

            {/* Feedback */}
            <div className="mt-6">
              <h3 className="text-xl font-bold">
                📝 Feedback
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                {evaluation.feedback}
              </p>
            </div>

            {/* Strengths */}
            <div className="mt-6">
              <h3 className="text-xl font-bold">
                💪 Strengths
              </h3>

              <ul className="mt-3 space-y-2">
                {evaluation.strengths.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-green-500/10 p-3 text-green-300"
                    >
                      ✓ {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="mt-6">
              <h3 className="text-xl font-bold">
                ⚠️ Weaknesses
              </h3>

              <ul className="mt-3 space-y-2">
                {evaluation.weaknesses.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-red-500/10 p-3 text-red-300"
                    >
                      • {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Improvements */}
            <div className="mt-6">
              <h3 className="text-xl font-bold">
                🚀 Improvements
              </h3>

              <ul className="mt-3 space-y-2">
                {evaluation.improvements.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-yellow-500/10 p-3 text-yellow-300"
                    >
                      → {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Better Answer */}
            <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950 p-5">
              <h3 className="text-xl font-bold">
                ⭐ Example of a Better Answer
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                {evaluation.betterAnswer}
              </p>
            </div>

          </section>
        )}
      </div>
    </main>
  );
}