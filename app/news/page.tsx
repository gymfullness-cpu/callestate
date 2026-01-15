"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Rates = {
  reference?: { value?: string; date?: string } | null;
  lombard?: { value?: string; date?: string } | null;
  deposit?: { value?: string; date?: string } | null;
};

type NewsItem = {
  id: string;
  category: "Kredyty" | "Rynek" | "Prawo";
  title: string;
  url: string;
  publishedAt: string | null;
  source: string | null;
  image: string | null;
  summary: string;
  whyItMatters: string;
};

type Top3 = {
  title: string;
  why: string;
  url: string;
  category: "Kredyty" | "Rynek" | "Prawo";
};

const CITY_PRESETS = [
  "Warszawa",
  "Kraków",
  "Wrocław",
  "Poznań",
  "Gdańsk",
  "Gdynia",
  "Sopot",
  "Łódź",
  "Katowice",
  "Szczecin",
  "Lublin",
  "Białystok",
] as const;

/** Cache TTL (ile minut trzymamy newsy, żeby start był natychmiastowy) */
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
const cacheKey = (city: string) => `news_feed_cache_v1:${(city || "").trim().toLowerCase()}`;

type CachedFeed = {
  cachedAt: number;
  city: string;
  items: NewsItem[];
  top3: Top3[];
  rates: Rates | null;
  generatedAt: string | null;
};

