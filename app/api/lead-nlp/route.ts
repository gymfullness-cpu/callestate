import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Import runtime, żeby build nie evaluował modułu OpenAI bez env
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default as any;

  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Brak pola text" }, { status: 400 });
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Jesteś asystentem nieruchomości w Polsce.
Analizujesz preferencje klienta zapisane potocznym językiem.
Zwracasz TYLKO JSON bez żadnego tekstu.

ZASADY:
- jeśli pada dzielnica Warszawy → city = Warszawa
- rozpoznawaj odmiany (Mokotowie, Żoliborzu itd.)
- rozpoznawaj widełki cenowe (do, od, -, mln, tys)
- rozpoznawaj pokoje, windę, metro (metro ignoruj, informacyjnie)
- nic nie zgaduj jeśli brak danych

FORMAT:
{
  city: string | null,
  district: string | null,
  rooms: number | null,
  priceMin: number | null,
  priceMax: number | null,
  elevator: boolean | null,
  rawText: string
}
          `.trim(),
        },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";

    // Bezpieczne parsowanie nawet jeśli model doda coś obok JSON
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Błąd serwera", details: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
