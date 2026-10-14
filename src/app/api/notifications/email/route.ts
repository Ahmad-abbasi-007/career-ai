import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!apiKey || !from || !supabaseUrl || !supabaseKey) {
      return Response.json(
        {
          error: "Email service or Supabase configuration is missing.",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    const token = authorization.slice("Bearer ".length).trim();

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return Response.json(
        { error: "Your authenticated email could not be verified." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (
      !subject ||
      !message ||
      subject.length > 120 ||
      message.length > 3000
    ) {
      return Response.json(
        {
          error:
            "Provide a subject (max 120 characters) and message (max 3000 characters).",
        },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [user.email],
      subject,
      text: message,
    });

    if (error) {
      console.error("Resend error:", error);

      return Response.json(
        {
          error:
            "Email could not be sent. Check your Resend sender configuration.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: "Email accepted by the email provider.",
      id: data?.id,
    });
  } catch (error) {
    console.error("Email notification error:", error);

    return Response.json(
      { error: "Could not process the email notification." },
      { status: 500 }
    );
  }
}
