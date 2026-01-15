export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { matchProperties } from "@/app/lib/matching";

/* =========================
   OPENAI (lazy init)
========================= */
function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/* =========================
   TYPES
========================= */

type CoachObjection = {
  type:
    | "commission"
    | "no_agent"
    | "many_agents"
    | "think_about_it"
    | "price_too_high"
    | "exclusive_fear"
    | "open_only"
    | "trust"
    | "timing"
    | "other";
  evidence: string;
  response: string;
  question: string;
};

type CoachOutput = {
  speaker: "client" | "agent" | "unknown";
  stage: "rapport" | "needs" | "value" | "terms" | "close" | "unknown";
  tips: string[];
  nextLine: string | null;
  objections: CoachObjection[];
};

type AssistantAction =
  | {
      type: "create_lead";
      payload: { name: string; phone?: string | null; preferences?: string | null };
    }
  | {
      type: "create_calendar_event";
      payload: {
        date: string; // YYYY-MM-DD
        time: string; // HH:mm
        title: string;
        note?: string;
        eventType: "pozysk" | "prezentacja" | "umowa" | "inne";
      };
    }
  | {
      type: "create_followup";
      payload: {
        relatedName?: string | null;
        relatedId?: number | null;
        dueDate: string; // YYYY-MM-DD
        time?: string | null; // HH:mm (opcjonalnie)
        followupType: "pozysk" | "prezentacja";
      };
    }
  | { type: "create_contact"; payload: { name: string; phone?: string | null; email?: string | null } }
  | { type: "draft_sms"; payload: { toName?: string | null; toPhone?: string | null; message: string } }
  | { type: "draft_email"; payload: { toName?: string | null; toEmail?: string | null; subject: string; body: string } };

type AIEnvelope = {
  actions: any[];
  hint: string | null;

  speaker?: CoachOutput["speaker"];
  stage?: CoachOutput["stage"];
  tips?: string[];
  nextLine?: string | null;
  objections?: CoachObjection[];
};

/* =========================
   HELPERS
========================= */

function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function safeStr(x: any): string {
  return typeof x === "string" ? x : "";
}

function normalizePhone(x: any): string | null {
  const s = safeStr(x).trim();
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, "");
  return digits || null;
}

function isValidDateYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidTimeHHMM(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}

function coerceActions(raw: any): AssistantAction[] {
  if (!raw || !Array.isArray(raw.actions)) return [];
  const actions: AssistantAction[] = [];

  for (const a of raw.actions) {
    const type = safeStr(a?.type);

    if (type === "create_lead") {
      const name = safeStr(a?.payload?.name).trim();
      if (!name) continue;
      actions.push({
        type: "create_lead",
        payload: {
          name,
          phone: normalizePhone(a?.payload?.phone),
          preferences: a?.payload?.preferences ? safeStr(a.payload.preferences) : null,
        },
      });
      continue;
    }

    if (type === "create_calendar_event") {
      const date = safeStr(a?.payload?.date).trim();
      const time = safeStr(a?.payload?.time).trim();
      if (!isValidDateYYYYMMDD(date) || !isValidTimeHHMM(time)) continue;

      const title = safeStr(a?.payload?.title).trim() || "Spotkanie";
      const note = safeStr(a?.payload?.note);

      const et = safeStr(a?.payload?.eventType);
      const eventType: "pozysk" | "prezentacja" | "umowa" | "inne" =
        et === "prezentacja" || et === "umowa" || et === "inne" ? et : "pozysk";

      actions.push({
        type: "create_calendar_event",
        payload: { date, time, title, note, eventType },
      });
      continue;
    }

    if (type === "create_followup") {
      const dueDate = safeStr(a?.payload?.dueDate).trim();
      if (!isValidDateYYYYMMDD(dueDate)) continue;

      const t = safeStr(a?.payload?.time).trim();
      const time = t && isValidTimeHHMM(t) ? t : null;

      const followupType = safeStr(a?.payload?.followupType) === "prezentacja" ? "prezentacja" : "pozysk";

      actions.push({
        type: "create_followup",
        payload: {
          relatedName: a?.payload?.relatedName ? safeStr(a.payload.relatedName) : null,
          relatedId: typeof a?.payload?.relatedId === "number" ? a.payload.relatedId : null,
          dueDate,
          time,
          followupType,
        },
      });
      continue;
    }

    if (type === "create_contact") {
      const name = safeStr(a?.payload?.name).trim();
      if (!name) continue;
      actions.push({
        type: "create_contact",
        payload: {
          name,
          phone: normalizePhone(a?.payload?.phone),
          email: a?.payload?.email ? safeStr(a.payload.email).trim() : null,
        },
      });
      continue;
    }

    if (type === "draft_sms") {
      const message = safeStr(a?.payload?.message).trim();
      if (!message) continue;
      actions.push({
        type: "draft_sms",
        payload: {
          toName: a?.payload?.toName ? safeStr(a.payload.toName).trim() : null,
          toPhone: normalizePhone(a?.payload?.toPhone),
          message,
        },
      });
      continue;
    }

    if (type === "draft_email") {
      const subject = safeStr(a?.payload?.subject).trim();
      const body = safeStr(a?.payload?.body).trim();
      if (!subject || !body) continue;
      actions.push({
        type: "draft_email",
        payload: {
          toName: a?.payload?.toName ? safeStr(a.payload.toName).trim() : null,
          toEmail: a?.payload?.toEmail ? safeStr(a.payload.toEmail).trim() : null,
          subject,
          body,
        },
      });
      continue;
    }
  }

  return actions;
}

