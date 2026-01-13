?import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

/**
 * Minimalny �[HTML -> text�e bez bibliotek:
 * - usuwa skrypty/style
 * - wycina tagi
 * - kompresuje biaBe znaki
 */
function htmlToText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
}

/**
 * Wyci&ga JSON-LD (czsto portale trzymaj& tam cen"/metra|/tytuB)
 */
function extractJsonLd(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;

    // czasem jest kilka obiekt�w albo @graph
    try {
      const parsed = JSON.parse(raw);
      out.push(parsed);
    } catch {
      // czasem JSON-LD ma [mieci  pomijamy
    }
  }

  return out;
}

function safeNumber(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Normalizacja: score ma by! 110
 * - je[li model/legacy da 0100, przeliczamy
 */
function normalizeScoreTo10(raw: any): number | null {
  const n = safeNumber(raw);
  if (n === null) return null;

  if (n >= 1 && n <= 10) return Math.round(n);

  if (n >= 0 && n <= 100) {
    const s = Math.round((n / 100) * 10);
    return clamp(s === 0 ? 1 : s, 1, 10);
  }

  return clamp(Math.round(n), 1, 10);
}

export async function POST(req: Request) {
  
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
try {
    const body = await req.json();
    const url = String(body?.url || "").trim();
    const portal = String(body?.portal || "").trim();

    if (!url) {
      return NextResponse.json({ error: "Brak url" }, { status: 400 });
    }
    if (!url.startsWith("http")) {
      return NextResponse.json({ error: "URL musi zaczyna! si od http/https" }, { status: 400 });
    }

    // 1) Pobierz HTML ogBoszenia
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Nie udaBo si pobra! strony (${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // 2) Przygotuj �[pakiet danych�e dla AI: JSON-LD + tekst + fragment HTML
    const jsonLd = extractJsonLd(html);
    const text = htmlToText(html);

    // Uwaga: nie wysyBamy caBego HTML (tokeny), tylko sensowne skr�ty
    const htmlSlice = html.slice(0, 60000);
    const textSlice = text.slice(0, 25000);
    const jsonLdSlice = JSON.stringify(jsonLd).slice(0, 20000);

    // 3) Popro[ model o CZYSTY JSON analizy ogBoszenia
    //    (score 110, pros/cons, marketAssessment, views je[li da si znalez!)
    const prompt = `
Jeste[ analitykiem rynku nieruchomo[ci w Polsce. Analizujesz OG9�OSZENIE z portalu (np. Otodom/Gratka/Morizon).
Masz dane z HTML/JSON-LD/tekstu strony. Twoim celem jest:

- wyci&gn&! konkretne parametry oferty (tytuB, cena, metra|, lokalizacja, opis),
- policzy! pricePerM2,
- wypisa! pros/cons (max ~8/8, konkrety),
- stworzy! bardzo konkretn& rekomendacj" (co sprawdzi!, jak negocjowa!),
- da! SCORE w skali 110 (10 = bardzo dobra oferta),
- je[li w danych widzisz WYZWIETLENIA (views)  zwr� je jako liczb (w przeciwnym razie null).

Zwr� WY9�CZNIE czysty JSON bez markdown.
`;

    const schema = {
      name: "valuation_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          area: { type: ["number", "null"] },
          pricePerM2: { type: ["number", "null"] },
          city: { type: ["string", "null"] },
          district: { type: ["string", "null"] },
          street: { type: ["string", "null"] },
          description: { type: ["string", "null"] },

          // & bardzo dokBadna analiza:
          marketAssessment: { type: ["string", "null"] }, // np. "nisko / rynkowo / wysoko + dlaczego"
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },

          // & score 110
          score: { type: ["number", "null"] },

          recommendation: { type: ["string", "null"] },

          // & views je[li si da znalez!
          views: { type: ["number", "null"] },

          // debug: z czego model korzystaB (kr�tko)
          extractedFrom: { type: ["string", "null"] },
        },
        required: [
          "title",
          "price",
          "area",
          "pricePerM2",
          "city",
          "district",
          "street",
          "description",
          "marketAssessment",
          "pros",
          "cons",
          "score",
          "recommendation",
          "views",
          "extractedFrom",
        ],
      },
    } as const;

    const ai = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: prompt }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Portal (podpowiedz): ${portal || "nieznany"}
URL: ${url}

JSON-LD (fragment):
${jsonLdSlice}

TEXT (fragment):
${textSlice}

HTML (fragment):
${htmlSlice}
`,
            },
          ],
        },
      ],
      // & gwarantuje poprawny JSON
      text: {
        format: {
          type: "json_schema",
          ...schema,
        },
      },
    });

    // responses.create zwraca output_text jako gotowy JSON string
    const rawJson = ai.output_text || "{}";
    let analysis: any = {};
    try {
      analysis = JSON.parse(rawJson);
    } catch {
      analysis = {};
    }

    // 4) Normalizacja + wyliczenia bezpieczeDstwa
    const price = safeNumber(analysis.price);
    const area = safeNumber(analysis.area);

    // je[li model nie policzyB, policzmy
    let ppm2 = safeNumber(analysis.pricePerM2);
    if (ppm2 === null && price !== null && area !== null && area > 0) {
      ppm2 = Math.round(price / area);
    }

    // score 110
    const s10 = normalizeScoreTo10(analysis.score);

    const normalized = {
      ...analysis,
      price: price ?? null,
      area: area ?? null,
      pricePerM2: ppm2 ?? null,
      score: s10,
      views: safeNumber(analysis.views) ?? null,
      pros: Array.isArray(analysis.pros) ? analysis.pros.filter(Boolean) : [],
      cons: Array.isArray(analysis.cons) ? analysis.cons.filter(Boolean) : [],
    };

    return NextResponse.json({ analysis: normalized });
  } catch (e: any) {
    return NextResponse.json(
      { error: "BBd serwera", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
