"use client";

import { useMemo, useRef, useState } from "react";

/* =========================
   TYPES
========================= */

type Lead = {
  id: number;
  name: string;
  phone?: string | null;
  preferences?: string | null;
};

type CalendarEvent = {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  note: string;
  type: "pozysk" | "prezentacja" | "umowa" | "inne";
};

type FollowUp = {
  id: number;
  relatedId: number; // <- wymagane w Twoim FollowUpsPage
  type: "pozysk" | "prezentacja";
  dueDate: string; // YYYY-MM-DD (u Ciebie na stronie)
  status: "pending" | "done";
};

type Contact = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type AssistantAction =
  | { type: "create_lead"; payload: Partial<Lead> }
  | {
      type: "create_calendar_event";
      payload: Partial<{
        date: string;
        time: string;
        title: string;
        note: string;
        eventType: "pozysk" | "prezentacja" | "umowa" | "inne";
      }>;
    }
  | {
      type: "create_followup";
      payload: Partial<{
        relatedName: string | null;
        relatedId: number | null;
        dueDate: string;
        time: string | null;
        followupType: "pozysk" | "prezentacja";
      }>;
    }
  | { type: "create_contact"; payload: Partial<Contact> }
  | { type: "draft_sms"; payload: { toName?: string | null; toPhone?: string | null; message: string } }
  | { type: "draft_email"; payload: { toName?: string | null; toEmail?: string | null; subject: string; body: string } };