function safeReadCache(city: string): CachedFeed | null {
  try {
    const raw = localStorage.getItem(cacheKey(city));
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedFeed;
    if (!data || typeof data.cachedAt !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

function safeWriteCache(city: string, payload: Omit<CachedFeed, "cachedAt" | "city">) {
  try {
    const data: CachedFeed = {
      cachedAt: Date.now(),
      city: (city || "").trim(),
      items: payload.items || [],
      top3: payload.top3 || [],
      rates: payload.rates ?? null,
      generatedAt: payload.generatedAt ?? null,
    };
    localStorage.setItem(cacheKey(city), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function isFresh(cachedAt: number) {
  return Date.now() - cachedAt <= NEWS_CACHE_TTL_MS;
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [rates, setRates] = useState<Rates | null>(null);
  const [top3, setTop3] = useState<Top3[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"Wszystko" | "Kredyty" | "Rynek" | "Prawo">("Wszystko");

  const [city, setCity] = useState("");
  const [appliedCity, setAppliedCity] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // requestId/abort: ignorujemy spóźnione odpowiedzi i ucinamy stare requesty
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const didInitRef = useRef(false);

  // trzymamy ostatnie dane żeby nie migotało
  const itemsRef = useRef<NewsItem[]>([]);
  const top3Ref = useRef<Top3[]>([]);
  const ratesRef = useRef<Rates | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    top3Ref.current = top3;
  }, [top3]);
  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  /** 1) natychmiast ustaw stan z cache (jeśli jest) */
  const hydrateFromCache = useCallback((cityParam: string) => {
    const cached = safeReadCache(cityParam);
    if (!cached) return false;

    // nawet jeśli stary — nadal może przyspieszyć „pierwszą ramkę”
    setItems((prev) => (prev.length ? prev : cached.items || []));
    setTop3((prev) => (prev.length ? prev : cached.top3 || []));
    setRates((prev) => (prev ? prev : cached.rates ?? null));
    setGeneratedAt((prev) => prev ?? cached.generatedAt ?? null);

    // jeśli cache ma cokolwiek, od razu zdejmij loading
    if (cached.items?.length || cached.top3?.length || cached.rates) {
      setLoading(false);
    }

    return true;
  }, []);

  /** 2) fetch w tle / normalny */
  const fetchFeed = useCallback(
    async (cityParam: string, opts?: { force?: boolean }) => {
      const myReqId = ++reqIdRef.current;

      // anuluj poprzedni request
      try {
        abortRef.current?.abort();
      } catch {}
      abortRef.current = new AbortController();

      const hasData =
        (itemsRef.current?.length || 0) > 0 || (top3Ref.current?.length || 0) > 0 || !!ratesRef.current;

      if (!hasData) setLoading(true);
      else setRefreshing(true);

      setErr("");

      try {
        const c = cityParam.trim();
        const cached = safeReadCache(c);

        // jeśli cache świeży i nie wymuszamy — nie męcz API
        if (!opts?.force && cached && isFresh(cached.cachedAt)) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const qs = c ? `?city=${encodeURIComponent(c)}` : "";
        const res = await fetch(`/api/news-feed${qs}`, {
          cache: "no-store",
          signal: abortRef.current.signal,
        });

        const data = await res.json();

        if (myReqId !== reqIdRef.current) return;
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Błąd pobierania newsów");

        const nextItems = Array.isArray(data.items) ? (data.items as NewsItem[]) : null;
        const nextTop3 = Array.isArray(data.top3) ? (data.top3 as Top3[]) : null;

        // nie nadpisuj pustką
        const finalItems = nextItems && nextItems.length > 0 ? nextItems : itemsRef.current;
        const finalTop3 = nextTop3 && nextTop3.length > 0 ? nextTop3 : top3Ref.current;
        const finalRates = data.rates ? (data.rates as Rates) : ratesRef.current;
        const finalGeneratedAt = data.generatedAt ? (data.generatedAt as string) : generatedAt;

        setItems(finalItems);
        setTop3(finalTop3);
        setRates(finalRates);
        setGeneratedAt(finalGeneratedAt);

        // zapisz do cache
        safeWriteCache(c, {
          items: finalItems || [],
          top3: finalTop3 || [],
          rates: finalRates ?? null,
          generatedAt: finalGeneratedAt ?? null,
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (myReqId !== reqIdRef.current) return;
        setErr(e?.message || "Nieznany błąd");
      } finally {
        if (myReqId === reqIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [generatedAt]
  );

  useEffect(() => {
    // dev StrictMode odpala 2x — blokujemy
    if (didInitRef.current) return;
    didInitRef.current = true;

    // NATYCHMIAST: pokaż cache (jeśli jest)
    hydrateFromCache("");

    // W TLE: dociągnij świeże
    const run = () => fetchFeed("", { force: false });

    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: any) => void);
    if (typeof ric === "function") {
      ric(run, { timeout: 1200 });
    } else {
      setTimeout(run, 150);
    }

    return () => {
      try {
        abortRef.current?.abort();
      } catch {}
    };
  }, [fetchFeed, hydrateFromCache]);

  const filtered = useMemo(() => {
    if (tab === "Wszystko") return items;
    return items.filter((x) => x.category === tab);
  }, [items, tab]);

  const updatedLabel = useMemo(() => {
    if (!generatedAt) return "—";
    try {
      return new Date(generatedAt).toLocaleString("pl-PL");
    } catch {
      return "—";
    }
  }, [generatedAt]);

  const hasAnyRates = !!rates?.reference?.value || !!rates?.lombard?.value || !!rates?.deposit?.value;

  const ratesHeadline = useMemo(() => {
    const r = rates?.reference?.value;
    const d = rates?.reference?.date;
    if (r) return `Stopa referencyjna NBP: ${r}% ${d ? `(od ${d})` : ""}.`;
    return "Nie udało się pobrać stawek NBP (tymczasowo).";
  }, [rates]);

  const S = {
    pageTitle: {
      color: "var(--text-main)",
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: "-0.02em",
    } as const,
    muted: { color: "var(--text-muted)" } as const,
    card: {
      background: "var(--bg-card)",
      border: "1px solid var(--border-soft)",
      borderRadius: 18,
      padding: 16,
      minWidth: 0,
    } as const,
    pill: (on: boolean) =>
      ({
        padding: "10px 12px",
        borderRadius: 999,
        border: on ? "1px solid rgba(45,212,191,0.35)" : "1px solid var(--border-soft)",
        background: on ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.04)",
        color: on ? "rgba(234,255,251,0.95)" : "var(--text-main)",
        fontWeight: 900,
        fontSize: 13,
        cursor: "pointer",
        userSelect: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }) as const,
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid var(--border-soft)",
      background: "rgba(255,255,255,0.04)",
      color: "var(--text-main)",
      outline: "none",
      minWidth: 0,
    } as const,
    btn: {
      borderRadius: 14,
      padding: "12px 14px",
      border: "1px solid var(--border-soft)",
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-main)",
      fontWeight: 900,
      cursor: "pointer",
      userSelect: "none",
      whiteSpace: "nowrap" as const,
      minWidth: 0,
    } as const,
    feed: {
      marginTop: 14,
      borderRadius: 18,
      border: "1px solid var(--border-soft)",
      background: "rgba(255,255,255,0.03)",
      overflow: "hidden",
      minWidth: 0,
    } as const,
    feedInner: {
      maxHeight: "56vh",
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      WebkitOverflowScrolling: "touch" as any,
    } as const,
    badge: {
      borderRadius: 999,
      padding: "4px 10px",
      border: "1px solid rgba(45,212,191,0.22)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.92)",
      fontWeight: 900,
      fontSize: 12,
      whiteSpace: "nowrap",
    } as const,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8" style={{ color: "var(--text-main)", overflowX: "hidden" }}>
      <style>{`
        .ce-no-x { overflow-x: hidden; }
        .ce-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .ce-tabs::-webkit-scrollbar { display: none; }

        .ce-top3-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          min-width: 0;
        }
        @media (min-width: 900px) {
          .ce-top3-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .ce-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          min-width: 0;
        }
        @media (min-width: 1024px) {
          .ce-main-grid { grid-template-columns: 1fr 2fr; gap: 16px; }
        }

        .ce-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; min-width: 0; }
        .ce-break { overflow-wrap: anywhere; word-break: break-word; }
        .ce-news-title, .ce-news-summary, .ce-news-why, .ce-top3-title, .ce-top3-why {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between ce-no-x">
        <div style={{ minWidth: 0 }}>
          <h1 style={S.pageTitle} className="ce-break">
            Prasówka: nieruchomości (PL)
          </h1>
          <p className="mt-2 text-sm ce-break" style={S.muted}>
            Nagłówki z internetu + szybkie „co to znaczy dla agenta”. Linki + opis + przewijany feed.
          </p>
          <div className="mt-2 text-xs ce-break" style={S.muted}>
            Ostatnia aktualizacja: <b style={{ color: "rgba(234,255,251,0.95)" }}>{updatedLabel}</b>
            {appliedCity ? (
              <>
                {" "}
                • Miasto: <b style={{ color: "rgba(234,255,251,0.95)" }}>{appliedCity}</b>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap md:justify-end">
          <button
            style={S.btn}
            onClick={() => fetchFeed(appliedCity, { force: true })}
            disabled={loading || refreshing}
            title="Wymusza pobranie z API (nie używa świeżego cache)."
          >
            Odśwież teraz
          </button>

          <div
            className="rounded-full px-3 py-2 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.10)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            {loading ? "Ładuję…" : refreshing ? "Odświeżam…" : `Newsów: ${filtered.length}`}
          </div>
        </div>
      </div>

      <div className="mt-6" style={S.card}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div className="text-sm font-extrabold">Top 3 dnia w 20 sekund</div>
            <div className="mt-1 text-sm ce-break" style={S.muted}>
              Najważniejsze rzeczy do rozmów z klientami (AI wybiera i tłumaczy sens).
            </div>
          </div>

          <div className="ce-row" style={{ width: "100%" }}>
            <div className="w-full md:w-[280px]" style={{ minWidth: 0 }}>
              <input
                list="cityPresets"
                style={S.input}
                placeholder="Twoje miasto (np. Warszawa)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <datalist id="cityPresets">
                {CITY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <button
              style={{ ...S.btn, flex: "1 1 auto" }}
              onClick={() => {
                const c = city.trim();
                setAppliedCity(c);

                hydrateFromCache(c);
                fetchFeed(c, { force: false });
              }}
              disabled={loading || refreshing}
            >
              Zastosuj
            </button>

            {appliedCity ? (
              <button
                style={{ ...S.btn, flex: "1 1 auto" }}
                onClick={() => {
                  setCity("");
                  setAppliedCity("");

                  hydrateFromCache("");
                  fetchFeed("", { force: false });
                }}
                disabled={loading || refreshing}
              >
                Wyczyść
              </button>
            ) : null}
          </div>
        </div>

        {loading && top3.length === 0 ? (
          <div className="mt-4 text-sm" style={S.muted}>
            Układam Top 3…
          </div>
        ) : err && top3.length === 0 ? (
          <div className="mt-4 text-sm" style={{ color: "rgba(255,220,220,0.95)" }}>
            {err}
          </div>
        ) : top3.length === 0 ? (
          <div className="mt-4 text-sm" style={S.muted}>
            Brak danych do Top 3.
          </div>
        ) : (
          <>
            {refreshing ? (
              <div className="mt-4 text-xs font-extrabold" style={{ color: "rgba(234,255,251,0.92)" }}>
                Odświeżam w tle…
              </div>
            ) : null}

            <div className="mt-4 ce-top3-grid">
              {top3.slice(0, 3).map((t, idx) => (
                <a
                  key={`${t.category}-${t.url}-${idx}`}
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl p-4"
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    textDecoration: "none",
                    minWidth: 0,
                  }}
                >
                  <div style={S.badge}>
                    #{idx + 1} • {t.category}
                  </div>

                  <div className="mt-3 text-base font-extrabold ce-top3-title" style={{ color: "var(--text-main)", lineHeight: 1.25 }}>
                    {t.title}
                  </div>

                  <div className="mt-3 text-sm ce-top3-why" style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
                    {t.why}
                  </div>

                  <div className="mt-3 text-xs font-extrabold" style={{ color: "rgba(234,255,251,0.92)" }}>
                    Otwórz źródło →
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 ce-main-grid">
        <div style={S.card}>
          <div className="text-sm font-extrabold">Kredyty / stopy</div>
          <p className="mt-2 text-sm ce-break" style={S.muted}>
            Kontekst „co się dzieje z finansowaniem” (kluczowe w rozmowach z klientami).
          </p>

          <div
            className="mt-4 rounded-2xl p-4"
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              minWidth: 0,
            }}
          >
            <div className="text-sm font-black ce-break" style={{ color: "rgba(234,255,251,0.95)" }}>
              {ratesHeadline}
            </div>

            {hasAnyRates ? (
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm" style={{ color: "var(--text-main)" }}>
                <RateRow label="Referencyjna" v={rates?.reference?.value} d={rates?.reference?.date} />
                <RateRow label="Lombardowa" v={rates?.lombard?.value} d={rates?.lombard?.date} />
                <RateRow label="Depozytowa" v={rates?.deposit?.value} d={rates?.deposit?.date} />
              </div>
            ) : (
              <div className="mt-3 text-sm ce-break" style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
                Brak stawek do wyświetlenia. Kliknij <b>Odśwież teraz</b> albo spróbuj ponownie za chwilę.
              </div>
            )}
          </div>
        </div>

        <div style={S.card}>
          <div className="text-sm font-extrabold">Feed newsów (przewijany)</div>
          <p className="mt-2 text-sm ce-break" style={S.muted}>
            Klikasz nagłówek → otwiera źródło. W środku masz sens i „dlaczego ważne”.
          </p>

          <div className="mt-4 ce-tabs">
            {(["Wszystko", "Kredyty", "Rynek", "Prawo"] as const).map((t) => (
              <div key={t} style={S.pill(tab === t)} onClick={() => setTab(t)}>
                {t}
              </div>
            ))}
          </div>

          <div style={S.feed}>
            <div style={S.feedInner}>
              {loading && filtered.length === 0 ? (
                <div className="p-5 text-sm" style={S.muted}>
                  Pobieram nagłówki…
                </div>
              ) : err && filtered.length === 0 ? (
                <div className="p-5 text-sm" style={{ color: "rgba(255,220,220,0.95)" }}>
                  {err}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-5 text-sm" style={S.muted}>
                  Brak newsów w tej kategorii.
                </div>
              ) : (
                <>
                  {refreshing ? (
                    <div
                      className="px-5 py-3 text-xs font-extrabold"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(234,255,251,0.92)",
                        background: "rgba(45,212,191,0.06)",
                      }}
                    >
                      Odświeżam w tle… (lista nie znika)
                    </div>
                  ) : null}

                  {filtered.map((n, idx) => (
                    <NewsRow key={`${n.id}-${idx}`} n={n} showDivider={idx !== 0} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function RateRow({ label, v, d }: { label: string; v?: string; d?: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2"
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        minWidth: 0,
      }}
    >
      <div className="text-xs font-extrabold" style={{ color: "rgba(255,255,255,0.72)" }}>
        {label}
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          {v ? `${v}%` : "—"}
        </div>
        {d ? (
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.62)" }}>
            {d}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewsRow({ n, showDivider }: { n: NewsItem; showDivider: boolean }) {
  const time = n.publishedAt ? new Date(n.publishedAt).toLocaleString("pl-PL") : "—";

  return (
    <a
      href={n.url}
      target="_blank"
      rel="noreferrer"
      className="block p-5"
      style={{
        textDecoration: "none",
        borderTop: showDivider ? "1px solid rgba(255,255,255,0.08)" : "none",
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="flex flex-wrap items-center gap-2" style={{ minWidth: 0 }}>
          <span
            className="rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.22)",
              background: "rgba(45,212,191,0.10)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            {n.category}
          </span>

          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {n.source ? `${n.source} • ` : ""}
            {time}
          </span>
        </div>

        <div className="mt-2 text-base font-extrabold ce-news-title" style={{ color: "var(--text-main)", lineHeight: 1.25 }}>
          {n.title}
        </div>

        <div className="mt-2 text-sm ce-news-summary" style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
          {n.summary}
        </div>

        <div
          className="mt-3 rounded-xl px-3 py-2 text-sm font-semibold ce-news-why"
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(234,255,251,0.92)",
          }}
        >
          Dlaczego to ważne: <span style={{ color: "rgba(255,255,255,0.86)" }}>{n.whyItMatters}</span>
        </div>
      </div>
    </a>
  );
}
