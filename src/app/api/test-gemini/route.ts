import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function GET() {
  try {
    const interaction =
      await ai.interactions.create({
        model: "gemini-3.8-flash",
        input:
          "Say hello to CareerAI in one short sentence.",
      });

    return Response.json({
      success: true,
      message: interaction.output_text,
    });
  } catch (error) {
    console.error(
      "Gemini test error:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gemini test failed.",
      },
      {
        status: 500,
      }
    );
  }
}