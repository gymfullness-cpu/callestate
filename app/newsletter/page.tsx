?"use client";

import { useEffect, useMemo, useState } from "react";

/* ===== TYPES (dopasowane do localStorage) ===== */
type Contact = {
  id: number;
  name?: string;
  email?: string | null;
  marketingConsent?: boolean;
  unsubscribedAt?: string | null;
};

type Property = {
  id: number;
  title?: string;
  city?: string;
  district?: string;
  street?: string;
  rooms?: number;
  price?: number;
  area?: number;
  elevator?: boolean;
  // u Ciebie w details s& te��� pola typu apartmentNumber itd.
  // newsletter ich nie potrzebuje, ale nie przeszkadzaj&.
};

type Lead = {
  id: number;
  name: string;
  phone?: string | null;
  preferences?: string | null;
};

export default function NewsletterPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [mode, setMode] = useState<"all" | "matched">("all");
  const [threshold, setThreshold] = useState<number>(60);

  // & sta� ae ustawienia newslettera (ustawiasz raz)
  const [templateSubjectPrefix, setTemplateSubjectPrefix] = useState<string>("Nowa nieruchomo� _ �:");
  const [templateMessage, setTemplateMessage] = useState<string>(
    "Cze� _ �!\n\nMam dla Ciebie now& ofert��. Je� _li chcesz, pode� _l�� wi��cej szczeg�B� a�Bw / um�Bwimy prezentacj��.\n"
  );
  const [templateSignature, setTemplateSignature] = useState<string>("Pozdrawiam!\n��\nCalyx AI / Agent");

  /* ===== LOAD ===== */
  useEffect(() => {
    setContacts(JSON.parse(localStorage.getItem("contacts") || "[]"));
    setLeads(JSON.parse(localStorage.getItem("leads") || "[]"));
    setProperties(JSON.parse(localStorage.getItem("properties") || "[]"));

    const s1 = localStorage.getItem("nl_subject_prefix");
    const s2 = localStorage.getItem("nl_message");
    const s3 = localStorage.getItem("nl_signature");

    if (s1 && s1.trim()) setTemplateSubjectPrefix(s1);
    if (s2 && s2.trim()) setTemplateMessage(s2);
    if (s3 && s3.trim()) setTemplateSignature(s3);
  }, []);

  /* ===== SAVE (ustawiasz raz, pami��ta) ===== */
  useEffect(() => localStorage.setItem("nl_subject_prefix", templateSubjectPrefix), [templateSubjectPrefix]);
  useEffect(() => localStorage.setItem("nl_message", templateMessage), [templateMessage]);
  useEffect(() => localStorage.setItem("nl_signature", templateSignature), [templateSignature]);

  const selectedProperty = useMemo(() => {
    if (selectedPropertyId == null) return null;
    return properties.find((p) => p.id === selectedPropertyId) || null;
  }, [selectedPropertyId, properties]);

  /* ===== NORMALIZE (jak w leadach) ===== */
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/(owie|ach|ami|owi|emu|ie|u|a|e|y|ow|�Bw)$/g, "");

  /* ===== PRICE (jak w leadach) ===== */
  const extractPriceRange = (text: string) => {
    const t = text.toLowerCase().replace(/\s/g, "");
    let min: number | null = null;
    let max: number | null = null;

    const range = t.match(/(\d{2,3})[-��=� ](\d{2,3})tys/);
    if (range) {
      min = +range[1] * 1000;
      max = +range[2] * 1000;
    }

    const maxMatch = t.match(/do(\d{2,3})tys|do(\d)mln/);
    if (maxMatch) {
      max = Number(maxMatch[1] || maxMatch[2]) * (maxMatch[2] ? 1_000_000 : 1000);
    }

    return { min, max };
  };

  /* ===== MATCH SCORE (jak w leadach) ===== */
  const matchScore = (lead: Lead, p: Property) => {
    if (!lead.preferences) return 0;
    const prefWords = lead.preferences.split(/\s+/).map(normalize);
    let score = 0;

    if (p.city && prefWords.some((w) => normalize(p.city!).includes(w))) score += 30;
    if (p.district && prefWords.some((w) => normalize(p.district!).includes(w))) score += 30;

    const rooms = lead.preferences.match(/(\d)\s*pok/);
    if (rooms && typeof p.rooms === "number" && p.rooms === Number(rooms[1])) score += 20;

    if (lead.preferences.includes("winda") && p.elevator) score += 10;

    const { min, max } = extractPriceRange(lead.preferences);
    if (p.price && (!min || p.price >= min) && (!max || p.price <= max)) score += 10;

    return Math.min(score, 100);
  };

  /* ===== MAP: lead name -> lead ===== */
  const leadByName = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leads) m.set((l.name || "").trim().toLowerCase(), l);
    return m;
  }, [leads]);

  /* ===== SAFE CONTACTS ===== */
  const safeContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (!c.email) return false;
      if (c.unsubscribedAt) return false;
      if (c.marketingConsent === false) return false;
      return true;
    });
  }, [contacts]);

  /* ===== RECIPIENTS (dedupe + matched) ===== */
  const recipients = useMemo(() => {
    if (!selectedProperty) return [];

    const dedupeByEmail = <T extends { email: string }>(list: T[]) => {
      const seen = new Set<string>();
      const out: T[] = [];
      for (const item of list) {
        const key = item.email.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
      }
      return out;
    };

    if (mode === "all") {
      return dedupeByEmail(
        safeContacts.map((c) => ({
          email: c.email!,
          name: c.name || "",
          score: null as number | null,
        }))
      );
    }

    const out: Array<{ email: string; name: string; score: number }> = [];
    for (const c of safeContacts) {
      const key = (c.name || "").trim().toLowerCase();
      const lead = leadByName.get(key);
      if (!lead) continue;

      const s = matchScore(lead, selectedProperty);
      if (s >= threshold) out.push({ email: c.email!, name: c.name || "", score: s });
    }

    out.sort((a, b) => b.score - a.score);
    return dedupeByEmail(out);
  }, [mode, safeContacts, leadByName, selectedProperty, threshold]);

  /* ===== SUBJECT + BODY (sta� ay template) ===== */
  const subject = useMemo(() => {
    if (!selectedProperty) return `${templateSubjectPrefix} oferta`;
    const loc = [selectedProperty.city, selectedProperty.district].filter(Boolean).join(", ");
    const rooms = typeof selectedProperty.rooms === "number" ? `${selectedProperty.rooms} pok. ��˘ ` : "";
    return `${templateSubjectPrefix} ${rooms}${loc || "oferta"}`.trim();
  }, [selectedProperty, templateSubjectPrefix]);

  const detailsBlock = useMemo(() => {
    if (!selectedProperty) return "";
    return [
      "",
      "������",
      "Szczeg�B� ay oferty:",
      `=� 9� Lokalizacja: ${[selectedProperty.city, selectedProperty.district, selectedProperty.street].filter(Boolean).join(", ") || "��"}`,
      `9� Pokoje: ${typeof selectedProperty.rooms === "number" ? selectedProperty.rooms : "��"}`,
      `=� � Metra���: ${typeof selectedProperty.area === "number" ? `${selectedProperty.area} m�:` : "��"}`,
      `� Cena: ${typeof selectedProperty.price === "number" ? `${selectedProperty.price.toLocaleString("pl-PL")} z� a` : "��"}`,
      ` _� Winda: ${selectedProperty.elevator ? "tak" : "nie"}`,
      "",
      `Link do oferty: ${typeof window !== "undefined" ? `${window.location.origin}/properties/${selectedProperty.id}` : ""}`,
    ].join("\n");
  }, [selectedProperty]);

  const bodyText = useMemo(() => {
    if (!selectedProperty) return "Wybierz nieruchomo� _ �, aby wygenerowa � tre� _ �.";
    const msg = (templateMessage || "").trim();
    const sign = (templateSignature || "").trim();
    return [msg, detailsBlock, "", sign].filter(Boolean).join("\n");
  }, [selectedProperty, templateMessage, templateSignature, detailsBlock]);

  const mailtoLink = useMemo(() => {
    const to = recipients.map((r) => r.email).join(",");
    return (
      "mailto:" +
      encodeURIComponent(to) +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(bodyText)
    );
  }, [recipients, subject, bodyText]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Skopiowano &");
    } catch {
      alert("Nie uda� ao si�� skopiowa � (sprawd�9<� uprawnienia przegl&darki).");
    }
  };

  // & PDF: odpalamy istniej&cy eksport z PropertyDetails przez autopdf=1
  const exportPdfAuto = () => {
    if (!selectedProperty) return alert("Najpierw wybierz nieruchomo� _ �.");
    // otwieramy szczeg�B� ay -> a tam useEffect zrobi generatePropertyPdf(property)
    window.open(`/properties/${selectedProperty.id}?autopdf=1`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <style>{`
        .input {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-main);
          outline: none;
        }
        .input:focus {
          border-color: rgba(45, 212, 191, 0.55);
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
        }
        select.input {
          color: rgba(234,255,251,0.95);
          background: rgba(7, 13, 24, 0.72);
        }
        select.input option {
          color: rgba(234,255,251,0.95);
          background: rgb(7, 13, 24);
          font-weight: 700;
        }
        .label {
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 6px;
          display: block;
          color: var(--text-muted);
        }
        .btn {
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 900;
          font-size: 13px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: rgba(234,255,251,0.95);
        }
        .btnPrimary {
          border: 1px solid rgba(45,212,191,0.35);
          background: rgba(45,212,191,0.12);
        }
        .btnDanger {
          border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.12);
          color: rgba(255,220,220,0.95);
        }
      `}</style>

      <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-main)" }}>
         ��<�9 Newsletter
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        Ustawiasz raz tre� _ �/temat/podpis  � wybierasz ofert��  � PDF (auto)  � otwierasz email.
      </p>

      {/* USTAWIENIA TEMPLATE (sta� ae) */}
      <section className="mt-6 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
        <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
          Szablon (zapami��tywany)
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Prefix tematu</label>
            <input className="input" value={templateSubjectPrefix} onChange={(e) => setTemplateSubjectPrefix(e.target.value)} />
          </div>

          <div>
            <label className="label">Podpis</label>
            <textarea className="input" style={{ minHeight: 88 }} value={templateSignature} onChange={(e) => setTemplateSignature(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="label">Tre� _ � wiadomo� _ci (sta� aa)</label>
            <textarea className="input" style={{ minHeight: 140 }} value={templateMessage} onChange={(e) => setTemplateMessage(e.target.value)} />
          </div>
        </div>
      </section>

      {/* WYB�=� R + TRYB */}
      <section className="mt-6 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Nieruchomo� _ �</label>
            <select className="input" value={selectedPropertyId ?? ""} onChange={(e) => setSelectedPropertyId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">�� wybierz ��</option>
              {properties
                .slice()
                .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} ��˘ {[p.city, p.district].filter(Boolean).join(", ") || "��"}
                    {typeof p.price === "number" ? ` ��˘ ${p.price.toLocaleString("pl-PL")} z� a` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="label">Tryb odbiorc�Bw</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className={`btn ${mode === "all" ? "btnPrimary" : ""}`} onClick={() => setMode("all")}>
                 �� Wszyscy
              </button>
              <button type="button" className={`btn ${mode === "matched" ? "btnPrimary" : ""}`} onClick={() => setMode("matched")}>
                9� Dopasowani
              </button>
            </div>

            {mode === "matched" ? (
              <div style={{ marginTop: 10 }}>
                <label className="label">Pr�Bg dopasowania (0��=� 100)</label>
                <input className="input" type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 0))} />
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={exportPdfAuto} disabled={!selectedProperty}>
            =�  PDF (auto z oferty)
          </button>

          <button type="button" className="btn" onClick={() => copy(recipients.map((r) => r.email).join(", "))} disabled={recipients.length === 0}>
            =�   Kopiuj odbiorc�Bw
          </button>

          <button type="button" className="btn" onClick={() => copy(subject)} disabled={!selectedProperty}>
            =�   Kopiuj temat
          </button>

          <button type="button" className="btn" onClick={() => copy(bodyText)} disabled={!selectedProperty}>
            =�   Kopiuj tre� _ �
          </button>

          <a
            className={`btn ${selectedProperty && recipients.length > 0 ? "btnDanger" : ""}`}
            href={selectedProperty && recipients.length > 0 ? mailtoLink : undefined}
            onClick={(e) => {
              if (!selectedProperty || recipients.length === 0) e.preventDefault();
            }}
            title="Uwaga: mailto nie do� a&cza automatycznie PDF. Kliknij PDF (auto), a potem do� a&cz plik r��cznie w poczcie."
          >
            =� � Otw�rz email
          </a>
        </div>

        <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Tip: mailto nie potrafi automatycznie doda � za� a&cznika. Najpierw pobierz PDF, potem kliknij Otw�rz email i dodaj plik r��cznie.
        </div>
      </section>

      {/* PODGLD */}
      <section className="mt-6 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
        <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
          Podgl&d
        </h2>
        <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <b>Temat:</b> {subject}
        </div>
        <pre
          className="mt-3 rounded-2xl p-4 text-sm"
          style={{
            whiteSpace: "pre-wrap",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(234,255,251,0.92)",
          }}
        >
          {bodyText}
        </pre>
      </section>
    </main>
  );
}