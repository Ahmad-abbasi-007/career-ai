import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication is required." },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Could not verify Gemini diagnostic access:", adminError);
      return NextResponse.json(
        { success: false, error: "Could not verify administrator access." },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Administrator access is required." },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Could not authenticate Gemini diagnostic:", error);
    return NextResponse.json(
      { success: false, error: "Could not authenticate this request." },
      { status: 500 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY missing from .env.local" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Say hello to CareerAI in one short sentence." },
              ],
            },
          ],
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error?.message || `API error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Gemini responded, but returned no text.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Request failed.",
      },
      { status: 500 }
    );
  }
}