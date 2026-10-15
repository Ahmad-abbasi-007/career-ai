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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid email request." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const subject =
      typeof input.subject === "string" ? input.subject.trim() : "";
    const message =
      typeof input.message === "string" ? input.message.trim() : "";

    if (
      !subject ||
      !message ||
      subject.length > 120 ||
      /[\r\n]/.test(subject) ||
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
  console.error("Resend error:", {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
  });

  return Response.json(
    {
      error: "The email provider could not send this message. Please try again later.",
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