function coerceCoach(raw: any): CoachOutput {
  const speaker: CoachOutput["speaker"] =
    raw?.speaker === "client" || raw?.speaker === "agent" ? raw.speaker : "unknown";

  const stage: CoachOutput["stage"] =
    raw?.stage === "rapport" ||
    raw?.stage === "needs" ||
    raw?.stage === "value" ||
    raw?.stage === "terms" ||
    raw?.stage === "close"
      ? raw.stage
      : "unknown";

  const tips = Array.isArray(raw?.tips)
    ? raw.tips.map((x: any) => safeStr(x).trim()).filter(Boolean).slice(0, 6)
    : [];

  const nextLine = typeof raw?.nextLine === "string" ? raw.nextLine.trim() : null;

  const objections: CoachObjection[] = Array.isArray(raw?.objections)
    ? raw.objections
        .map((o: any) => ({
          type:
            o?.type === "commission" ||
            o?.type === "no_agent" ||
            o?.type === "many_agents" ||
            o?.type === "think_about_it" ||
            o?.type === "price_too_high" ||
            o?.type === "exclusive_fear" ||
            o?.type === "open_only" ||
            o?.type === "trust" ||
            o?.type === "timing"
              ? o.type
              : "other",
          evidence: safeStr(o?.evidence).trim(),
          response: safeStr(o?.response).trim(),
          question: safeStr(o?.question).trim(),
        }))
        .filter((o: CoachObjection) => o.response && o.question)
        .slice(0, 4)
    : [];

  return { speaker, stage, tips, nextLine, objections };
}

