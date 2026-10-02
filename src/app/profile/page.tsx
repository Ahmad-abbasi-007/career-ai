"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
      }

      if (data) {
        setFullName(data.full_name || "");
        setEmail(data.email || user.email || "");
        setJobTitle(data.job_title || "");
        setBio(data.bio || "");
        setSkills(data.skills || "");
        setEducation(data.education || "");
        setExperience(data.experience || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        email,
        job_title: jobTitle,
        bio,
        skills,
        education,
        experience,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      setError(error.message);
    } else {
      setMessage("Profile saved successfully!");
    }

    setSaving(false);
  }

  const profileFields = [
    fullName,
    jobTitle,
    bio,
    skills,
    education,
    experience,
  ];

  const completedFields = profileFields.filter(
    (field) => field.trim() !== ""
  ).length;

  const completion = Math.round(
    (completedFields / profileFields.length) * 100
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading profile...</p>
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
            My <span className="text-blue-500">Profile</span>
          </h1>

          <p className="mt-2 text-gray-400">
            Complete your profile to get better AI job matches.
          </p>
        </div>

        {/* Profile Completion */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Profile Completion
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Complete your profile for better career recommendations.
              </p>
            </div>

            <span className="text-2xl font-bold text-blue-400">
              {completion}%
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            ✅ {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            ❌ {error}
          </div>
        )}

        {/* Profile Form */}
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8"
        >

          {/* Name + Email */}
          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmad Raza"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-400"
              />
            </div>

          </div>

          {/* Job Title */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Job Title
            </label>

            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Frontend Developer"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Skills
            </label>

            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, Next.js, TypeScript, Tailwind CSS"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Example: React, Next.js, JavaScript, TypeScript
            </p>
          </div>

          {/* Education */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Education
            </label>

            <textarea
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="BS Computer Science - COMSATS University"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Experience
            </label>

            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Frontend Developer Intern - 2026"
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving Profile..." : "Save Profile"}
          </button>

        </form>
      </div>
    </main>
  );
}