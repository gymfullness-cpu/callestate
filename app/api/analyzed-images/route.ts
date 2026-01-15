import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bezpieczny helper – OpenAI inicjalizowany dopiero w runtime
 * (ważne dla builda Vercel / Turbopack)
 */
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default;
  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  try {
    const client = getOpenAI();
    if (!client) {
      return NextResponse.json(
        {
          error: "Missing OPENAI_API_KEY",
          details: "Ustaw OPENAI_API_KEY w Vercel → Project Settings → Environment Variables.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body?.imageBase64) {
      return NextResponse.json(
        { error: "Brak obrazu do analizy (imageBase64)" },
        { status: 400 }
      );
    }

    const imageBase64: string = body.imageBase64;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Przeanalizuj obraz nieruchomości.
Opisz:
- typ nieruchomości
- stan wizualny
- potencjalne atuty sprzedażowe
- co warto poprawić przed sprzedażą

Odpowiadaj po polsku, konkretnie, w punktach.
              `.trim(),
            },
            {
              type: "input_image",
              image_base64: imageBase64,
            },
          ],
        },
      ],
      max_output_tokens: 400,
      temperature: 0.2,
    });

    const text =
      response.output_text?.trim() ||
      "Nie udało się wygenerować analizy obrazu.";

    return NextResponse.json({ ok: true, analysis: text });
  } catch (e: any) {
    console.error("ANALYZED IMAGES ERROR:", e);
    return NextResponse.json(
      { error: "Błąd analizy obrazu", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
