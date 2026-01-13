?export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { matchProperties } from "@/app/lib/matching";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
  | {
      type: "draft_sms";
      payload: { toName?: string | null; toPhone?: string | null; message: string };
    }
  | {
      type: "draft_email";
      payload: { toName?: string | null; toEmail?: string | null; subject: string; body: string };
    };

type AIEnvelope = {
  actions: any[];
  hint: string | null;

  // coach fields (nowe)
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
    }

    if (type === "create_calendar_event") {
      const date = safeStr(a?.payload?.date).trim();
      const time = safeStr(a?.payload?.time).trim();
      if (!isValidDateYYYYMMDD(date) || !isValidTimeHHMM(time)) continue;

      const title = safeStr(a?.payload?.title).trim() || "Spotkanie";
      const note = safeStr(a?.payload?.note);
      const eventType = (safeStr(a?.payload?.eventType) as any) || "pozysk";

      actions.push({
        type: "create_calendar_event",
        payload: {
          date,
          time,
          title,
          note,
          eventType:
            eventType === "prezentacja" || eventType === "umowa" || eventType === "inne"
              ? eventType
              : "pozysk",
        },
      });
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
        { error: "Missing OPENAI_API_KEY", details: "Ustaw OPENAI_API_KEY w Vercel -> Project Settings -> Environment Variables." },
        { status: 500 }
      );
    }
try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    if (!file) return NextResponse.json({ success: false, error: "Brak pliku audio" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    /* 1) TRANSKRYPCJA */
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: file.type || "audio/webm" }),
      model: "gpt-4o-mini-transcribe",
    });

    const transcript = transcription.text?.trim() || "";
    if (!transcript) return NextResponse.json({ success: false, error: "Pusta transkrypcja" }, { status: 400 });

    /* 2) AI -> ACTIONS + COACH */
    const nowISO = new Date().toISOString();
    const mode = req.headers.get("x-assistant-mode") === "open" ? "open" : "exclusive";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "Jeste[ asystentem CRM + trenerem rozm�w dla agenta nieruchomo[ci w Polsce.",
            "Masz zwraca WY9�CZNIE czysty JSON (bez markdown, bez komentarzy).",
            "",
            "Zwracasz jednocze[nie:",
            "1) actions[] (CRM)  jak dotychczas",
            "2) COACHING dla rozmowy: speaker, stage, objections[], tips[], nextLine",
            "",
            "Tryb rozmowy (mode): exclusive (wyB&czno[!) albo open (otwarta).",
            "",
            "ReguBy dat:",
            "- Je|eli u|ytkownik nie poda roku, przyjmij bie|&cy rok wzgl"dem `nowISO`.",
            "- Je|eli data bez roku jest ju| w przeszBo[ci wzgl"dem `nowISO`, ustaw kolejny rok.",
            "- Formaty: date = YYYY-MM-DD, time = HH:mm.",
            "",
            "Typy event�w: pozysk | prezentacja | umowa | inne.",
            "Follow-up: followupType: pozysk | prezentacja.",
            "",
            "Wa|ne: Nie wymy[laj numer�w telefonu/email je[li ich nie ma.",
            "Je[li komenda CRM jest niepeBna: actions = [] i hint z kr�tk& sugesti&.",
            "",
            "COACHING:",
            "- speaker: kto m�wi w tym fragmencie transkrypcji (client/agent/unknown).",
            "- stage: raport/needs/value/terms/close/unknown (jeden wyb�r).",
            "- objections: max 4. Ka|da ma: type, evidence (kr�tki cytat), response (co agent ma powiedzie!), question (pytanie domykaj&ce).",
            "- tips: max 6, kr�tkie konkretne zdania do u|ycia teraz.",
            "- nextLine: jedno najlepsze zdanie do powiedzenia TERAZ (pod tryb mode).",
          ].join("\n"),
        },
        {
          role: "user",
          content: `nowISO: ${nowISO}
mode: ${mode}

TRANSKRYPCJA (ostatni fragment):
${transcript}

Zwr� JSON o strukturze:
{
  "actions": [
    // { "type": "create_lead", "payload": { "name": "...", "phone": "...", "preferences": "..." } }
    // { "type": "create_calendar_event", "payload": { "date": "YYYY-MM-DD", "time": "HH:mm", "title": "...", "note": "...", "eventType": "pozysk" } }
    // { "type": "create_followup", "payload": { "relatedName": "Jan Kowalski", "dueDate": "YYYY-MM-DD", "time": "HH:mm", "followupType": "pozysk" } }
    // { "type": "create_contact", "payload": { "name": "...", "phone": "...", "email": "..." } }
    // { "type": "draft_sms", "payload": { "toName": "...", "toPhone": "...", "message": "..." } }
    // { "type": "draft_email", "payload": { "toName": "...", "toEmail": "...", "subject": "...", "body": "..." } }
  ],
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

Je[li z transkrypcji wynika: klient szuka mieszkania + data spotkania, zwr� DWIE akcje:
- create_lead
- create_calendar_event

Je[li z transkrypcji wynika: "dodaj follow up ...", zwr� create_followup.
Je[li z transkrypcji wynika: "wy[lij sms/email ...", zwr� draft_sms/draft_email (tylko draft).`,
        },
      ],
      // troch" szybciej / stabilniej w JSON: ucinamy kreatywno[!
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content || "";
    const parsed = extractJSON(raw) as AIEnvelope | null;

    const actions = coerceActions(parsed);
    const hint = parsed?.hint ? safeStr(parsed.hint) : null;

    const coach = coerceCoach(parsed);

    /* 3) Legacy (|eby nic nie popsu!): lead/meeting */
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
        title: eventAction.payload.title || "Spotkanie z gBos�wki",
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
    console.error(e);
    const msg = typeof e?.message === "string" ? e.message : "BBd serwera voice-analyze";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
