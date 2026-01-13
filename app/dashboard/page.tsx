?"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>�9</span> Centrum dowodzenia
          </div>

          <h1
            className="mt-3 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            =� 9� Dashboard
          </h1>

          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Szybki dost��p do modu� a�Bw. Wszystko w jednym miejscu.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Tile title="=� & Kalendarz" desc="Spotkania, przypomnienia, follow-up." href="/calendar" />
        <Tile title="��: Pozyski" desc="Pozyskiwanie ofert i w� aa� _cicieli." href="/prospects" />
        <Tile title="9� Nieruchomo� _ci" desc="Baza ofert, zdj��cia, parametry." href="/properties" />
        <Tile title="�� AI: Analiza" desc="AI: analiza i porz&dek zdj�� �." href="/analyzed" />
        <Tile title="�� AI: Wycena" desc="Szybka wycena nieruchomo� _ci." href="/valuation" />
        <Tile title="=� 9> Leady" desc="Leady, statusy, kontakty." href="/leads" />
      </div>
    </main>
  );
}

function Tile({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="surface-light group p-6 transition-transform"
      style={{ textDecoration: "none" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold leading-snug">{title}</h3>
          <p className="mt-2 text-sm muted">{desc}</p>
        </div>

        <div
          className="rounded-full px-3 py-1 text-xs font-extrabold"
          style={{
            border: "1px solid rgba(45,212,191,0.35)",
            background: "rgba(45,212,191,0.12)",
            color: "rgba(234,255,251,0.95)",
          }}
        >
          Otw�rz  �
        </div>
      </div>

      <div className="mt-5 h-px w-full" style={{ background: "rgba(255,255,255,0.10)" }} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag>CRM</Tag>
        <Tag>Workflow</Tag>
        <Tag>Premium</Tag>
      </div>

      <style jsx>{`
        a.surface-light {
          transform: translateY(0);
        }
        a.surface-light:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.42);
          border-color: rgba(45, 212, 191, 0.35);
        }
      `}</style>
    </Link>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(238, 242, 255, 0.78)",
      }}
    >
      {children}
    </span>
  );
}