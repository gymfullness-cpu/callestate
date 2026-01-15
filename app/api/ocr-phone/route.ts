import { NextResponse } from "next/server";
import OpenAI from "openai";


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
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Brak URL obrazu" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Jesteś ekspertem OCR. Odczytujesz NUMER TELEFONU z obrazu.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Odczytaj numer telefonu z obrazu.
Zwróć TYLKO numer telefonu.
Jeśli numeru nie ma †’ napisz "BRAK NUMERU".
              `,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content;

    return NextResponse.json({
      success: true,
      phone: text,
    });
  } catch (error: any) {
    console.error("OCR PHONE ERROR:", error);

    return NextResponse.json(
      {
        error: "Błąd OCR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
