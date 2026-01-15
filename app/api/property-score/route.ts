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
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  
    const client = getOpenAI();
    if (!client) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
try {
    const {
      city,
      district,
      area,
      price,
      condition,
    } = await req.json();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Jesteś analitykiem rynku nieruchomości w Polsce.

Dane nieruchomości:
Miasto: ${city}
Dzielnica: ${district}
Metraż: ${area} m2
Cena: ${price} zł
Stan techniczny: ${condition}

Zadanie:
1. Oceń czy cena jest niska / rynkowa / wysoka
2. Porównaj do średnich cen w tej dzielnicy i mieście
3. Podaj SCORE 0—100
4. Krótki komentarz inwestycyjny

Odpowiedz w prostym tekście.
`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      score: response.output_text,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Błąd scoringu" },
      { status: 500 }
    );
  }
}
