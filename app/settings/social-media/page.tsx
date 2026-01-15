"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORMS } from "@/lib/social";
import type { AgentSocialLink, SocialPlatform } from "@prisma/client";

type ApiListResponse = { links: AgentSocialLink[]; error?: string };

function platformEmoji(p: SocialPlatform): string {
  switch (p) {
    case "FACEBOOK":
      return "📘";
    case "INSTAGRAM":
      return "📸";
    case "TIKTOK":
      return "🎵";
    case "YOUTUBE":
      return "▶️";
    case "LINKEDIN":
      return "💼";
    case "GOOGLE_BUSINESS":
      return "📍";
    case "WHATSAPP":
      return "💬";
    case "X":
      return "✖️";
    case "TELEGRAM":
      return "📨";
    case "MESSENGER":
      return "🟦";
    default:
      return "🔗";
  }
}

export default function SocialMediaSettingsPage() {
  const [links, setLinks] = useState<AgentSocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | null>(null);
  const [url, setUrl] = useState("");

  const linksByPlatform = useMemo(() => {
    const map = new Map<SocialPlatform, AgentSocialLink>();
    for (const l of links) map.set(l.platform, l);
    return map;
  }, [links]);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agent-social", { cache: "no-store" });
      const data = (await res.json()) as ApiListResponse;

      if (!res.ok) {
        setError(data.error || "Nie udało się pobrać danych.");
        setLinks([]);
        return;
      }

      setLinks(data.links ?? []);
    } catch {
      setError("Nie udało się pobrać danych (sprawdź serwer).");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openModal(platform: SocialPlatform) {
    const saved = linksByPlatform.get(platform);
    setActivePlatform(platform);
    setUrl(saved?.url ?? "");
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setActivePlatform(null);
    setUrl("");
    setError(null);
  }

  async function save() {
    if (!activePlatform) return;

    setBusy(true);
    setError(null);

    try {
      const cleaned = url.trim();
      if (!cleaned) {
        setError("Wklej link zanim klikniesz Zapisz.");
        return;
      }

      const res = await fetch("/api/agent-social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: activePlatform, url: cleaned }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.details?.fieldErrors?.url?.[0] ||
          data?.details?.formErrors?.[0] ||
          data?.error ||
          "Nie udało się zapisać. Link musi zaczynać się od https://";
        setError(msg);
        return;
      }

      await refresh();
      closeModal();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!activePlatform) return;

    setBusy(true);
    setError(null);

    try {
      await fetch(`/api/agent-social/${activePlatform}`, { method: "DELETE" });
      await refresh();
      closeModal();
    } finally {
      setBusy(false);
    }
  }

  const activeLabel =
    activePlatform ? PLATFORMS.find((p) => p.key === activePlatform)?.label : "";
  const activePlaceholder =
    activePlatform ? PLATFORMS.find((p) => p.key === activePlatform)?.placeholder : "";

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>Social media</h1>
      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 16 }}>
        Kliknij platformę, wklej link i zapisz. Prosto.
      </p>

      {error && !open && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,0,0,0.35)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div>Ładowanie...</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {PLATFORMS.map((p) => {
            const saved = linksByPlatform.get(p.key);
            return (
              <button
                key={p.key}
                onClick={() => openModal(p.key)}
                style={{
                  textAlign: "left",
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: 14,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900, display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>{platformEmoji(p.key)}</span>
                    <span>{p.label}</span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {saved ? "✅ Podpięte" : "— Niepodpięte"}
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  {saved?.url ? (
                    <span
                      style={{
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                      title={saved.url}
                    >
                      {saved.url}
                    </span>
                  ) : (
                    <span>Dodaj link do profilu</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 100%)",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(10,16,28,0.96)",
              color: "var(--text-main)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {activePlatform ? platformEmoji(activePlatform) : "🔗"} {activeLabel}
              </div>
              <button
                onClick={closeModal}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  padding: "8px 10px",
                  cursor: "pointer",
                  color: "var(--text-main)",
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <label style={{ fontSize: 12, opacity: 0.8 }}>Link do profilu</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={activePlaceholder || "https://..."}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-main)",
                  outline: "none",
                }}
              />

              {error && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,0,0,0.35)",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                <button
                  onClick={remove}
                  disabled={busy}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    padding: "10px 12px",
                    cursor: busy ? "not-allowed" : "pointer",
                    color: "var(--text-main)",
                    fontWeight: 800,
                    opacity: 0.9,
                  }}
                >
                  {busy ? "..." : "Usuń"}
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={closeModal}
                    disabled={busy}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "transparent",
                      padding: "10px 12px",
                      cursor: busy ? "not-allowed" : "pointer",
                      color: "var(--text-main)",
                      fontWeight: 800,
                      opacity: 0.9,
                    }}
                  >
                    Anuluj
                  </button>

                  <button
                    onClick={save}
                    disabled={busy}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.12)",
                      padding: "10px 12px",
                      cursor: busy ? "not-allowed" : "pointer",
                      color: "var(--text-main)",
                      fontWeight: 900,
                    }}
                  >
                    {busy ? "Zapisuję..." : "Zapisz"}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Wskazówka: link musi zaczynać się od <b>https://</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
