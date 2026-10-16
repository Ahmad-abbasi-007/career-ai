import { Resend } from "resend";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    const requestBody = await request.text();
    if (requestBody.length > 10_000) {
      return Response.json({ error: "Contact form submission is too large." }, { status: 413 });
    }
    body = JSON.parse(requestBody) as unknown;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "Invalid contact form submission." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";

  if (website) {
    return Response.json({ success: true });
  }

  if (
    !name ||
    name.length > 100 ||
    /[\r\n]/.test(name) ||
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !message ||
    message.length > 3000
  ) {
    return Response.json(
      { error: "Enter a valid name, email, and message (up to 3,000 characters)." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("Contact form email service is not configured.");
    return Response.json(
      { error: "The contact form is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: ["ar3359499@gmail.com"],
      replyTo: email,
      subject: `CareerAI contact message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    if (error) {
      console.error("Contact form email could not be sent:", {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
      return Response.json(
        { error: "Your message could not be sent. Please try again later." },
        { status: 502 }
      );
    }

    return Response.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Contact form request failed:", error);
    return Response.json(
      { error: "Your message could not be sent. Please try again later." },
      { status: 502 }
    );
  }
}
