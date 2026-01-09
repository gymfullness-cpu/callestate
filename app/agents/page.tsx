"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Agent = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  rank?: string | null;
  role: string;
};

const ROLE_OPTIONS = ["OWNER", "ADMIN", "MANAGER", "AGENT", "ASSISTANT", "VIEWER"];

function roleTone(role: string): "mint" | "blue" | "amber" | "neutral" {
  if (role === "OWNER") return "mint";
  if (role === "ADMIN") return "blue";
  if (role === "MANAGER") return "amber";
  return "neutral";
}

function RoleBadge({ role }: { role: string }) {
  const tone = roleTone(role);

  const styleByTone: Record<string, React.CSSProperties> = {
    mint: {
      border: "1px solid rgba(45,212,191,0.35)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.95)",
    },
    blue: {
      border: "1px solid rgba(29,78,216,0.30)",
      background: "rgba(29,78,216,0.10)",
      color: "rgba(224,232,255,0.95)",
    },
    amber: {
      border: "1px solid rgba(245,158,11,0.28)",
      background: "rgba(245,158,11,0.10)",
      color: "rgba(255,236,200,0.95)",
    },
    neutral: {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-main)",
    },
  };

  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold" style={styleByTone[tone]}>
      {role}
    </span>
  );
}

export default function AgentsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [rank, setRank] = useState("");
  const [role, setRole] = useState("AGENT");

  // ✅ localStorage czytamy dopiero po mount (bez hydration mismatch)
  useEffect(() => {
    async function initOrg() {
      setHydrated(true);

      const existing = window.localStorage.getItem("orgId");
      if (existing) {
        setOrgId(existing);
        return;
      }

      const res = await fetch("/api/org/current");
      const data = await res.json();

      if (data?.org?.id) {
        window.localStorage.setItem("orgId", data.org.id);
        setOrgId(data.org.id);
      }
    }

    initOrg();
  }, []);

  async function refresh(currentOrgId: string) {
    setLoading(true);
    const res = await fetch(`/api/org/members?orgId=${currentOrgId}`);
    const data = await res.json();
    setAgents(data.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function addAgent() {
    if (!orgId) return alert("Brak orgId w localStorage");
    if (!email.trim()) return alert("Podaj email");
    if (!fullName.trim()) return alert("Podaj imię i nazwisko");

    const res = await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        email: email.trim(),
        name: fullName.trim(),
        phone: phone.trim() || null,
        rank: rank.trim() || null,
        role,
      }),
    });

    // ✅ odporne na brak JSON
    let data: any = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      alert(data?.error ?? data?.detail ?? text ?? "Błąd");
      return;
    }

    setEmail("");
    setFullName("");
    setPhone("");
    setRank("");
    setRole("AGENT");

    await refresh(orgId);
  }

  const stats = useMemo(() => {
    const all = agents.length;
    const owners = agents.filter((a) => a.role === "OWNER").length;
    const admins = agents.filter((a) => a.role === "ADMIN").length;
    const managers = agents.filter((a) => a.role === "MANAGER").length;
    return { all, owners, admins, managers };
  }, [agents]);

  // ✅ podczas SSR i zanim useEffect odpali, render stabilny
  if (!hydrated) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
          🧑‍💼 Agenci
        </h1>
        <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          ⏳ Ładowanie...
        </div>
      </main>
    );
  }

  if (!orgId) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
          🧑‍💼 Agenci
        </h1>

        <div className="mt-4 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
          <div className="text-sm font-extrabold" style={{ color: "rgba(255,220,220,0.95)" }}>
            ❌ Brak orgId w localStorage.
          </div>

          <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
            Otwórz DevTools → Console i wklej:
          </div>

          <pre
            className="mt-3 overflow-auto rounded-xl p-4 text-xs"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(238,242,255,0.92)",
            }}
          >
{`localStorage.setItem("orgId","TU_WKLEJ_ORG_ID"); location.reload();`}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>●</span> Zespół / Uprawnienia
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            🧑‍💼 Agenci
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Dodawaj członków biura, przypisuj role i zarządzaj dostępem.
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Wszyscy" value={stats.all} tone="neutral" />
          <Kpi label="Owner" value={stats.owners} tone="mint" />
          <Kpi label="Admin" value={stats.admins} tone="blue" />
          <Kpi label="Manager" value={stats.managers} tone="amber" />
        </div>
      </div>

      {/* FORM */}
      <section
        className="mt-7 rounded-2xl p-6 md:p-7"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
              ➕ Dodaj agenta
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Minimalnie: email i imię/nazwisko.
            </p>
          </div>

          <button className="btn-primary" onClick={addAgent}>
            Dodaj
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@biuro.pl"
            />
          </div>

          <div>
            <label className="label">Imię i nazwisko</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jan Kowalski"
            />
          </div>

          <div>
            <label className="label">Telefon</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="500600700" />
          </div>

          <div>
            <label className="label">Ranga (np. Senior / Junior / Top)</label>
            <input className="input" value={rank} onChange={(e) => setRank(e.target.value)} placeholder="Senior" />
          </div>

          <div className="md:col-span-2">
            <label className="label">Rola (systemowa)</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
        `}</style>
      </section>

      {/* LIST */}
      <section className="mt-7">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
              Lista agentów
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {loading ? "Ładowanie…" : `Łącznie: ${agents.length}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              ⏳ Ładowanie agentów...
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="mt-4 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              Brak agentów w tym biurze. Dodaj pierwszego powyżej 👆
            </div>
          </div>
        ) : (
          <div className="mt-4 surface-light overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(15,23,42,0.04)" }}>
                  <Th>Imię i nazwisko</Th>
                  <Th>Email</Th>
                  <Th>Telefon</Th>
                  <Th>Ranga</Th>
                  <Th>Rola</Th>
                  <Th></Th>
                </tr>
              </thead>

              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-t" style={{ borderColor: "rgba(15,23,42,0.10)" }}>
                    <Td strong>{a.name ?? "-"}</Td>
                    <Td>{a.email}</Td>
                    <Td>{a.phone ?? "-"}</Td>
                    <Td>{a.rank ?? "-"}</Td>
                    <Td>
                      <RoleBadge role={a.role} />
                    </Td>
                    <Td alignRight>
                      <Link
                        href={`/agents/${a.id}`}
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          textDecoration: "none",
                          border: "1px solid rgba(45,212,191,0.35)",
                          background: "rgba(45,212,191,0.10)",
                          color: "#0f172a",
                        }}
                      >
                        Profil →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  tone: "neutral" | "mint" | "blue" | "amber";
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
    amber: {
      border: "1px solid rgba(245,158,11,0.28)",
      background: "rgba(245,158,11,0.10)",
      color: "rgba(255,236,200,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        fontSize: 12,
        letterSpacing: 0.2,
        fontWeight: 900,
        color: "var(--text-muted)",
        padding: "12px 12px",
        borderBottom: "1px solid var(--border-soft)",
        whiteSpace: "nowrap",
      }}
    >
      {children ?? null}
    </th>
  );
}


function Td({
  children,
  strong,
  alignRight,
}: {
  children: React.ReactNode;
  strong?: boolean;
  alignRight?: boolean;
}) {
  return (
    <td
      className={`px-5 py-3 ${alignRight ? "text-right" : ""}`}
      style={{ color: strong ? "#0f172a" : "rgba(15,23,42,0.80)", fontWeight: strong ? 900 : 600 }}
    >
      {children}
    </td>
  );
}
