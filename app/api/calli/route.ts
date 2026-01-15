import OpenAI from "openai";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getMemory, saveMemory, Msg } from "../../../lib/calliMemory";

export const runtime = "nodejs";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function getOrCreateUserId(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/calli_uid=([^;]+)/);
  if (match?.[1]) return { userId: match[1], setCookie: null as string | null };

  const userId = crypto.randomUUID();
  const setCookie = `calli_uid=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
  return { userId, setCookie };
}

// helper: wyciągnij cytowania URL z odpowiedzi (url_citation annotations)
function extractUrlCitations(resp: any): Array<{ title?: string; url: string }> {
  const out: Array<{ title?: string; url: string }> = [];

  const outputItems = Array.isArray(resp?.output) ? resp.output : [];
  for (const item of outputItems) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const annotations = Array.isArray(part?.annotations) ? part.annotations : [];
      for (const ann of annotations) {
        if (ann?.type === "url_citation" && typeof ann?.url === "string") {
          out.push({
            title: typeof ann?.title === "string" ? ann.title : undefined,
            url: ann.url,
          });
        }
      }
    }
  }

  // usuń duplikaty po URL
  const seen = new Set<string>();
  return out.filter((x) => {
    if (!x.url) return false;
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

// normalizacja wiadomości do typu Msg[]
function toMsgArray(input: unknown): Msg[] {
  if (!Array.isArray(input)) return [];
  const out: Msg[] = [];

  for (const m of input as any[]) {
    const role = m?.role;
    const content = m?.content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      out.push({ role, content });
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        {
          error: "Missing OPENAI_API_KEY",
          details:
            "Ustaw OPENAI_API_KEY w .env.local (lokalnie) albo w Vercel -> Project Settings -> Environment Variables.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as any;
    const incomingMessages = toMsgArray(body?.messages);

    // Jeśli frontend wysyła coś innego niż {messages:[...]} to dostaniesz 400/500.
    if (!incomingMessages.length) {
      return NextResponse.json(
        { error: "bad_request", details: "Body musi zawierać messages: [{role, content}, ...]" },
        { status: 400 }
      );
    }

    const { userId, setCookie } = getOrCreateUserId(req);
    const mem = getMemory(userId) || { profile: "", messages: [] };

    // mniejszy kontekst = szybciej
    const lastMemMsgs: Msg[] = toMsgArray(mem.messages).slice(-12);
    const userMsgs: Msg[] = incomingMessages.slice(-12);

    const vectorStoreId = process.env.CALLI_VECTOR_STORE_ID?.trim();

    const system = `
Jesteś Calli Chat — ekspert od nieruchomości (PL) i asystent ogólny.

Zasady:
- Odpowiadaj po polsku, krótko i konkretnie.
- Jeśli temat może być aktualny / zmienny (terminy, opłaty, procedury, przepisy, urzędy) → użyj WEB SEARCH.
- Jeśli temat jest z Twojej bazy wiedzy → użyj FILE SEARCH.
- Dawaj kroki "co zrobić", checklisty dokumentów.
- Jeśli brakuje danych (miasto, rodzaj prawa: własność/spółdzielcze, KW) → dopytaj.
- Nie zmyślaj. Jeśli korzystasz z internetu, podaj źródła.
- Dodaj zdanie: "To informacja ogólna, nie porada prawna."

Preferowane źródła:
- gov.pl, ms.gov.pl, isap.sejm.gov.pl, podatki.gov.pl, biznes.gov.pl

Profil użytkownika:
${mem.profile || "(brak)"}
`.trim();

    // Tools: web_search zawsze + file_search jeśli masz vector store
    const tools: any[] = [{ type: "web_search" }];
    if (vectorStoreId) {
      tools.push({ type: "file_search", vector_store_ids: [vectorStoreId] });
    }

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      tools,
      temperature: 0.2,
      max_output_tokens: 500,
      input: [{ role: "system", content: system }, ...lastMemMsgs, ...userMsgs],
    });

    const reply = (resp.output_text || "").trim() || "Nie udało mi się wygenerować odpowiedzi.";
    const sources = extractUrlCitations(resp);

    // update pamięci
    const assistantMsg: Msg = { role: "assistant", content: reply };
    const merged: Msg[] = [...lastMemMsgs, ...userMsgs, assistantMsg].slice(-40);

    const prof = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      input: [
        {
          role: "system",
          content:
            "Zaktualizuj krótki profil użytkownika w 1–2 zdaniach (rola, miasto, preferencje odpowiedzi). Jeśli brak nowych faktów: zwróć bez zmian.",
        },
        {
          role: "user",
          content: `STARY PROFIL:\n${mem.profile}\n\nNOWA ROZMOWA:\n${merged
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}`,
        },
      ],
    });

    const newProfile = (prof.output_text || mem.profile).trim();

    saveMemory({
      userId,
      profile: newProfile,
      messages: merged,
      updatedAt: Date.now(),
    });

    const res = NextResponse.json({ reply, sources });
    if (setCookie) res.headers.set("Set-Cookie", setCookie);
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: "calli_api_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
