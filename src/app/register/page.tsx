"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function RegisterPage() {
  const supabase = createClient();

  const [accountType, setAccountType] = useState<"student" | "recruiter">(
    "student"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [companyDetails, setCompanyDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    if (
      accountType === "recruiter" &&
      (!companyName.trim() || !workEmail.trim())
    ) {
      setError("Company name and work email are required for recruiter signup.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          account_type: accountType,
          ...(accountType === "recruiter"
            ? {
                company_name: companyName.trim(),
                work_email: workEmail.trim(),
                website: website.trim(),
                company_details: companyDetails.trim(),
              }
            : {}),
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        accountType === "recruiter"
          ? "Recruiter request submitted. Your account will be available after the administrator approves your company details. Please check your email for verification."
          : "Student account created successfully. Please check your email and click the verification link."
      );
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-center text-3xl font-bold">
          Create Your <span className="text-blue-500">CareerAI</span> Account
        </h1>

        <p className="mt-3 text-center text-gray-400">
          Start managing your career with AI.
        </p>

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <fieldset>
            <legend className="mb-2 block text-sm font-medium">
              I want to join as
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={accountType === "student"}
                onClick={() => setAccountType("student")}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  accountType === "student"
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                aria-pressed={accountType === "recruiter"}
                onClick={() => setAccountType("recruiter")}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  accountType === "recruiter"
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                Admin / Recruiter
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Student accounts are activated automatically. Recruiter accounts
              require administrator approval.
            </p>
          </fieldset>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Name
            </label>

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {accountType === "recruiter" && (
            <div className="space-y-5 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div>
                <label
                  htmlFor="company-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Company name
                </label>
                <input
                  id="company-name"
                  type="text"
                  required
                  maxLength={160}
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Your registered company name"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="work-email"
                  className="mb-2 block text-sm font-medium"
                >
                  Company work email
                </label>
                <input
                  id="work-email"
                  type="email"
                  required
                  maxLength={254}
                  value={workEmail}
                  onChange={(event) => setWorkEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="company-website"
                  className="mb-2 block text-sm font-medium"
                >
                  Company website <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  id="company-website"
                  type="url"
                  maxLength={2048}
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://company.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="company-details"
                  className="mb-2 block text-sm font-medium"
                >
                  About the company
                </label>
                <textarea
                  id="company-details"
                  rows={3}
                  maxLength={2000}
                  value={companyDetails}
                  onChange={(event) => setCompanyDetails(event.target.value)}
                  placeholder="Share details that will help us verify your company."
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-blue-500/10 p-4 text-sm text-blue-400">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-500 hover:text-blue-400"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}