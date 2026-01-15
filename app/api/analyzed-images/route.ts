import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  
    const client = getOpenAI();
    if (!client) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
try {
    const body = await req.json().catch(() => ({}));
    const { images } = body as { images?: unknown };

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Brak poprawnych linków do zdjć™ć‡" },
        { status: 400 }
      );
    }

    const cleanedImages = images
      .filter((u): u is string => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (cleanedImages.length === 0) {
      return NextResponse.json(
        { error: "Brak poprawnych linków do zdjć™ć‡" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Brak OPENAI_API_KEY w env" },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // … content z literalami: kluczowe, żeby TS nie robił "type: string"
    const content = [
      {
        type: "text" as const,
        text:
          "Przeanalizuj stan techniczny nieruchomości na podstawie zdjć™ć‡. " +
          "Opisz standard wykończenia, zużycie, ewentualne wady.",
      },
      ...cleanedImages.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      })),
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const result = response.choices?.[0]?.message?.content;

    if (!result) {
      return NextResponse.json(
        { error: "AI nie zwróciło analizy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Nieznany błąd";

    return NextResponse.json(
      { error: "Błąd serwera API", details: message },
      { status: 500 }
    );
  }
}
