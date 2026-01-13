?"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

function renderContentWithLinks(text: string) {
  // ZamieD URL-e na klikalne linki (proste i bez bibliotek)
  const urlRegex = /(https?:\/\/[^\s)]+)|(\bwww\.[^\s)]+)/g;

  const parts: Array<string | { url: string; label: string }> = [];
  let lastIndex = 0;

  const matches = text.matchAll(urlRegex);
  for (const match of matches) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    parts.push({ url, label: raw });

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((p, i) => {
    if (typeof p === "string") return <span key={i}>{p}</span>;
    return (
      <a
        key={i}
        href={p.url}
        target="_blank"
        rel="noreferrer noopener"
        style={{ textDecoration: "underline" }}
      >
        {p.label}
      </a>
    );
  });
}

export default function CalliWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Cze[! 9 Jestem Calli Chat.\n\nPomagam w nieruchomo[ciach (KW, notariusz, urz&d, dokumenty), ale mog" te| odpowiedzie! na dowolne pytanie i sprawdzi! aktualne informacje w sieci.\n\nZadaj pytanie !",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/calli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // & DODATEK: je[li backend zwraca sources (linki), doklej je do odpowiedzi
      let content: string = data.reply ?? "";

      if (Array.isArray(data.sources) && data.sources.length) {
        const srcText = data.sources
          .slice(0, 5)
          .map((s: any, i: number) => {
            const title =
              typeof s?.title === "string" && s.title.trim() ? s.title.trim() : "";
            const url = typeof s?.url === "string" ? s.url : "";
            return `${i + 1}. ${title ? title + "  " : ""}${url}`;
          })
          .filter((line: string) => line.trim() && !line.trim().endsWith(""))
          .join("\n");

        if (srcText.trim()) {
          content += `\n\n9r�dBa:\n${srcText}`;
        }
      }

      setMessages((m) => [...m, { role: "assistant" as const, content }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant" as const,
          content: "a��<� Wyst&piB bB&d. Spr�buj ponownie za chwil".",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const C = {
    bg: "#0B1220",
    border: "rgba(255,255,255,0.14)",
    text: "rgba(255,255,255,0.95)",
    muted: "rgba(255,255,255,0.65)",
    userBg: "#2DD4BF",
    userText: "#061018",
    botBg: "rgba(255,255,255,0.08)",
    shadow: "0 24px 60px rgba(0,0,0,0.45)",
  };

  return (
    <>
      {/* Bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          borderRadius: 999,
          border: `1px solid ${C.border}`,
          background: "rgba(11,18,32,0.85)",
          backdropFilter: "blur(10px)",
          boxShadow: C.shadow,
          padding: "10px 16px",
          color: C.text,
          cursor: "pointer",
          fontWeight: 800,
        }}
      >
        ���<� Calli Chat
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 80,
            zIndex: 9999,
            width: "min(92vw, 400px)",
            height: "min(72vh, 580px)",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            boxShadow: C.shadow,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 14,
              borderBottom: `1px solid ${C.border}`,
              fontWeight: 900,
            }}
          >
            ���<� Calli Chat
            <div style={{ fontSize: 12, color: C.muted }}>AI �� nieruchomo[ci �� web</div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              padding: 14,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? C.userBg : C.botBg,
                  color: m.role === "user" ? C.userText : C.text,
                  padding: "10px 12px",
                  borderRadius: 14,
                  maxWidth: "88%",
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {renderContentWithLinks(m.content)}
              </div>
            ))}
            {loading && (
              <div style={{ color: C.muted, fontSize: 13 }}>Calli pisze��</div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Nie wysyBaj podczas IME (np. chiDski/japoDski)
                if ((e as any).isComposing) return;

                // Shift+Enter = nowa linia
                if (e.key === "Enter" && e.shiftKey) return;

                // Enter = wy[lij
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Zadaj pytanie��"
              style={{
                flex: 1,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.05)",
                color: C.text,
                padding: "10px 12px",
                outline: "none",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "text",
              }}
            />
            <button
              onClick={() => void send()}
              disabled={loading}
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                background: C.userBg,
                color: C.userText,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              Wy[lij
            </button>
          </div>
        </div>
      )}
    </>
  );
}
