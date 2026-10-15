"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";

type AccountRole = "student" | "recruiter" | "super_admin";

type RecruiterCompany = {
  full_name: string | null;
  company_name: string;
  work_email: string;
  website: string | null;
  company_details: string | null;
  status: string;
};

function isAccountRole(role: string): role is AccountRole {
  return role === "student" || role === "recruiter" || role === "super_admin";
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole | null>(null);
  const [roleStatus, setRoleStatus] = useState("");
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [primaryStatusKnown, setPrimaryStatusKnown] = useState(false);
  const [company, setCompany] = useState<RecruiterCompany | null>(null);
  const [companyFullName, setCompanyFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWorkEmail, setCompanyWorkEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDetails, setCompanyDetails] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: roleRecord, error: roleError } = await supabase
          .from("user_roles")
          .select("role, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) throw roleError;
        if (!roleRecord || !isAccountRole(roleRecord.role)) {
          throw new Error("Your account role could not be verified.");
        }

        if (roleRecord.role === "super_admin") {
          const { data: adminRecord, error: adminError } = await supabase
            .from("super_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (adminError) throw adminError;
          if (!adminRecord) {
            throw new Error("Super Admin access could not be verified.");
          }
          if (isMounted) {
            setIsPrimaryAdmin(
              user.email?.toLowerCase() === "ar3359499@gmail.com"
            );
            setPrimaryStatusKnown(true);
          }
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!isMounted) return;

        setUserId(user.id);
        setEmail(user.email || data?.email || "");
        setRole(roleRecord.role);
        setRoleStatus(roleRecord.status);
        setFullName(data?.full_name || "");
        setJobTitle(data?.job_title || "");
        setBio(data?.bio || "");
        setSkills(data?.skills || "");
        setEducation(data?.education || "");
        setExperience(data?.experience || "");

        if (roleRecord.role === "recruiter") {
          const { data: companyRecord, error: companyError } = await supabase
            .from("recruiter_requests")
            .select(
              "full_name, company_name, work_email, website, company_details, status"
            )
            .eq("user_id", user.id)
            .maybeSingle();

          if (companyError) throw companyError;
          setCompany(companyRecord);
          setCompanyFullName(companyRecord?.full_name || "");
          setCompanyName(companyRecord?.company_name || "");
          setCompanyWorkEmail(companyRecord?.work_email || "");
          setCompanyWebsite(companyRecord?.website || "");
          setCompanyDetails(companyRecord?.company_details || "");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Could not load profile.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!userId) throw new Error("Your account could not be verified. Please log in again.");

      const { error: saveError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName.trim(),
          email: email.trim(),
          job_title: jobTitle.trim(),
          bio: bio.trim(),
          skills: skills.trim(),
          education: education.trim(),
          experience: experience.trim(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (saveError) throw saveError;
      setMessage("Profile saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCompanySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCompany(true);
    setMessage("");
    setError("");

    try {
      if (!company) throw new Error("Your company profile could not be loaded.");
      const { error: updateError } = await supabase.rpc(
        "update_recruiter_company_profile",
        {
          p_full_name: companyFullName.trim(),
          p_company_name: companyName.trim(),
          p_work_email: companyWorkEmail.trim(),
          p_website: companyWebsite.trim(),
          p_company_details: companyDetails.trim(),
        }
      );
      if (updateError) throw updateError;

      setCompany({
        ...company,
        full_name: companyFullName.trim() || null,
        company_name: companyName.trim(),
        work_email: companyWorkEmail.trim(),
        website: companyWebsite.trim() || null,
        company_details: companyDetails.trim() || null,
      });
      setMessage("Company profile updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update company profile."
      );
    } finally {
      setSavingCompany(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Use a new password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }
    if (!email) {
      setPasswordError("Your sign-in email could not be verified.");
      return;
    }

    setChangingPassword(true);
    try {
      const { data: verified, error: verifyError } =
        await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

      if (verifyError) throw new Error("Your current password is incorrect.");
      if (!verified.user || verified.user.id !== userId) {
        throw new Error("The signed-in account could not be verified.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been changed.");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Could not change your password."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  const profileFields = [
    fullName,
    jobTitle,
    bio,
    skills,
    education,
    experience,
  ];

  const completedFields = profileFields.filter((field) => field.trim() !== "").length;

  const completion = Math.round((completedFields / profileFields.length) * 100);

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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
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
              {role === "student"
                ? "Complete your profile to get better AI job matches."
                : role === "recruiter"
                  ? "Review your recruiter and company information."
                  : "Review your Super Admin account information."}
            </p>
          </div>
          <AccountMenu />
        </div>

        {role === "student" && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Profile Completion</h2>
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
        )}

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

        {role === "student" && <form
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

        </form>}

        {role === "super_admin" && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-indigo-300">
                  Administrator account
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {fullName || "Super Admin"}
                </h2>
                <p className="mt-2 text-gray-400">{email}</p>
              </div>
              <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200">
                {primaryStatusKnown
                  ? isPrimaryAdmin
                    ? "Primary Super Admin"
                    : "Super Admin"
                  : "Super Admin"}{" "}
                · {roleStatus}
              </span>
            </div>
            <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Access level</p>
                <p className="mt-1 font-medium text-white">
                  {primaryStatusKnown && isPrimaryAdmin
                    ? "Primary Super Administrator"
                    : "Super Administrator"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account ID</p>
                <p className="mt-1 break-all font-mono text-sm text-gray-200">
                  {userId}
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-gray-400">
              {!primaryStatusKnown
                ? "Apply the account management SQL migration to show primary administrator details."
                : isPrimaryAdmin
                ? "You are the protected primary administrator. You can appoint or remove additional Super Admins, and this primary account cannot be removed."
                : "Your administrator permissions are verified against the Super Admin access list. You can manage recruiters and jobs, but cannot add or remove another Super Admin."}
            </p>
          </section>
        )}

        {role === "recruiter" && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
            {company ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-indigo-300">
                      Company profile
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {company.company_name}
                    </h2>
                    <p className="mt-2 text-gray-300">
                      {company.full_name || fullName || "Recruiter"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      company.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : company.status === "rejected"
                          ? "bg-red-500/10 text-red-300"
                          : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {company.status}
                  </span>
                </div>
                <form onSubmit={handleCompanySave} className="mt-8 space-y-5 border-t border-white/10 pt-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="company-contact-name" className="mb-2 block text-sm font-medium text-gray-200">
                        Contact name
                      </label>
                      <input id="company-contact-name" value={companyFullName} onChange={(event) => setCompanyFullName(event.target.value)} maxLength={160} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label htmlFor="company-name" className="mb-2 block text-sm font-medium text-gray-200">
                        Company name
                      </label>
                      <input id="company-name" required value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={160} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label htmlFor="company-work-email" className="mb-2 block text-sm font-medium text-gray-200">
                        Company work email
                      </label>
                      <input id="company-work-email" type="email" required value={companyWorkEmail} onChange={(event) => setCompanyWorkEmail(event.target.value)} maxLength={254} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label htmlFor="company-website" className="mb-2 block text-sm font-medium text-gray-200">
                        Company website
                      </label>
                      <input id="company-website" type="url" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} maxLength={2048} placeholder="https://company.com" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="company-details" className="mb-2 block text-sm font-medium text-gray-200">
                      About the company
                    </label>
                    <textarea id="company-details" value={companyDetails} onChange={(event) => setCompanyDetails(event.target.value)} maxLength={5000} rows={5} className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                  </div>
                  <button type="submit" disabled={savingCompany} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {savingCompany ? "Saving company..." : "Save company profile"}
                  </button>
                </form>
              </>
            ) : (
              <div>
                <h2 className="text-xl font-semibold">Company profile unavailable</h2>
                <p className="mt-2 text-gray-400">
                  No company details are linked to this recruiter account yet.
                  Contact the Super Admin to complete the company profile.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-xl font-bold">Change password</h2>
          <p className="mt-2 text-sm text-gray-400">
            Verify your current password before choosing a new one.
          </p>
          {passwordMessage && (
            <p role="status" className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {passwordMessage}
            </p>
          )}
          {passwordError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {passwordError}
            </p>
          )}
          <form onSubmit={handlePasswordChange} className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="current-password" className="mb-2 block text-sm font-medium">
                Current password
              </label>
              <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
                New password
              </label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
                Confirm new password
              </label>
              <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
            </div>
            <button type="submit" disabled={changingPassword} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
              {changingPassword ? "Changing password..." : "Change password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}