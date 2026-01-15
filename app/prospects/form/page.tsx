"use client";

import { useMemo, useState } from "react";

type FormState = {
  name: string;
  phone: string;
  email: string;

  city: string;
  district: string;
  street: string;

  propertyType: "mieszkanie" | "dom" | "dzialka" | "lokal";
  rooms: string;
  area: string;
  price: string;

  timeframe: "od_razu" | "1_3_mies" | "3_6_mies" | "6_plus" | "nie_wiem";
  notes: string;

  consent: boolean;

  // honeypot (anty-spam) — normalny user tego nie widzi
  website: string;
};

const EMPTY: FormState = {
  name: "",
  phone: "",
  email: "",

  city: "",
  district: "",
  street: "",

  propertyType: "mieszkanie",
  rooms: "",
  area: "",
  price: "",

  timeframe: "nie_wiem",
  notes: "",

  consent: false,
  website: "",
};

export default function ProspectsIntakeFormPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sending, setSending] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  const canSend = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!form.phone.trim() && !form.email.trim()) return false;
    if (!form.city.trim()) return false;
    if (!form.consent) return false;
    return true;
  }, [form]);

  const submit = async () => {
    setErr("");

    if (!canSend) {
      setErr("Uzupełnij wymagane pola (imię™, miasto, kontakt + zgoda).");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/prospects/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // UWAGA: website = honeypot
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Błąd wysyłki formularza.");

      setDoneId(String(data.id || ""));
    } catch (e: any) {
      setErr(e?.message || "Nie udało się wysłać‡ formularza.");
    } finally {
      setSending(false);
    }
  };

  const S = {
    page: {
      maxWidth: 920,
      margin: "0 auto",
      padding: "18px 16px 40px",
      color: "var(--text-main)",
    } as const,
    card: {
      borderRadius: 18,
      border: "1px solid var(--border-soft)",
      background: "var(--bg-card)",
      padding: 18,
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
    label: {
      fontSize: 12,
      fontWeight: 900,
      marginBottom: 6,
      display: "block",
      color: "var(--text-muted)",
      letterSpacing: 0.2,
    } as const,
    btn: (primary?: boolean) =>
      ({
        borderRadius: 14,
        padding: "12px 14px",
        border: primary ? "1px solid rgba(45,212,191,0.35)" : "1px solid rgba(255,255,255,0.14)",
        background: primary ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.06)",
        color: "rgba(234,255,251,0.95)",
        fontWeight: 900,
        cursor: "pointer",
        userSelect: "none",
        opacity: sending ? 0.65 : 1,
        pointerEvents: sending ? "none" : "auto",
      }) as const,
  };

  if (doneId) {
    return (
      <main style={S.page}>
        <div style={S.card}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>—🏠</span> Formularz wysłany
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">… Dzić™kujć™!</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Otrzymaliśmy zgłoszenie. Odezwć™ się do Ciebie najszybciej jak to możliwe.
          </p>

          <div className="mt-4 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
              ID zgłoszenia
            </div>
            <div className="mt-1 text-lg font-black" style={{ color: "rgba(234,255,251,0.95)" }}>
              {doneId}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-10">
            <button
              style={S.btn()}
              onClick={() => {
                setForm(EMPTY);
                setDoneId(null);
                setErr("");
              }}
            >
              ž• Wyślij kolejne zgłoszenie
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <style>{`
        select, textarea { font-family: inherit; }
        select.ce-select {
          background: rgba(7, 13, 24, 0.72);
          color: rgba(234,255,251,0.95);
        }
        select.ce-select option { background: #fff; color: #0f172a; }
      `}</style>

      <div style={S.card}>
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
          style={{
            border: "1px solid rgba(45,212,191,0.25)",
            background: "rgba(45,212,191,0.08)",
            color: "rgba(234,255,251,0.92)",
          }}
        >
          <span style={{ color: "var(--accent)" }}>—🏠</span> Pozyski / Sprzedaż
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">🏠  Chcesz sprzedać‡ nieruchomość‡?</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Zostaw kontakt i kilka informacji — wrócć™ z wycenć… i planem sprzedaży.
        </p>

        {/* honeypot */}
        <input
          value={form.website}
          onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
          autoComplete="off"
          tabIndex={-1}
          style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
          aria-hidden="true"
        />

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label style={S.label}>imię™ i nazwisko *</label>
            <input style={S.input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jan Kowalski" />
          </div>

          <div>
            <label style={S.label}>Telefon (lub email) *</label>
            <input style={S.input} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="500 600 700" />
            <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Możesz zostawić‡ tylko telefon albo tylko email.
            </div>
          </div>

          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jan@email.pl" />
          </div>

          <div>
            <label style={S.label}>Rodzaj nieruchomości</label>
            <select
              className="ce-select"
              style={S.input}
              value={form.propertyType}
              onChange={(e) => setForm((p) => ({ ...p, propertyType: e.target.value as any }))}
            >
              <option value="mieszkanie">Mieszkanie</option>
              <option value="dom">Dom</option>
              <option value="dzialka">Działka</option>
              <option value="lokal">Lokal usługowy</option>
            </select>
          </div>

          <div>
            <label style={S.label}>Miasto *</label>
            <input style={S.input} value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="np. Warszawa" />
          </div>

          <div>
            <label style={S.label}>Dzielnica</label>
            <input style={S.input} value={form.district} onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))} placeholder="np. Mokotów" />
          </div>

          <div className="md:col-span-2">
            <label style={S.label}>Ulica</label>
            <input style={S.input} value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} placeholder="np. Puławska" />
          </div>

          <div>
            <label style={S.label}>Pokoje</label>
            <input style={S.input} value={form.rooms} onChange={(e) => setForm((p) => ({ ...p, rooms: e.target.value }))} placeholder="np. 3" inputMode="numeric" />
          </div>

          <div>
            <label style={S.label}>Metraż (m˛)</label>
            <input style={S.input} value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} placeholder="np. 58" inputMode="decimal" />
          </div>

          <div>
            <label style={S.label}>Oczekiwana cena (zł)</label>
            <input style={S.input} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="np. 850000" inputMode="numeric" />
          </div>

          <div>
            <label style={S.label}>Kiedy sprzedaż?</label>
            <select
              className="ce-select"
              style={S.input}
              value={form.timeframe}
              onChange={(e) => setForm((p) => ({ ...p, timeframe: e.target.value as any }))}
            >
              <option value="od_razu">Od razu</option>
              <option value="1_3_mies">1—3 miesić…ce</option>
              <option value="3_6_mies">3—6 miesięcy</option>
              <option value="6_plus">6+ miesięcy</option>
              <option value="nie_wiem">Nie wiem</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label style={S.label}>Dodatkowe informacje</label>
            <textarea
              style={{ ...S.input, minHeight: 110, resize: "vertical" as const }}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="np. pić™tro, stan, czy jest winda, termin wyprowadzki, itp."
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
          <label className="flex items-start gap-3" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
              style={{ marginTop: 3 }}
            />
            <div style={{ minWidth: 0 }}>
              <div className="text-sm font-extrabold" style={{ color: "rgba(234,255,251,0.95)" }}>
                Wyrażam zgodć™ na kontakt w sprawie sprzedaży nieruchomości *
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Zgoda potrzebna, żebym mógł oddzwonić‡/odpisać‡.
              </div>
            </div>
          </label>
        </div>

        {err ? (
          <div className="mt-4 text-sm" style={{ color: "rgba(255,220,220,0.95)" }}>
            š  {err}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-10">
          <button style={S.btn(true)} onClick={submit} disabled={!canSend || sending}>
            {sending ? "ł Wysyłam€¦" : "… Wyślij zgłoszenie"}
          </button>

          <button
            style={S.btn()}
            onClick={() => {
              setForm(EMPTY);
              setErr("");
            }}
            disabled={sending}
          >
            Wyczyść‡
          </button>
        </div>
      </div>
    </main>
  );
}
