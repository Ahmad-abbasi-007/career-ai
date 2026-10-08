export type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  skills: string | null;
  salary: string | null;
  job_type: string | null;
  application_url: string | null;
  created_at?: string;
};

export type CandidateProfile = {
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  bio: string | null;
  skills: string | null;
  education: string | null;
  experience: string | null;
};

export type JobMatchAnalysis = {
  matchScore: number;
  summary: string;
  matchingSkills: string[];
  missingSkills: string[];
  whyGoodMatch: string[];
  improvements: string[];
};