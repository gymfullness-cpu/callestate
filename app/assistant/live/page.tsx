"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   COLORS (DARK + LIGHT)
========================= */
const TEXT = "#0f172a";
const MUTED = "rgba(15,23,42,0.78)";
const MUTED2 = "rgba(15,23,42,0.62)";

const LIGHT_TEXT = "#e5e7eb";
const LIGHT_MUTED = "rgba(229,231,235,0.78)";
const LIGHT_MUTED2 = "rgba(229,231,235,0.62)";

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

type VoiceAnalyzeResponse = {
  success?: boolean;
  transcript?: string;
  hint?: string | null;
  tips?: string[];
  nextLine?: string | null;
  objections?: CoachObjection[];
  speaker?: "client" | "agent" | "unknown";
  stage?: "rapport" | "needs" | "value" | "terms" | "close" | "unknown";
  error?: string;
};

type Segment = {
  id: number;
  text: string;
  speaker: "client" | "agent" | "unknown";
  ts: number;
};

/* =========================
   UI HELPERS
========================= */

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        border: "1px solid rgba(15,23,42,0.25)",
        background: "#0f172a",
        color: "#fff",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function speakerLabel(s: Segment["speaker"]) {
  if (s === "client") return "Klient";
  if (s === "agent") return "Ja";
  return "Niepewne";
}

