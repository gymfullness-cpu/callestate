import { NextResponse } from "next/server";
import OpenAI from "openai";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Import runtime, |eby build nie evaluowaB moduBu OpenAI bez env
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default as any;

  return new OpenAI({ apiKey });
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Funkcja do ekstrakcji JSON z tekstu
function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// GB�wna funkcja POST do transkrypcji i analizy
export async function POST(req: Request) {
  
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    // Walidacja obecno[ci pliku
    if (!file) {
      return NextResponse.json({ success: false, error: "Brak audio" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1�<�9�9� Transkrypcja
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: file.type }),
      model: "gpt-4o-mini-transcribe",
    });

    // Sprawdzenie, czy transkrypcja zawiera tekst
    const text = transcription.text;
    if (!text) {
      return NextResponse.json({
        success: false,
        error: "Transkrypcja nie zawiera tekstu",
      });
    }

    // 2�<�9�9� Analiza AI (Zastosowanie modelu GPT do analizy)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Zwracaj WY��CZNIE czysty JSON. Bez markdown, bez ```.",
        },
        {
          role: "user",
          content: `
Wycignij dane z notatki gBosowej.

Zwr�:
{
  "name": string | null,
  "phone": string | null,
  "preferences": string,
  "meetingDate": string | null
}

Tekst:
${text}
`,
        },
      ],
    });

    // Odczytanie odpowiedzi z modelu
    const raw = completion.choices[0].message.content || "";
    const parsed = extractJSON(raw);

    // Sprawdzenie, czy odpowiedz jest poprawnym JSON
    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: "Nie udaBo si sparsowa JSON",
        raw,
      });
    }

    // Zwr�cenie odpowiedzi w odpowiednim formacie
    return NextResponse.json({
      success: true,
      transcript: text,
      clientName: parsed.name ?? null,
      phone: parsed.phone ?? null,
      preferences: parsed.preferences ?? "",
      meeting: parsed.meetingDate
        ? {
            date: parsed.meetingDate.split("T")[0],
            time: parsed.meetingDate.split("T")[1]?.slice(0, 5),
          }
        : null,
    });
  } catch (err: any) {
    console.error("VOICE API ERROR:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Nieoczekiwany bBd",
    });
  }
}