type VoiceAnalyzeResponse = {
  success?: boolean;

  // legacy
  lead?: any;
  meeting?: { date?: string; time?: string };

  // new
  transcript?: string;
  actions?: AssistantAction[];
  hint?: string | null;

  error?: string;
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsGet<T>(key: string, fallback: T): T {
  return safeJsonParse<T>(localStorage.getItem(key), fallback);
}

function lsSet<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowId() {
  return Date.now();
}

function normalizePhone(p?: string | null) {
  if (!p) return null;
  const digits = String(p).replace(/[^\d+]/g, "");
  return digits || null;
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findLeadIdByName(leads: Lead[], name: string) {
  const n = normalizeName(name);
  if (!n) return null;

  // 1) exact match
  const exact = leads.find((l) => normalizeName(l.name) === n);
  if (exact) return exact.id;

  // 2) contains match (czasem AI poda "Jan Kowalski", a lead "Pan Jan Kowalski")
  const contains = leads.find((l) => normalizeName(l.name).includes(n) || n.includes(normalizeName(l.name)));
  return contains?.id ?? null;
}

/* =========================
   CONTACTS API helpers
   (poprawka: zapis kontaktu do bazy przez /api/contacts)
========================= */

const pickOrgId = (data: any): string | null => {
  if (typeof data?.id === "string") return data.id;
  if (typeof data?.orgId === "string") return data.orgId;
  if (typeof data?.org?.id === "string") return data.org.id;
  if (typeof data?.organization?.id === "string") return data.organization.id;
  if (typeof data?.user?.orgId === "string") return data.user.orgId;
  if (typeof data?.user?.org?.id === "string") return data.user.org.id;
  if (Array.isArray(data) && typeof data?.[0]?.id === "string") return data[0].id;
  if (Array.isArray(data?.orgs) && typeof data?.orgs?.[0]?.id === "string") return data.orgs[0].id;
  return null;
};

const safeJson = async (res: Response, label: string) => {
  const text = await res.text();
  if (!res.ok) {
    console.error(`DEBUG ${label} status:`, res.status);
    console.error(`DEBUG ${label} raw:`, text);
    throw new Error(`${label} status ${res.status}: ${text}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    console.error(`DEBUG ${label} raw (nie JSON):`, text);
    throw new Error(`${label} nie JSON`);
  }
};

function splitName(full: string): { firstName: string; lastName: string } {
  const s = String(full || "").trim().replace(/\s+/g, " ");
  if (!s) return { firstName: "", lastName: "" };

  const parts = s.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };

  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/* =========================
   UI helpers
========================= */

function pillTone(t: AssistantAction["type"]) {
  switch (t) {
    case "create_lead":
      return { bg: "rgba(45,212,191,0.12)", border: "rgba(45,212,191,0.30)", text: "#0f172a", label: "Lead" };
    case "create_calendar_event":
      return { bg: "rgba(29,78,216,0.10)", border: "rgba(29,78,216,0.22)", text: "#0f172a", label: "Kalendarz" };
    case "create_followup":
      return { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.22)", text: "#0f172a", label: "Follow-up" };
    case "create_contact":
      return { bg: "rgba(15,23,42,0.06)", border: "rgba(15,23,42,0.14)", text: "#0f172a", label: "Kontakt" };
    case "draft_sms":
      return { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.22)", text: "#0f172a", label: "SMS (draft)" };
    case "draft_email":
      return { bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.22)", text: "#0f172a", label: "Email (draft)" };
    default:
      return { bg: "rgba(15,23,42,0.06)", border: "rgba(15,23,42,0.14)", text: "#0f172a", label: "Akcja" };
  }
}

/* =========================
   PAGE
========================= */

export default function VoiceNotesPage() {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [transcript, setTranscript] = useState<string | null>(null);
  const [plan, setPlan] = useState<AssistantAction[]>([]);
  const [rawPreview, setRawPreview] = useState<any>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [autoExecute, setAutoExecute] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  const [drafts, setDrafts] = useState<{ sms: any[]; email: any[] }>({ sms: [], email: [] });

  const canExecute = useMemo(() => plan.length > 0 && !recording, [plan.length, recording]);

  const start = async () => {
    try {
      setStatus("");
      setTranscript(null);
      setPlan([]);
      setRawPreview(null);
      setDrafts({ sms: [], email: [] });
      setHint(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      recorder.current = new MediaRecorder(stream);
      chunks.current = [];

      recorder.current.ondataavailable = (e) => {
        if (e.data?.size) chunks.current.push(e.data);
      };
      recorder.current.onstop = send;

      recorder.current.start();
      setRecording(true);
      setStatus("🎙️ Nagrywanie…");
    } catch {
      setStatus("❌ Brak dostępu do mikrofonu (sprawdź uprawnienia).");
    }
  };

  const stop = () => {
    recorder.current?.stop();
    setRecording(false);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const buildPlanFromLegacy = (data: VoiceAnalyzeResponse): AssistantAction[] => {
    const actions: AssistantAction[] = [];

    if (data.lead) actions.push({ type: "create_lead", payload: data.lead });

    if (data.meeting?.date && data.meeting?.time) {
      actions.push({
        type: "create_calendar_event",
        payload: {
          date: data.meeting.date,
          time: data.meeting.time,
          title: data.lead?.name ? `Spotkanie — ${data.lead.name}` : "Spotkanie z głosówki",
          note: data.lead?.preferences || "Spotkanie z głosówki",
          eventType: "pozysk",
        },
      });
    }

    return actions;
  };

  const send = async () => {
    setStatus("🤖 Analiza AI…");

    const blob = new Blob(chunks.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob);

    try {
      const res = await fetch("/api/voice-analyze", { method: "POST", body: form });
      const text = await res.text();

      let data: VoiceAnalyzeResponse | null = null;
      try {
        data = text ? (JSON.parse(text) as VoiceAnalyzeResponse) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data) {
        setStatus("❌ Błąd analizy (API nie zwróciło poprawnych danych)");
        return;
      }
      if (data.success === false) {
        setStatus(`❌ ${data.error ?? "Błąd analizy"}`);
        return;
      }

      setRawPreview(data);

      if (data.transcript) setTranscript(String(data.transcript));
      if (data.hint) setHint(String(data.hint));

      const actions = Array.isArray(data.actions) && data.actions.length > 0 ? data.actions : buildPlanFromLegacy(data);

      setPlan(actions);

      if (actions.length === 0) {
        setStatus("ℹ️ Nie wykryto akcji. Powiedz polecenie bardziej konkretnie.");
        return;
      }

      setStatus(autoExecute ? "✅ Plan gotowy — wykonuję…" : "✅ Plan gotowy — sprawdź i kliknij „Wykonaj”");

      if (autoExecute) {
        await executePlan(actions);
      }
    } catch {
      setStatus("❌ Błąd połączenia z /api/voice-analyze");
    }
  };

  const executePlan = async (actions: AssistantAction[]) => {
    const leads = lsGet<Lead[]>("leads", []);
    const events = lsGet<any[]>("calendar-events", []);
    const followups = lsGet<FollowUp[]>("followups", []);
    const contacts = lsGet<Contact[]>("contacts", []);

    const outDrafts: { sms: any[]; email: any[] } = { sms: [], email: [] };

    // 1) najpierw dodajemy leady (żeby follow-up mógł się dopasować)
    actions.forEach((a) => {
      if (a.type !== "create_lead") return;

      const name = String((a.payload as any)?.name ?? "").trim();
      if (!name) return;

      const lead: Lead = {
        id: typeof (a.payload as any)?.id === "number" ? (a.payload as any).id : nowId(),
        name,
        phone: normalizePhone((a.payload as any)?.phone),
        preferences: (a.payload as any)?.preferences ? String((a.payload as any).preferences) : null,
      };

      leads.push(lead);
    });

    // 2) reszta akcji
    for (const a of actions) {
      if (a.type === "create_calendar_event") {
        const date = String((a.payload as any)?.date ?? "").trim();
        const time = String((a.payload as any)?.time ?? "").trim();
        if (!date || !time) continue;

        events.push({
          id: nowId(),
          date,
          time,
          title: String((a.payload as any)?.title ?? "Spotkanie"),
          note: String((a.payload as any)?.note ?? ""),
          type: String((a.payload as any)?.eventType ?? "pozysk"),
        });
      }

      if (a.type === "create_followup") {
        const dueDate = String((a.payload as any)?.dueDate ?? "").trim();
        if (!dueDate) continue;

        // klucz: relatedId z nazwy
        let relatedId: number | null =
          typeof (a.payload as any)?.relatedId === "number" ? (a.payload as any).relatedId : null;

        if (!relatedId) {
          const relatedName = String((a.payload as any)?.relatedName ?? "").trim();
          if (relatedName) {
            relatedId = findLeadIdByName(leads, relatedName);
          }
        }

        // jeżeli dalej nie ma — nie zapisujemy „w powietrzu”
        if (!relatedId) {
          outDrafts.email.push({
            toName: "Ty (notatka)",
            toEmail: "",
            subject: "Nie udało się dopasować follow-up do leada",
            body:
              `AI chciało dodać follow-up, ale nie znalazłem leada po nazwie.\n\n` +
              `Polecenie: ${(a.payload as any)?.relatedName ?? "(brak nazwy)"}\n` +
              `Data: ${dueDate}\n\n` +
              `Dodaj najpierw leada albo powiedz pełne imię i nazwisko.`,
          });
          continue;
        }

        const fu: FollowUp = {
          id: nowId(),
          relatedId,
          type: String((a.payload as any)?.followupType ?? "pozysk") === "prezentacja" ? "prezentacja" : "pozysk",
          dueDate,
          status: "pending",
        };

        followups.push(fu);
      }

      if (a.type === "create_contact") {
        // POPRAWKA: dodajemy kontakt do bazy (a nie tylko localStorage)
        const fullName = String((a.payload as any)?.name ?? "").trim();
        if (!fullName) continue;

        const { firstName, lastName } = splitName(fullName);
        const phone = normalizePhone((a.payload as any)?.phone);
        const email = (a.payload as any)?.email ? String((a.payload as any).email).trim() : null;

        try {
          const orgRes = await fetch("/api/org/current");
          const org = await safeJson(orgRes, "/api/org/current");
          const orgId = pickOrgId(org);

          if (!orgId) {
            throw new Error("Nie mogę znaleźć orgId. Sprawdź Console (F12).");
          }

          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId,
              type: "OTHER",
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone || null,
              email: email || null,
              notes: null,
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `POST /api/contacts status ${res.status}`);
          }

          // (opcjonalnie) kopia w localStorage — nie przeszkadza
          contacts.push({
            id: nowId(),
            name: fullName,
            phone,
            email,
          });
        } catch (e: any) {
          console.error("create_contact error:", e);
          outDrafts.email.push({
            toName: "Ty (debug)",
            toEmail: "",
            subject: "Błąd dodania kontaktu z głosówki",
            body:
              `Nie udało się dodać kontaktu przez API /api/contacts.\n\n` +
              `Błąd: ${String(e?.message ?? e)}\n\n` +
              `Payload:\n${JSON.stringify(a.payload ?? {}, null, 2)}\n\n` +
              `Sprawdź Console (F12).`,
          });
        }
      }

      if (a.type === "draft_sms") outDrafts.sms.push(a.payload);
      if (a.type === "draft_email") outDrafts.email.push(a.payload);
    }

    lsSet("leads", leads);
    lsSet("calendar-events", events);
    lsSet("followups", followups);
    lsSet("contacts", contacts);

    setDrafts(outDrafts);
    setStatus("✅ Wykonano: zapisano akcje w systemie");
  };

  const clearAll = () => {
    setStatus("");
    setTranscript(null);
    setPlan([]);
    setDrafts({ sms: [], email: [] });
    setRawPreview(null);
    setHint(null);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            🎙️ Głosówki AI — Asystent
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Mów komendy: „Dodaj follow-up do Jana Kowalskiego na 10 stycznia 15:00”, „Dodaj kontakt”, „Wyślij SMS”.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="rounded-full px-4 py-2 text-xs font-extrabold"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={autoExecute}
              onChange={(e) => setAutoExecute(e.target.checked)}
              style={{ marginRight: 10 }}
            />
            Auto-wykonaj
          </label>

          <button onClick={clearAll} style={pillIdle}>
            Wyczyść
          </button>
        </div>
      </div>

      <section
        className="mt-7 rounded-2xl p-6 md:p-7"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
              Sterowanie
            </div>
            <div className="mt-1 text-lg font-black" style={{ color: "#0f172a" }}>
              Nagrywaj i twórz plan działań
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={recording ? stop : start}
              style={{
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 900,
                border: "1px solid rgba(15,23,42,0.12)",
                background: recording ? "rgba(239,68,68,0.14)" : "rgba(45,212,191,0.14)",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              {recording ? "⏹️ Zatrzymaj" : "🎤 Nagraj"}
            </button>

            <button
              onClick={() => void executePlan(plan)}
              disabled={!canExecute}
              style={{
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 900,
                border: canExecute ? "1px solid rgba(29,78,216,0.26)" : "1px solid rgba(15,23,42,0.10)",
                background: canExecute ? "rgba(29,78,216,0.10)" : "rgba(15,23,42,0.06)",
                color: "#0f172a",
                cursor: canExecute ? "pointer" : "not-allowed",
                opacity: canExecute ? 1 : 0.6,
              }}
            >
              ✅ Wykonaj plan
            </button>
          </div>
        </div>

        {status ? (
          <div
            className="mt-4 rounded-2xl p-4 text-sm font-semibold"
            style={{
              background: "rgba(15,23,42,0.04)",
              border: "1px solid rgba(15,23,42,0.10)",
              color: "#0f172a",
            }}
          >
            {status}
          </div>
        ) : null}

        {hint ? (
          <div
            className="mt-4 rounded-2xl p-4 text-sm font-semibold"
            style={{
              background: "rgba(245,158,11,0.10)",
              border: "1px solid rgba(245,158,11,0.22)",
              color: "#0f172a",
            }}
          >
            💡 {hint}
          </div>
        ) : null}

        {transcript ? (
          <div
            className="mt-4 rounded-2xl p-4 text-sm"
            style={{
              background: "rgba(45,212,191,0.08)",
              border: "1px solid rgba(45,212,191,0.22)",
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}
          >
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ opacity: 0.75 }}>
              Transkrypcja
            </div>
            <div className="mt-1 font-semibold">{transcript}</div>
          </div>
        ) : null}
      </section>

      {plan.length > 0 ? (
        <section
          className="mt-6 rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
              Plan AI
            </div>
            <div className="mt-1 text-lg font-black" style={{ color: "#0f172a" }}>
              Co zostanie wykonane
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            {plan.map((a, idx) => {
              const tone = pillTone(a.type);
              return (
                <div
                  key={idx}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(15,23,42,0.03)",
                    border: "1px solid rgba(15,23,42,0.10)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-extrabold"
                      style={{
                        background: tone.bg,
                        border: `1px solid ${tone.border}`,
                        color: tone.text,
                      }}
                    >
                      {tone.label}
                    </span>

                    <span className="text-xs font-extrabold" style={{ color: "rgba(15,23,42,0.55)" }}>
                      #{idx + 1}
                    </span>
                  </div>

                  <pre
                    className="mt-3"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "rgba(15,23,42,0.85)",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    }}
                  >
                    {JSON.stringify(a.payload, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {drafts.sms.length > 0 || drafts.email.length > 0 ? (
        <section
          className="mt-6 rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
              Wiadomości (draft)
            </div>
            <div className="mt-1 text-lg font-black" style={{ color: "#0f172a" }}>
              Gotowe treści do wysłania
            </div>
          </div>

          {drafts.sms.length > 0 ? (
            <div className="mt-4">
              <div className="text-sm font-extrabold" style={{ color: "#0f172a" }}>
                📩 SMS
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3">
                {drafts.sms.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.22)",
                      color: "#0f172a",
                    }}
                  >
                    <div className="text-xs font-extrabold" style={{ opacity: 0.8 }}>
                      Do: {s.toName ?? "—"} {s.toPhone ? `(${s.toPhone})` : ""}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm font-semibold">{s.message}</div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button onClick={() => navigator.clipboard.writeText(s.message)} style={pillBtnDark}>
                        📋 Kopiuj treść
                      </button>

                      <a
                        href={`sms:${encodeURIComponent(s.toPhone ?? "")}?body=${encodeURIComponent(s.message)}`}
                        style={{ ...pillBtnDark, textDecoration: "none", display: "inline-block" }}
                      >
                        📲 Otwórz SMS
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {drafts.email.length > 0 ? (
            <div className="mt-6">
              <div className="text-sm font-extrabold" style={{ color: "#0f172a" }}>
                ✉️ Email
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3">
                {drafts.email.map((e, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(168,85,247,0.08)",
                      border: "1px solid rgba(168,85,247,0.22)",
                      color: "#0f172a",
                    }}
                  >
                    <div className="text-xs font-extrabold" style={{ opacity: 0.8 }}>
                      Do: {e.toName ?? "—"} {e.toEmail ? `(${e.toEmail})` : ""}
                    </div>
                    <div className="mt-2 text-sm font-black">Temat: {e.subject}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm font-semibold">{e.body}</div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => navigator.clipboard.writeText(`Temat: ${e.subject}\n\n${e.body}`)}
                        style={pillBtnDark}
                      >
                        📋 Kopiuj
                      </button>

                      <a
                        href={`mailto:${encodeURIComponent(e.toEmail ?? "")}?subject=${encodeURIComponent(
                          e.subject
                        )}&body=${encodeURIComponent(e.body)}`}
                        style={{ ...pillBtnDark, textDecoration: "none", display: "inline-block" }}
                      >
                        ✉️ Otwórz email
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {rawPreview ? (
        <details className="mt-6">
          <summary style={{ color: "var(--text-muted)", cursor: "pointer", fontWeight: 900 }}>
            Debug: surowa odpowiedź API
          </summary>
          <pre
            style={{
              marginTop: 10,
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(rawPreview, null, 2)}
          </pre>
        </details>
      ) : null}
    </main>
  );
}

/* ===== styles ===== */

const pillIdle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-main)",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const pillBtnDark: React.CSSProperties = {
  background: "rgba(15,23,42,0.06)",
  border: "1px solid rgba(15,23,42,0.12)",
  color: "#0f172a",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};
