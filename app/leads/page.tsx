"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ===== TYPES ===== */
type Property = {
  id: number;
  city?: string;
  district?: string;
  street?: string;
  rooms?: number;
  price?: number;
  elevator?: boolean;
};

type Lead = {
  id: number;
  name: string;
  phone?: string | null;
  preferences?: string | null;
};

type Suggestion = {
  display_name: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferences: "",
  });

  /* ===== AUTOCOMPLETE ===== */
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) return setSuggestions([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=pl&q=${encodeURIComponent(
          query
        )}`,
        {
          headers: {
            // Nominatim lubi jak jest User-Agent / Referer, ale w przeglądarce nie zawsze można.
            // To i tak działa bez tego w większości przypadków.
          },
        }
      );
      const data: unknown = await res.json();
      setSuggestions(Array.isArray(data) ? (data as any[]).slice(0, 6) : []);
    } catch {
      setSuggestions([]);
    }
  };

  const onPrefChange = (value: string) => {
    setForm((prev) => ({ ...prev, preferences: value }));

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const last = value.trim().split(/\s+/).slice(-1)[0] || "";
      void fetchSuggestions(last);
    }, 350);
  };

  const applySuggestion = (text: string) => {
    setForm((prev) => ({ ...prev, preferences: text }));
    setSuggestions([]);
  };

  /* ===== LOAD ===== */
  useEffect(() => {
    try {
      const rawLeads = localStorage.getItem("leads");
      const rawProps = localStorage.getItem("properties");

      const parsedLeads: unknown = rawLeads ? JSON.parse(rawLeads) : [];
      const parsedProps: unknown = rawProps ? JSON.parse(rawProps) : [];

      setLeads(Array.isArray(parsedLeads) ? (parsedLeads as Lead[]) : []);
      setProperties(Array.isArray(parsedProps) ? (parsedProps as Property[]) : []);
    } catch {
      setLeads([]);
      setProperties([]);
    }
  }, []);

  const saveLeads = (data: Lead[]) => {
    setLeads(data);
    try {
      localStorage.setItem("leads", JSON.stringify(data));
    } catch {}
  };

  /* ===== NORMALIZE ===== */
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/(owie|ach|ami|owi|emu|ie|u|a|e|y|ow|w)$/g, "");

  /* ===== PRICE ===== */
  const extractPriceRange = (text: string) => {
    const t = text.toLowerCase().replace(/\s/g, "");
    let min: number | null = null;
    let max: number | null = null;

    const range = t.match(/(\d{2,3})-(\d{2,3})tys/);
    if (range) {
      min = Number(range[1]) * 1000;
      max = Number(range[2]) * 1000;
    }

    const maxMatch = t.match(/do(\d{2,3})tys|do(\d)mln/);
    if (maxMatch) {
      const tys = maxMatch[1];
      const mln = maxMatch[2];
      max = Number(tys || mln) * (mln ? 1_000_000 : 1000);
    }

    return { min, max };
  };

  /* ===== MATCH ===== */
  const matchScore = (lead: Lead, p: Property) => {
    if (!lead.preferences) return 0;

    const prefWords = lead.preferences.split(/\s+/).map(normalize);
    let score = 0;

    if (p.city && prefWords.some((w) => normalize(p.city).includes(w))) score += 30;
    if (p.district && prefWords.some((w) => normalize(p.district).includes(w))) score += 30;

    const rooms = lead.preferences.match(/(\d)\s*pok/);
    if (rooms && typeof p.rooms === "number" && p.rooms === Number(rooms[1])) score += 20;

    if (lead.preferences.toLowerCase().includes("winda") && p.elevator) score += 10;

    const { min, max } = extractPriceRange(lead.preferences);
    if (typeof p.price === "number" && (!min || p.price >= min) && (!max || p.price <= max)) score += 10;

    return Math.min(score, 100);
  };

  const fallbackMatch = (lead: Lead) => {
    if (!lead.preferences) return [];

    const prefWords = lead.preferences.split(/\s+/).map(normalize);
    const { min, max } = extractPriceRange(lead.preferences);

    return properties.filter((p) => {
      const loc = [p.city, p.district, p.street]
        .filter(Boolean)
        .map((v) => normalize(String(v)));

      const locationMatch = prefWords.some((w) => loc.some((l) => l.includes(w)));
      const priceMatch =
        typeof p.price !== "number" || ((!min || p.price >= min) && (!max || p.price <= max));

      return locationMatch && priceMatch;
    });
  };

  /* ===== SAVE ===== */
  const saveLead = () => {
    if (!form.name.trim()) return alert('Podaj imię i nazwisko');

    const payload: Lead = {
      id: editingId ?? Date.now(),
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      preferences: form.preferences?.trim() || null,
    };

    saveLeads(
      editingId ? leads.map((l) => (l.id === editingId ? payload : l)) : [...leads, payload]
    );

    setForm({ name: "", phone: "", preferences: "" });
    setEditingId(null);
    setSuggestions([]);
  };

  const removeLead = (id: number) => {
    if (!confirm("Usunąć leada?")) return;
    saveLeads(leads.filter((x) => x.id !== id));
  };

  const stats = useMemo(() => {
    const all = leads.length;
    const withPrefs = leads.filter((l) => (l.preferences ?? "").trim().length > 0).length;
    const withPhone = leads.filter((l) => (l.phone ?? "").trim().length > 0).length;
    return { all, withPrefs, withPhone };
  }, [leads]);

  /* ===== UI ===== */
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* MOBILE/DESKTOP LIST SWITCH */}
      <style>{`
        .ce-table-desktop { display: block; }
        .ce-cards-mobile { display: none; }
        .ce-root-pad { }

        @media (max-width: 720px) {
          .ce-table-desktop { display: none; }
          .ce-cards-mobile { display: block; }
          .ce-root-pad { padding-left: 14px !important; padding-right: 14px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div className="ce-root-pad flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>↗</span> Sprzedaż / Popyt
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            🧲 Leady
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Zbieraj leady i automatycznie podglądaj dopasowania do ofert.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Z preferencjami" value={stats.withPrefs} tone="mint" />
          <Kpi label="Z telefonem" value={stats.withPhone} tone="blue" />
        </div>
      </div>

      {/* FORM */}
      <section
        className="ce-root-pad mt-7 rounded-2xl p-6 md:p-7"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
              {editingId ? "Edytuj leada" : "Dodaj leada"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              W preferencjach wpisz np. „Mokotów 3 pok do 1 mln winda”.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {editingId ? (
              <button
                className="rounded-xl px-4 py-2 text-sm font-extrabold"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.30)",
                  color: "rgba(255,220,220,0.95)",
                }}
                onClick={() => {
                  setForm({ name: "", phone: "", preferences: "" });
                  setEditingId(null);
                  setSuggestions([]);
                }}
              >
                Anuluj edycję
              </button>
            ) : null}

            <button className="btn-primary" onClick={saveLead}>
              {editingId ? "✅ Zapisz" : "➕ Dodaj"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Imię i nazwisko</label>
            <input
              className="input"
              placeholder="Jan Kowalski"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Telefon</label>
            <input
              className="input"
              placeholder="500600700"
              value={form.phone ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="relative md:col-span-2">
            <label className="label">Preferencje</label>
            <textarea
              className="input h-28 resize-y"
              placeholder="np. Mokotów 3 pokoje do 1 mln winda"
              value={form.preferences ?? ""}
              onChange={(e) => onPrefChange(e.target.value)}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            />

            {suggestions.length > 0 ? (
              <div
                className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl"
                style={{
                  background: "rgba(7, 13, 24, 0.92)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(10px)",
                  zIndex: 40,
                }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="block w-full px-4 py-3 text-left text-sm"
                    style={{
                      color: "var(--text-main)",
                      borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySuggestion(s.display_name);
                    }}
                  >
                    <div className="font-extrabold" style={{ color: "rgba(234,255,251,0.95)" }}>
                      📍 {s.display_name}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      Kliknij, aby wstawić
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            padding: 12px 12px;
            border-radius: 14px;
            border: 1px solid var(--border-soft);
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-main);
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          }
          .input:focus {
            border-color: rgba(45, 212, 191, 0.55);
            box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
            background: rgba(255, 255, 255, 0.05);
          }
          .label {
            font-size: 12px;
            font-weight: 900;
            margin-bottom: 6px;
            display: block;
            color: var(--text-muted);
            letter-spacing: 0.2px;
          }
          .btn-primary {
            border-radius: 12px;
            padding: 10px 14px;
            font-weight: 900;
            background: rgba(45, 212, 191, 0.14);
            border: 1px solid rgba(45, 212, 191, 0.35);
            color: rgba(234, 255, 251, 0.95);
          }
        `}</style>
      </section>

      {/* LIST */}
      <section className="ce-root-pad mt-7">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
              Lista leadów
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Łącznie: {leads.length}
            </p>
          </div>
        </div>

        {leads.length === 0 ? (
          <div
            className="mt-4 rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
          >
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              Brak leadów. Dodaj pierwszego powyżej.
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE: cards */}
            <div className="ce-cards-mobile mt-4" style={{ display: "grid", gap: 12 }}>
              {leads.map((l) => {
                const matches = fallbackMatch(l);
                return (
                  <div
                    key={l.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-soft)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ minWidth: 0 }}>
                        <div className="text-base font-extrabold" style={{ color: "var(--text-main)" }}>
                          {l.name}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          {l.phone || ""}
                        </div>
                      </div>

                      <span
                        className="rounded-full px-2 py-1 text-xs font-black"
                        style={{
                          border: "1px solid rgba(45,212,191,0.30)",
                          background: "rgba(45,212,191,0.10)",
                          color: "rgba(234,255,251,0.95)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {matches.length} dop.
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                        Preferencje
                      </div>
                      <div className="mt-1 text-sm" style={{ color: "rgba(234,255,251,0.92)" }}>
                        {l.preferences || ""}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                        Dopasowania
                      </div>

                      {matches.length === 0 ? (
                        <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                          Brak
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2">
                          {matches.slice(0, 3).map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl px-3 py-2"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.10)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-extrabold" style={{ color: "rgba(234,255,251,0.95)" }}>
                                  🏙️ {p.district || p.city || ""}
                                </div>
                                <span
                                  className="rounded-full px-2 py-1 text-xs font-black"
                                  style={{
                                    border: "1px solid rgba(45,212,191,0.30)",
                                    background: "rgba(45,212,191,0.10)",
                                    color: "rgba(234,255,251,0.95)",
                                  }}
                                >
                                  {matchScore(l, p)}%
                                </span>
                              </div>
                              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                                {typeof p.price === "number" ? `${p.price.toLocaleString("pl-PL")} zł` : ""}
                                {typeof p.rooms === "number" ? ` • ${p.rooms} pok.` : ""}
                                {p.elevator ? " • winda" : ""}
                              </div>
                            </div>
                          ))}

                          {matches.length > 3 ? (
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                              +{matches.length - 3} więcej dopasowań
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          flex: 1,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          color: "rgba(234,255,251,0.95)",
                        }}
                        onClick={() => {
                          setEditingId(l.id);
                          setForm({
                            name: l.name,
                            phone: l.phone ?? "",
                            preferences: l.preferences ?? "",
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        ✏️ Edytuj
                      </button>

                      <button
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          background: "rgba(239,68,68,0.10)",
                          border: "1px solid rgba(239,68,68,0.26)",
                          color: "rgba(255,220,220,0.95)",
                        }}
                        onClick={() => removeLead(l.id)}
                        title="Usuń"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP: table */}
            <div className="ce-table-desktop mt-4 surface-light overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(15,23,42,0.04)" }}>
                    <Th>Lead</Th>
                    <Th>Preferencje</Th>
                    <Th>Dopasowania</Th>
                    <Th alignRight>Akcje</Th>
                  </tr>
                </thead>

                <tbody>
                  {leads.map((l) => {
                    const matches = fallbackMatch(l);

                    return (
                      <tr key={l.id} className="border-t" style={{ borderColor: "rgba(15,23,42,0.10)" }}>
                        <Td>
                          <div className="font-black" style={{ color: "#0f172a" }}>
                            {l.name}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: "rgba(15,23,42,0.65)" }}>
                            {l.phone || ""}
                          </div>
                        </Td>

                        <Td>
                          <div className="text-sm" style={{ color: "rgba(15,23,42,0.80)" }}>
                            {l.preferences || ""}
                          </div>
                        </Td>

                        <Td>
                          {matches.length === 0 ? (
                            <span className="text-sm" style={{ color: "rgba(15,23,42,0.65)" }}>
                              Brak
                            </span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {matches.slice(0, 5).map((p) => (
                                <div
                                  key={p.id}
                                  className="rounded-xl px-3 py-2"
                                  style={{
                                    background: "rgba(15,23,42,0.04)",
                                    border: "1px solid rgba(15,23,42,0.10)",
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-extrabold" style={{ color: "#0f172a" }}>
                                      🏙️ {p.district || p.city || ""}
                                    </div>

                                    <span
                                      className="rounded-full px-2 py-1 text-xs font-black"
                                      style={{
                                        border: "1px solid rgba(45,212,191,0.30)",
                                        background: "rgba(45,212,191,0.10)",
                                        color: "#0f172a",
                                      }}
                                    >
                                      {matchScore(l, p)}%
                                    </span>
                                  </div>

                                  <div className="mt-1 text-xs" style={{ color: "rgba(15,23,42,0.70)" }}>
                                    {typeof p.price === "number" ? `${p.price.toLocaleString("pl-PL")} zł` : ""}
                                    {typeof p.rooms === "number" ? ` • ${p.rooms} pok.` : ""}
                                    {p.elevator ? " • winda" : ""}
                                  </div>
                                </div>
                              ))}

                              {matches.length > 5 ? (
                                <div className="text-xs" style={{ color: "rgba(15,23,42,0.60)" }}>
                                  +{matches.length - 5} więcej dopasowań
                                </div>
                              ) : null}
                            </div>
                          )}
                        </Td>

                        <Td alignRight>
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-xl px-3 py-2 text-xs font-extrabold"
                              style={{
                                background: "rgba(15,23,42,0.06)",
                                border: "1px solid rgba(15,23,42,0.10)",
                                color: "rgba(15,23,42,0.85)",
                              }}
                              onClick={() => {
                                setEditingId(l.id);
                                setForm({
                                  name: l.name,
                                  phone: l.phone ?? "",
                                  preferences: l.preferences ?? "",
                                });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                            >
                              ✏️ Edytuj
                            </button>

                            <button
                              className="rounded-xl px-3 py-2 text-xs font-extrabold"
                              style={{
                                background: "rgba(239,68,68,0.10)",
                                border: "1px solid rgba(239,68,68,0.26)",
                                color: "rgba(185,28,28,0.95)",
                              }}
                              onClick={() => removeLead(l.id)}
                            >
                              Usuń
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/* ====== helpers ====== */

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "mint" | "blue";
}) {
  const toneStyle: Record<string, React.CSSProperties> = {
    neutral: {
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      color: "var(--text-main)",
    },
    mint: {
      border: "1px solid rgba(45,212,191,0.30)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.95)",
    },
    blue: {
      border: "1px solid rgba(29,78,216,0.30)",
      background: "rgba(29,78,216,0.10)",
      color: "rgba(224,232,255,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function Th({
  children,
  alignRight,
}: {
  children: React.ReactNode;
  alignRight?: boolean;
}) {
  return (
    <th
      className={`px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide ${
        alignRight ? "text-right" : ""
      }`}
      style={{ color: "rgba(15,23,42,0.70)" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  alignRight,
}: {
  children: React.ReactNode;
  alignRight?: boolean;
}) {
  return <td className={`px-5 py-4 ${alignRight ? "text-right" : ""}`}>{children}</td>;
}