/* =========================
   ROUTE
========================= */

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing OPENAI_API_KEY",
        details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Brak pliku audio" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /* 1) TRANSKRYPCJA */
    const transcription = await openai.audio.transcriptions.create({
      // w Node 18+ masz globalny File (Next runtime nodejs)
      file: new File([buffer], "audio.webm", { type: file.type || "audio/webm" }),
      model: "gpt-4o-mini-transcribe",
    });

    const transcript = transcription.text?.trim() || "";
    if (!transcript) {
      return NextResponse.json({ success: false, error: "Pusta transkrypcja" }, { status: 400 });
    }

    /* 2) AI -> ACTIONS + COACH */
    const nowISO = new Date().toISOString();
    const mode = req.headers.get("x-assistant-mode") === "open" ? "open" : "exclusive";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "Jesteś asystentem CRM + trenerem rozmów dla agenta nieruchomości w Polsce.",
            "Masz zwracać WYŁĄCZNIE czysty JSON (bez markdown, bez komentarzy).",
            "",
            "Zwracasz jednocześnie:",
            "1) actions[] (CRM)",
            "2) COACHING: speaker, stage, objections[], tips[], nextLine",
            "",
            "Tryb rozmowy (mode): exclusive (wyłączność) albo open (otwarta).",
            "",
            "Reguły dat:",
            "- Jeżeli użytkownik nie poda roku, przyjmij bieżący rok względem `nowISO`.",
            "- Jeżeli data bez roku jest już w przeszłości względem `nowISO`, ustaw kolejny rok.",
            "- Formaty: date = YYYY-MM-DD, time = HH:mm.",
            "",
            "Typy eventów: pozysk | prezentacja | umowa | inne.",
            "Follow-up: followupType: pozysk | prezentacja.",
            "",
            "Ważne: Nie wymyślaj numerów telefonu/email jeśli ich nie ma.",
            "Jeśli komenda CRM jest niepewna: actions = [] i hint z krótką sugestią.",
            "",
            "COACHING:",
            "- speaker: kto mówi w tym fragmencie transkrypcji (client/agent/unknown).",
            "- stage: rapport/needs/value/terms/close/unknown (jeden wybór).",
            "- objections: max 4 (type, evidence, response, question).",
            "- tips: max 6.",
            "- nextLine: jedno najlepsze zdanie do powiedzenia TERAZ (pod tryb mode).",
          ].join("\n"),
        },
        {
          role: "user",
          content: `nowISO: ${nowISO}
mode: ${mode}

TRANSKRYPCJA (ostatni fragment):
${transcript}

Zwróć JSON o strukturze:
{
  "actions": [],
  "hint": string | null,
  "speaker": "client" | "agent" | "unknown",
  "stage": "rapport" | "needs" | "value" | "terms" | "close" | "unknown",
  "tips": string[],
  "nextLine": string | null,
  "objections": [
    { "type": "commission"|"no_agent"|"many_agents"|"think_about_it"|"price_too_high"|"exclusive_fear"|"open_only"|"trust"|"timing"|"other",
      "evidence": string, "response": string, "question": string
    }
  ]
}

Jeśli z transkrypcji wynika: klient szuka mieszkania + data spotkania, zwróć DWIE akcje:
- create_lead
- create_calendar_event

Jeśli z transkrypcji wynika: "dodaj follow up ...", zwróć create_followup.
Jeśli z transkrypcji wynika: "wyślij sms/email ...", zwróć draft_sms/draft_email (tylko draft).`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = extractJSON(raw) as AIEnvelope | null;

    const actions = coerceActions(parsed);
    const hint = parsed?.hint ? safeStr(parsed.hint) : null;

    const coach = coerceCoach(parsed);

    /* 3) Legacy (żeby nic nie popsuć): lead/meeting */
    const leadAction = actions.find((a) => a.type === "create_lead") as
      | { type: "create_lead"; payload: { name: string; phone?: string | null; preferences?: string | null } }
      | undefined;

    const eventAction = actions.find((a) => a.type === "create_calendar_event") as
      | {
          type: "create_calendar_event";
          payload: { date: string; time: string; title: string; note?: string; eventType: any };
        }
      | undefined;

    let legacyLead: any = null;
    let legacyMeeting: any = null;

    if (leadAction) {
      legacyLead = {
        id: Date.now(),
        name: leadAction.payload.name,
        phone: normalizePhone(leadAction.payload.phone),
        preferences: leadAction.payload.preferences ?? "",
      };

      const properties = JSON.parse(process.env.PROPERTIES_JSON || "[]");
      try {
        legacyLead.suggestedProperties = matchProperties(legacyLead.preferences, properties);
      } catch {
        legacyLead.suggestedProperties = [];
      }
    }

    if (eventAction) {
      legacyMeeting = {
        id: Date.now(),
        title: eventAction.payload.title || "Spotkanie z głosówki",
        date: eventAction.payload.date,
        time: eventAction.payload.time,
      };
    }

    /* 4) RESPONSE */
    return NextResponse.json({
      success: true,
      transcript,

      // CRM
      actions,
      hint,
      lead: legacyLead,
      meeting: legacyMeeting,

      // COACH
      speaker: coach.speaker,
      stage: coach.stage,
      tips: coach.tips,
      nextLine: coach.nextLine,
      objections: coach.objections,
    });
  } catch (e: any) {
    console.error("voice-analyze error:", e);
    const msg = typeof e?.message === "string" ? e.message : "Błąd serwera voice-analyze";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
