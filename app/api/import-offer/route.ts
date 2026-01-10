import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Import runtime, żeby build nie wywalał się przy braku env
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default as any;

  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json().catch(() => ({}))) as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Brak poprawnego url" }, { status: 400 });
    }

    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        {
          error: "Missing OPENAI_API_KEY",
          details:
            "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables (Production/Preview).",
        },
        { status: 500 }
      );
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      // na wszelki wypadek, żeby nie wisiało wiecznie w edge/build
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Nie udało się pobrać strony", details: `HTTP ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Jesteś agentem nieruchomości. Wyciągnij dane kontaktowe sprzedającego.",
        },
        {
          role: "user",
          content: `
Zwróć CZYSTY JSON (bez markdown):

{
  name: string | null,
  phone: string | null,
  email: string | null,
  description: string | null
}

HTML:
${html.slice(0, 8000)}
          `.trim(),
        },
      ],
    });

    const raw = ai.choices?.[0]?.message?.content ?? "{}";

    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {
      // jeśli model zwróci coś obok JSON, spróbuj wyciągnąć pierwszy obiekt { ... }
      const m = raw.match(/\{[\s\S]*\}/);
      data = m ? JSON.parse(m[0]) : {};
    }

    const prospect = {
      id: Date.now(),
      name: data?.name ?? null,
      phone: data?.phone ?? null,
      email: data?.email ?? null,
      description: data?.description ?? null,
      sourceUrl: url,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, prospect });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Błąd serwera", details: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