function objectionMeta(t: CoachObjection["type"]) {
  switch (t) {
    case "commission":
      return { title: "Prowizja", bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", pill: "#ef4444" };
    case "exclusive_fear":
      return {
        title: "Obawa przed wyłącznością",
        bg: "rgba(245,158,11,0.14)",
        bd: "rgba(245,158,11,0.35)",
        pill: "#f59e0b",
      };
    case "open_only":
      return { title: "Tylko otwarta", bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.35)", pill: "#3b82f6" };
    case "think_about_it":
      return { title: "Muszę się zastanowić", bg: "rgba(168,85,247,0.12)", bd: "rgba(168,85,247,0.35)", pill: "#a855f7" };
    case "no_agent":
      return { title: "Bez pośrednika", bg: "rgba(34,197,94,0.12)", bd: "rgba(34,197,94,0.35)", pill: "#22c55e" };
    case "many_agents":
      return { title: "Wielu agentów", bg: "rgba(14,165,233,0.12)", bd: "rgba(14,165,233,0.35)", pill: "#0ea5e9" };
    case "price_too_high":
      return { title: "Cena", bg: "rgba(244,63,94,0.10)", bd: "rgba(244,63,94,0.30)", pill: "#f43f5e" };
    case "trust":
      return { title: "Zaufanie", bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.35)", pill: "#64748b" };
    case "timing":
      return { title: "Timing", bg: "rgba(20,184,166,0.12)", bd: "rgba(20,184,166,0.35)", pill: "#14b8a6" };
    default:
      return { title: "Obiekcja", bg: "rgba(15,23,42,0.06)", bd: "rgba(15,23,42,0.14)", pill: "#0f172a" };
  }
}

function stageLabel(stage: VoiceAnalyzeResponse["stage"]) {
  switch (stage) {
    case "rapport":
      return "Raport";
    case "needs":
      return "Potrzeby";
    case "value":
      return "Wartość";
    case "terms":
      return "Warunki";
    case "close":
      return "Domknięcie";
    default:
      return "Nieznane";
  }
}

/* =========================
   LOCAL LOGIC (Domykanie)
========================= */

function buildClosePack() {
  return [
    "Jeśli omówiliśmy plan i warunki, to czy możemy dziś podpisać (na 30 dni próbnie) wyłączność?",
    "Co musiałoby się jeszcze wydarzyć, żebyśmy mogli dziś podjąć decyzję o współpracy?",
    "Jeśli teraz ustalimy zasady i zakres, to kiedy ruszamy z marketingiem — od jutra czy od poniedziałku?",
  ];
}

function chooseBestCloseLine(objections: CoachObjection[]) {
  const hasExclusiveFear = objections.some((o) => o.type === "exclusive_fear");
  const hasCommission = objections.some((o) => o.type === "commission");
  if (hasExclusiveFear) return "Zróbmy 30 dni próbnie na wyłączność — jeśli nie dowiozę, wracamy do otwartej. Pasuje?";
  if (hasCommission) return "Jeśli dowiozę wynik i bezpieczeństwo transakcji, to możemy dziś ustalić warunki i podpisać?";
  return buildClosePack()[0];
}

/* =========================
   PAGE
========================= */

export default function LiveAssistantPage() {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [pauseMode, setPauseMode] = useState(false);
  const lastObjectionTypeRef = useRef<string | null>(null);

  const [nextLine, setNextLine] = useState<string | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [objections, setObjections] = useState<CoachObjection[]>([]);
  const [stage, setStage] = useState<VoiceAnalyzeResponse["stage"]>("unknown");

  const [segments, setSegments] = useState<Segment[]>([]);

  function triggerPause(ms = 5000) {
    setPauseMode(true);
    window.setTimeout(() => {
      setPauseMode(false);
    }, ms);
  }

  // Teleprompter
  const [teleprompterOn, setTeleprompterOn] = useState(true);
  const [teleFont, setTeleFont] = useState(26);
  const [teleSpeed, setTeleSpeed] = useState(10);

  const topAlert = useMemo(() => {
    if (!objections.length) return null;
    return objections[0];
  }, [objections]);

  const closePack = useMemo(() => buildClosePack(), []);
  const shouldShowClose = stage === "close" || stage === "terms";

  const effectiveNextLine = useMemo(() => {
    const base = (nextLine || "").trim();
    if (base) return base;

    if (shouldShowClose) {
      return chooseBestCloseLine(objections);
    }

    return "Czekam na rozmowę…";
  }, [nextLine, shouldShowClose, objections]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =========================
     AUDIO
  ========================= */

  async function start() {
    setStatus("Słucham…");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };

    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];

      // super mały blob = cisza/krótki fragment, nie spamuj API
      if (blob.size < 2000) {
        if (mountedRef.current && recorderRef.current && recording) {
          recorderRef.current.start();
          scheduleStop();
        }
        return;
      }

      if (!mountedRef.current) return;

      setStatus("Analiza…");

      try {
        const form = new FormData();
        form.append("audio", blob, "chunk.webm");

        const res = await fetch("/api/voice-analyze", { method: "POST", body: form });
        const data = (await res.json()) as VoiceAnalyzeResponse;

        if (!mountedRef.current) return;

        if (!res.ok || data.success === false) {
          setStatus("Błąd analizy");
        } else {
          if (!pauseMode && (typeof data.nextLine === "string" || data.nextLine === null)) {
            setNextLine(data.nextLine ?? null);
          }

          if (Array.isArray(data.tips)) setTips(data.tips.map(String).filter(Boolean).slice(0, 6));

          if (Array.isArray(data.objections)) {
            const next = data.objections.slice(0, 4);
            setObjections(next);

            const first = next[0];
            if (first?.type && first.type !== lastObjectionTypeRef.current) {
              lastObjectionTypeRef.current = first.type;

              // „przebij” nextLine gotową odpowiedzią na nową obiekcję + pauza
              setNextLine(first.response);
              triggerPause(5000);
            }
          }

          if (data.stage) setStage(data.stage);

          if (data.transcript) {
            const add = String(data.transcript).trim();
            if (add) {
              setSegments((prev) => [
                ...prev,
                { id: Date.now(), text: add, speaker: data.speaker ?? "unknown", ts: Date.now() },
              ]);
            }
          }

          setStatus("Słucham…");
        }
      } catch {
        if (!mountedRef.current) return;
        setStatus("Błąd analizy (API/JSON)");
      }

      if (mountedRef.current && recorderRef.current && recording) {
        recorderRef.current.start();
        scheduleStop();
      }
    };

    rec.start();
    scheduleStop();
    setRecording(true);
  }

  function scheduleStop() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        recorderRef.current?.stop();
      } catch {}
    }, 3000) as any;
  }

  function stop() {
    setRecording(false);
    setStatus("Zatrzymano");

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;

    try {
      recorderRef.current?.stop();
    } catch {}

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearAll() {
    setStatus("");
    setNextLine(null);
    setTips([]);
    setObjections([]);
    setStage("unknown");
    setSegments([]);
  }

  /* =========================
     TELEPROMPTER VISUAL
  ========================= */

  const teleBg = useMemo(() => {
    const dur = Math.max(5, Math.min(30, teleSpeed));
    return {
      background: "linear-gradient(90deg, #0b1220, #0f172a, #0b1220)",
      backgroundSize: "200% 100%",
      animation: `teleBg ${dur}s linear infinite`,
    } as React.CSSProperties;
  }, [teleSpeed]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <style>{`
        @keyframes teleBg {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>

      {/* TELEPROMPTER (sticky top) */}
      {teleprompterOn ? (
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 50,
            borderRadius: 18,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
            color: "#fff",
            ...teleBg,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 950, opacity: 0.9 }}>Teleprompter</span>
            <Badge text={`Stage: ${stageLabel(stage)}`} />
            <Badge text={recording ? "MIC: ON" : "MIC: OFF"} />
            {pauseMode ? <Badge text="PAUZA — odpowiadaj teraz" /> : null}
            <span style={{ marginLeft: "auto", fontWeight: 900, opacity: 0.9 }}>{status}</span>
          </div>

          {topAlert ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                background: objectionMeta(topAlert.type).bg,
                border: `1px solid ${objectionMeta(topAlert.type).bd}`,
                color: "#fff",
              }}
            >
              <div style={{ fontWeight: 950 }}>Alert: {objectionMeta(topAlert.type).title}</div>
              <div style={{ marginTop: 6, opacity: 0.95, fontWeight: 800 }}>Klient: {topAlert.evidence}</div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, fontSize: teleFont, fontWeight: 950, lineHeight: 1.25 }}>
            {effectiveNextLine}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => navigator.clipboard.writeText(effectiveNextLine)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Kopiuj zdanie
            </button>

            {shouldShowClose ? (
              <button
                onClick={() => {
                  const line = chooseBestCloseLine(objections);
                  setNextLine(line);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(34,197,94,0.16)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 950,
                }}
              >
                Ustaw domknięcie
              </button>
            ) : null}

            <button
              onClick={() => setTeleprompterOn(false)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
                marginLeft: "auto",
              }}
            >
              Ukryj teleprompter
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 900, opacity: 0.9 }}>Rozmiar</span>
              <input type="range" min={18} max={40} value={teleFont} onChange={(e) => setTeleFont(Number(e.target.value))} />
              <span style={{ fontWeight: 900, opacity: 0.9 }}>{teleFont}px</span>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 900, opacity: 0.9 }}>Tempo tła</span>
              <input type="range" min={5} max={25} value={teleSpeed} onChange={(e) => setTeleSpeed(Number(e.target.value))} />
            </label>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setTeleprompterOn(true)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              cursor: "pointer",
              fontWeight: 900,
              color: LIGHT_TEXT,
            }}
          >
            Pokaż teleprompter
          </button>
        </div>
      )}

      {/* HEADER (ON DARK) */}
      <h1 style={{ fontSize: 28, fontWeight: 950, marginTop: 8, color: LIGHT_TEXT }}>Live AI Coach</h1>
      <p style={{ marginTop: 6, color: LIGHT_MUTED }}>
        AI słucha rozmowy i <b>podpowiada co powiedzieć dalej</b>, wykrywa obiekcje i pomaga domykać.
      </p>

      {/* CONTROLS (ON DARK) */}
      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={recording ? stop : start}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            fontWeight: 950,
            background: recording ? "rgba(239,68,68,0.22)" : "rgba(45,212,191,0.18)",
            border: "1px solid rgba(255,255,255,0.14)",
            cursor: "pointer",
            color: LIGHT_TEXT,
          }}
        >
          {recording ? "Stop" : "Start"}
        </button>

        <button
          onClick={clearAll}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            fontWeight: 900,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            color: LIGHT_TEXT,
          }}
        >
          Wyczyść
        </button>

        <Badge text={`Stage: ${stageLabel(stage)}`} />
        <span style={{ fontWeight: 900, color: LIGHT_MUTED2 }}>{status}</span>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 16, marginTop: 18 }}>
        {/* LEFT: Objections + Tips + Close */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* OBJECTIONS (WHITE CARD) */}
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 16,
              padding: 16,
              color: TEXT,
            }}
          >
            <div style={{ fontWeight: 950, color: TEXT }}>Wykryte obiekcje</div>
            <div style={{ marginTop: 6, color: MUTED2 }}>
              Jeśli obiekcja się pojawi — dostaniesz gotową odpowiedź + pytanie.
            </div>

            {objections.length === 0 ? (
              <div style={{ marginTop: 12, color: MUTED2 }}>Brak obiekcji w ostatnim fragmencie.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {objections.map((o, idx) => {
                  const m = objectionMeta(o.type);
                  return (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${m.bd}`,
                        background: m.bg,
                        padding: 12,
                        color: TEXT,
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          style={{
                            background: m.pill,
                            color: "#fff",
                            fontWeight: 950,
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                          }}
                        >
                          {m.title}
                        </span>
                        <span style={{ fontWeight: 900, color: MUTED }}>{o.evidence}</span>
                      </div>

                      <div style={{ marginTop: 10, fontWeight: 950, color: TEXT }}>Co odpowiedzieć:</div>
                      <div style={{ marginTop: 4, fontWeight: 800, color: TEXT }}>{o.response}</div>

                      <div style={{ marginTop: 10, fontWeight: 950, color: TEXT }}>Pytanie dalej:</div>
                      <div style={{ marginTop: 4, fontWeight: 800, color: TEXT }}>{o.question}</div>

                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button
                          onClick={() => navigator.clipboard.writeText(o.response)}
                          style={{
                            padding: "9px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(15,23,42,0.12)",
                            background: "rgba(255,255,255,0.95)",
                            cursor: "pointer",
                            fontWeight: 950,
                            color: TEXT,
                          }}
                        >
                          Kopiuj odpowiedź
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(o.question)}
                          style={{
                            padding: "9px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(15,23,42,0.12)",
                            background: "rgba(255,255,255,0.95)",
                            cursor: "pointer",
                            fontWeight: 950,
                            color: TEXT,
                          }}
                        >
                          Kopiuj pytanie
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* TIPS (WHITE CARD) */}
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 16,
              padding: 16,
              color: TEXT,
            }}
          >
            <div style={{ fontWeight: 950, color: TEXT }}>Podpowiedzi</div>
            {tips.length === 0 ? (
              <div style={{ marginTop: 12, color: MUTED2 }}>Brak tipów.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {tips.slice(0, 6).map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigator.clipboard.writeText(t)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(15,23,42,0.06)",
                      color: TEXT,
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                    title="Kliknij, żeby skopiować"
                  >
                    {t}
                    <div style={{ marginTop: 6, fontSize: 12, color: MUTED2, fontWeight: 800 }}>
                      Kliknij, aby skopiować
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* AUTO CLOSE PACK */}
          {shouldShowClose ? (
            <section
              style={{
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 16,
                padding: 16,
                color: TEXT,
              }}
            >
              <div style={{ fontWeight: 950, color: TEXT }}>Automatyczne domykanie</div>
              <div style={{ marginTop: 6, color: MUTED, fontWeight: 800 }}>
                Wykryto etap <b>{stageLabel(stage)}</b>. Poniżej masz gotowe domknięcia:
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {closePack.map((line, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setNextLine(line);
                      navigator.clipboard.writeText(line);
                    }}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(255,255,255,0.92)",
                      color: TEXT,
                      cursor: "pointer",
                      fontWeight: 950,
                    }}
                    title="Kliknij: ustawi jako nextLine i skopiuje"
                  >
                    {line}
                    <div style={{ marginTop: 6, fontSize: 12, color: MUTED2, fontWeight: 800 }}>
                      Kliknij: ustaw jako „Powiedz teraz” + skopiuj
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* RIGHT: Transcript */}
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 16,
            padding: 16,
            minHeight: 280,
            color: TEXT,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 950, color: TEXT }}>Transkrypcja</div>
            <button
              onClick={() =>
                navigator.clipboard.writeText(segments.map((s) => `${speakerLabel(s.speaker)}: ${s.text}`).join("\n"))
              }
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.12)",
                background: "rgba(15,23,42,0.05)",
                cursor: "pointer",
                fontWeight: 950,
                color: TEXT,
              }}
            >
              Kopiuj transkrypcję
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {segments.length === 0 ? (
              <div style={{ color: MUTED2 }}>Jeszcze nic…</div>
            ) : (
              segments.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background:
                      s.speaker === "client"
                        ? "rgba(59,130,246,0.08)"
                        : s.speaker === "agent"
                        ? "rgba(34,197,94,0.08)"
                        : "rgba(15,23,42,0.04)",
                    color: TEXT,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 12, color: MUTED2 }}>{speakerLabel(s.speaker)}</div>
                  <div style={{ marginTop: 6, fontWeight: 850, lineHeight: 1.5, color: TEXT }}>{s.text}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: MUTED2 }}>
            Szybkość: tniemy rozmowę co ~3 sekundy (stabilne dla API). Teleprompter zawsze pokazuje najnowszą sugestię.
          </div>
        </section>
      </div>
    </main>
  );
}
