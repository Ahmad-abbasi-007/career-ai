
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MatchingJob = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  job_type: string | null;
};

export async function GET(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailOnly = new URL(request.url).searchParams.get("emailOnly") === "true";
  const alerts: {
    id: string;
    keyword: string;
    location: string | null;
    job_type: string | null;
  }[] = [];
  let alertOffset = 0;
  const pageSize = 500;

  while (true) {
    let alertsQuery = supabase
      .from("job_alerts")
      .select("id, keyword, location, job_type")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(alertOffset, alertOffset + pageSize - 1);
    if (emailOnly) {
      alertsQuery = alertsQuery.eq("email_enabled", true);
    }

    const { data: alertPage, error: alertError } = await alertsQuery;
    if (alertError) {
      console.error("Could not load job alerts for matching:", alertError);
      return NextResponse.json(
        { error: "Could not load your active job alerts." },
        { status: 500 }
      );
    }

    alerts.push(...(alertPage ?? []));
    if (!alertPage || alertPage.length < pageSize) break;
    alertOffset += pageSize;
  }

  if (alerts.length === 0) {
    return NextResponse.json({ matches: [] });
  }

  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const matches: MatchingJob[] = [];
  let jobOffset = 0;

  while (matches.length < 100) {
    const { data: jobPage, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, company, location, job_type, skills, description")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(jobOffset, jobOffset + pageSize - 1);

    if (jobError) {
      console.error("Could not load jobs for alert matching:", jobError);
      return NextResponse.json(
        { error: "Could not search available jobs." },
        { status: 500 }
      );
    }

    for (const job of jobPage ?? []) {
      const matchesAlert = alerts.some((alert) => {
        const searchText = [
          job.title,
          job.company,
          job.skills,
          job.description,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ");
        const keywordMatch = normalize(searchText).includes(
          normalize(alert.keyword)
        );
        const locationMatch =
          !alert.location ||
          normalize(job.location ?? "").includes(normalize(alert.location));
        const typeMatch =
          !alert.job_type ||
          normalize(job.job_type ?? "") === normalize(alert.job_type);

        return keywordMatch && locationMatch && typeMatch;
      });

      if (matchesAlert) {
        matches.push({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          job_type: job.job_type,
        });
        if (matches.length === 100) break;
      }
    }

    if (!jobPage || jobPage.length < pageSize || matches.length === 100) break;
    jobOffset += pageSize;
  }

  return NextResponse.json({ matches });
}
