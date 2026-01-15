"use client";

import { useEffect, useMemo, useState } from "react";

type Prospect = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: "new" | "contacted" | "closed" | "spam";
  source?: string;

  name: string;
  phone?: string | null;
  email?: string | null;

  city?: string | null;
  district?: string | null;
  street?: string | null;

  propertyType?: string | null;
  rooms?: string | null;
  area?: string | null;
  price?: string | null;

  timeframe?: string | null;
  notes?: string | null;
};

type Contact = {
  id: number;
  name?: string;
  email?: string | null;
  marketingConsent?: boolean;
  unsubscribedAt?: string | null;
};

type Lead = {
  id: number;
  name: string;
  phone?: string | null;
  preferences?: string | null;
};

export default function ProspectsIntakeAdminPage() {
  const [items, setItems] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Prospect["status"]>("all");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/prospects/intake/list", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "BBd pobierania.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message || "BBd");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((x) => {
      if (status !== "all" && x.status !== status) return false;
      if (!needle) return true;

      const hay = [
        x.id,
        x.name,
        x.phone,
        x.email,
        x.city,
        x.district,
        x.street,
        x.notes,
        x.propertyType,
      ]
        .filter(Boolean)
        .join(" �� ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [items, q, status]);

  const patchStatus = async (id: string, next: Prospect["status"]) => {
    try {
      const res = await fetch("/api/prospects/intake", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Nie udaBo si zmieni! statusu.");
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: next, updatedAt: new Date().toISOString() } : x)));
    } catch (e: any) {
      alert(e?.message || "BBd");
    }
  };

  const addToContacts = (p: Prospect) => {
    const raw = localStorage.getItem("contacts");
    const list: Contact[] = raw ? JSON.parse(raw) : [];

    const email = (p.email || "").trim() || null;

    // dedupe po email (case-insensitive) je[li jest
    if (email) {
      const exists = list.some((c) => (c.email || "").trim().toLowerCase() === email.toLowerCase());
      if (exists) {
        alert("Kontakt z tym emailem ju| istnieje.");
        return;
      }
    }

    const payload: Contact = {
      id: Date.now(),
      name: p.name,
      email,
      marketingConsent: false, // UWAGA: to nie jest zgoda marketingowa z formularza "sprzeda|"
      unsubscribedAt: null,
    };

    const next = [payload, ...list];
    localStorage.setItem("contacts", JSON.stringify(next));
    alert("Dodano do kontakt�w &");
  };

  const addToLeads = (p: Prospect) => {
    const raw = localStorage.getItem("leads");
    const list: Lead[] = raw ? JSON.parse(raw) : [];

    // dedupe po nazwie+telefonie
    const key = `${(p.name || "").trim().toLowerCase()}|${(p.phone || "").trim()}`;
    const exists = list.some((l) => `${(l.name || "").trim().toLowerCase()}|${(l.phone || "").trim()}` === key);
    if (exists) {
      alert("Lead o tej samej nazwie/telefonie ju| istnieje.");
      return;
    }

    const prefs = [
      p.city ? `Miasto: ${p.city}` : "",
      p.district ? `Dzielnica: ${p.district}` : "",
      p.street ? `Ulica: ${p.street}` : "",
      p.propertyType ? `Typ: ${p.propertyType}` : "",
      p.rooms ? `Pokoje: ${p.rooms}` : "",
      p.area ? `Metra|: ${p.area} m�` : "",
      p.price ? `Cena: ${p.price} zB` : "",
      p.timeframe ? `Termin: ${p.timeframe}` : "",
      p.notes ? `Info: ${p.notes}` : "",
    ]
      .filter(Boolean)
      .join(" �� ");

    const payload: Lead = {
      id: Date.now(),
      name: p.name,
      phone: p.phone || null,
      preferences: prefs || null,
    };

    const next = [payload, ...list];
    localStorage.setItem("leads", JSON.stringify(next));
    alert("Dodano do lead�w &");
  };

  const badge = (s: Prospect["status"]) => {
    const map: Record<string, React.CSSProperties> = {
      new: { border: "1px solid rgba(45,212,191,0.30)", background: "rgba(45,212,191,0.10)", color: "rgba(234,255,251,0.95)" },
      contacted: { border: "1px solid rgba(59,130,246,0.30)", background: "rgba(59,130,246,0.10)", color: "rgba(224,232,255,0.95)" },
      closed: { border: "1px solid rgba(245,158,11,0.30)", background: "rgba(245,158,11,0.10)", color: "rgba(255,236,200,0.95)" },
      spam: { border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.10)", color: "rgba(255,220,220,0.95)" },
    };
    return map[s] || map.new;
  };

  const S = {
    card: {
      background: "var(--bg-card)",
      border: "1px solid var(--border-soft)",
      borderRadius: 18,
      padding: 16,
    } as const,
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid var(--border-soft)",
      background: "rgba(255,255,255,0.04)",
      color: "var(--text-main)",
      outline: "none",
    } as const,
    label: { fontSize: 12, fontWeight: 900, color: "var(--text-muted)" } as const,
    btn: {
      borderRadius: 14,
      padding: "10px 12px",
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(234,255,251,0.95)",
      fontWeight: 900,
      cursor: "pointer",
    } as const,
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <style>{`
        select.ce-select { background: rgba(7,13,24,0.72); color: rgba(234,255,251,0.95); }
        select.ce-select option { background: #fff; color: #0f172a; }
      `}</style>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{ border: "1px solid rgba(45,212,191,0.25)", background: "rgba(45,212,191,0.08)", color: "rgba(234,255,251,0.92)" }}
          >
            <span style={{ color: "var(--accent)" }}><�</span> Pozyski / Formularz
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            A ZgBoszenia sprzeda|y
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Publiczny formularz: <b>/prospects/form</b> �� Panel: lista zgBoszeD + szybkie dodanie do kontakt�w/leads.
          </p>
        </div>

        <button style={S.btn} onClick={load} disabled={loading}>
           Od[wie|
        </button>
      </div>

      <section className="mt-6" style={S.card}>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div style={S.label}>Szukaj</div>
            <input style={S.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="np. email, imi", dzielnica..." />
          </div>
          <div>
            <div style={S.label}>Status</div>
            <select className="ce-select" style={S.input} value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="all">Wszystkie</option>
              <option value="new">Nowe</option>
              <option value="contacted">Skontaktowane</option>
              <option value="closed">Zamkni"te</option>
              <option value="spam">Spam</option>
            </select>
          </div>
        </div>

        {err ? (
          <div className="mt-4 text-sm" style={{ color: "rgba(255,220,220,0.95)" }}>
            a� {err}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            B 9�aduj"��
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            Brak zgBoszeD.
          </div>
        ) : (
          <div className="mt-4 grid gap-12">
            {filtered.slice(0, 200).map((p) => (
              <div key={p.id} className="rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <div className="text-lg font-extrabold" style={{ color: "rgba(234,255,251,0.95)" }}>
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text-muted)", overflowWrap: "anywhere" }}>
                      {p.email ? `0�<� ${p.email}` : ""} {p.phone ? ` �� �}�<� ${p.phone}` : ""}
                    </div>
                    <div className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.78)", overflowWrap: "anywhere" }}>
                      d {[p.city, p.district, p.street].filter(Boolean).join(", ") || ""}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      ID: {p.id} �� {p.createdAt ? new Date(p.createdAt).toLocaleString("pl-PL") : ""}
                    </div>
                  </div>

                  <span className="rounded-full px-3 py-1 text-xs font-black" style={badge(p.status)}>
                    {p.status}
                  </span>
                </div>

                <div className="mt-3 text-sm" style={{ color: "rgba(234,255,251,0.92)" }}>
                  {[
                    p.propertyType ? `Typ: ${p.propertyType}` : "",
                    p.rooms ? `Pokoje: ${p.rooms}` : "",
                    p.area ? `Metra|: ${p.area} m�` : "",
                    p.price ? `Cena: ${p.price} zB` : "",
                    p.timeframe ? `Termin: ${p.timeframe}` : "",
                  ]
                    .filter(Boolean)
                    .join(" �� ")}
                </div>

                {p.notes ? (
                  <div className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.86)" }}>
                    e {p.notes}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button style={S.btn} onClick={() => addToContacts(p)}>
                    ~" Kontakty
                  </button>
                  <button style={S.btn} onClick={() => addToLeads(p)}>
                    ~" Leady
                  </button>

                  <button style={S.btn} onClick={() => patchStatus(p.id, "contacted")}>
                    & Skontaktowany
                  </button>
                  <button style={S.btn} onClick={() => patchStatus(p.id, "closed")}>
                    z� Zamkni"ty
                  </button>
                  <button style={{ ...S.btn, border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.10)", color: "rgba(255,220,220,0.95)" }} onClick={() => patchStatus(p.id, "spam")}>
                    : Spam
                  </button>
                </div>
              </div>
            ))}

            {filtered.length > 200 ? (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Lista uci"ta do 200 (|eby byBo szybko).
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
