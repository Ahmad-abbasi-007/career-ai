import { GoogleGenAI, ThinkingLevel } from "@google/genai";

type ResumeAnalysis = {
  score: number;
  summary: string;
  skills: string[];
  strengths: string[];
  missingKeywords: string[];
  improvements: string[];
  experienceLevel: "Entry Level" | "Junior" | "Mid Level" | "Senior" | "Not Clear";
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isResumeAnalysis(value: unknown): value is ResumeAnalysis {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.score === "number" &&
    Number.isInteger(analysis.score) &&
    analysis.score >= 0 &&
    analysis.score <= 100 &&
    typeof analysis.summary === "string" &&
    isStringArray(analysis.skills) &&
    isStringArray(analysis.strengths) &&
    isStringArray(analysis.missingKeywords) &&
    isStringArray(analysis.improvements) &&
    ["Entry Level", "Junior", "Mid Level", "Senior", "Not Clear"].some(
      (level) => level === analysis.experienceLevel
    )
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error: "Gemini is not configured. Set the GEMINI_API_KEY environment variable.",
        },
        {
          status: 500,
        }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        {
          error: "No resume file was provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.type !== "application/pdf") {
      return Response.json(
        {
          error: "Only PDF resumes are supported.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        {
          error: "Resume must be smaller than 5MB.",
        },
        {
          status: 400,
        }
      );
    }

    // Convert uploaded PDF to Base64
    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const base64Pdf = buffer.toString("base64");

    const prompt = `
You are CareerAI, an expert AI resume analyzer.

Analyze the uploaded resume carefully.

Return ONLY valid JSON.

Use exactly this structure:

{
  "score": 0,
  "summary": "",
  "skills": [],
  "strengths": [],
  "missingKeywords": [],
  "improvements": [],
  "experienceLevel": ""
}

Rules:

- score must be between 0 and 100.
- summary must be a short professional summary.
- skills must contain skills explicitly found in the resume.
- strengths must contain important strengths demonstrated by the resume.
- missingKeywords should contain useful job-related keywords that are missing or weak.
- improvements should contain practical suggestions.
- Keep each list concise, with no more than 6 short items per list.
- experienceLevel must be exactly one of:
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Not Clear"

Do not invent companies, degrees, jobs, dates, skills, or experience.

Only use information supported by the resume.

Return JSON only.
Do not use Markdown.
Do not use code fences.
`;

    // Flash-Lite prioritizes low latency for this structured extraction task.
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 25_000,
        retryOptions: {
          attempts: 2,
          initialDelay: 0.5,
          maxDelay: 1,
          jitter: 0.2,
        },
      },
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            score: { type: "integer", minimum: 0, maximum: 100 },
            summary: { type: "string" },
            skills: { type: "array", maxItems: 6, items: { type: "string" } },
            strengths: { type: "array", maxItems: 6, items: { type: "string" } },
            missingKeywords: { type: "array", maxItems: 6, items: { type: "string" } },
            improvements: { type: "array", maxItems: 6, items: { type: "string" } },
            experienceLevel: {
              type: "string",
              enum: ["Entry Level", "Junior", "Mid Level", "Senior", "Not Clear"],
            },
          },
          required: [
            "score",
            "summary",
            "skills",
            "strengths",
            "missingKeywords",
            "improvements",
            "experienceLevel",
          ],
          additionalProperties: false,
        },
      },
    });

    const output = response.text;

    if (!output) {
      return Response.json(
        {
          error: "Gemini could not analyze this resume. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    // Remove Markdown code fences if Gemini adds them
    const cleanedOutput = output
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let analysis: unknown;

    try {
      analysis = JSON.parse(cleanedOutput);
    } catch {
      console.error("Gemini returned invalid JSON for resume analysis.");

      return Response.json(
        {
          error: "Gemini returned an invalid JSON response. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    if (!isResumeAnalysis(analysis)) {
      console.error("Gemini returned resume analysis with an invalid shape.");

      return Response.json(
        {
          error: "Gemini returned an invalid resume analysis. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error(
      "Gemini resume analysis error:",
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "";
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : Number(errorMessage.match(/\b(404|429|503|504)\b/)?.[1]);

    if (statusCode === 429 || statusCode === 503 || statusCode === 504) {
      return Response.json(
        {
          error:
            "Gemini is temporarily busy. Please wait a few seconds and try again.",
        },
        {
          status: statusCode,
        }
      );
    }

    if (statusCode === 404) {
      return Response.json(
        {
          error:
            "The Gemini model configured for resume analysis is unavailable. Please contact the administrator.",
        },
        {
          status: 503,
        }
      );
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "RequestTimeoutError" ||
        error.name === "AbortError")
    ) {
      return Response.json(
        {
          error:
            "Resume analysis timed out. Please try again in a moment.",
        },
        {
          status: 504,
        }
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini resume analysis failed.",
      },
      {
        status: 500,
      }
    );
  }
}