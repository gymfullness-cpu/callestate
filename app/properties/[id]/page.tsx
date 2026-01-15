"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import "leaflet/dist/leaflet.css";

import type { Property } from "../page";
import { generatePropertyPdf } from "@/app/lib/generatePropertyPdf";

type CalliProperty = {
  id: string;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export default function PropertyDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const idParam = (params as any)?.id as string | string[] | undefined;
  const safeId = useMemo(() => (Array.isArray(idParam) ? idParam[0] : idParam) ?? "", [idParam]);

  const [property, setProperty] = useState<Property | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // status do rubryki "Dodaj do listy dokumentów"
  const [docAdded, setDocAdded] = useState(false);

  const images = useMemo(() => {
    const arr = (property as any)?.images;
    return Array.isArray(arr) ? (arr.filter(Boolean) as string[]) : [];
  }, [property]);

  const safeActiveIndex = useMemo(() => {
    if (!images.length) return 0;
    return Math.min(Math.max(activeIndex, 0), images.length - 1);
  }, [activeIndex, images.length]);

  /** Bezpieczny parse localStorage */
  const safeParseArray = <T,>(raw: string | null): T[] => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  /** Nazwa + notatki do calli_properties_v1 */
  const buildCalliMeta = (p: any) => {
    const name =
      p?.title ||
      `${p?.city ?? ""} ${p?.street ?? ""} ${p?.apartmentNumber ? "Nr " + p.apartmentNumber : ""}`.trim() ||
      "Nieruchomość";

    const notes = [
      p?.district ? `Dzielnica: ${p.district}` : "",
      p?.area ? `Metraż: ${p.area} m²` : "",
      p?.price ? `Cena: ${p.price} zł` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    return { name, notes };
  };

  // Fetch property details from localStorage + synchronizacja do calli_properties_v1
  useEffect(() => {
    if (!safeId) return;

    const list = safeParseArray<Property>(localStorage.getItem("properties"));
    if (!list.length) return;

    // Synchronizacja: "properties" -> "calli_properties_v1" (dla checklist /documents/sale)
    try {
      const CALLI_KEY = "calli_properties_v1";
      const calliList = safeParseArray<CalliProperty>(localStorage.getItem(CALLI_KEY));

      const calliMap = new Map<string, CalliProperty>(calliList.map((p) => [String(p.id), p]));
      const now = Date.now();

      for (const p of list as any[]) {
        const pid = String(p?.id ?? "");
        if (!pid) continue;

        const { name, notes } = buildCalliMeta(p);
        const existing = calliMap.get(pid);

        if (existing) {
          calliMap.set(pid, { ...existing, id: pid, name, notes, updatedAt: now });
        } else {
          calliMap.set(pid, { id: pid, name, notes, createdAt: now, updatedAt: now });
        }
      }

      const merged = Array.from(calliMap.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      localStorage.setItem(CALLI_KEY, JSON.stringify(merged));

      try {
        window.dispatchEvent(new Event("calli-properties-changed"));
      } catch {
        // ignore
      }
    } catch {
      // ignorujemy, nie blokujemy strony
    }

    const found = (list as any[]).find((p) => String(p?.id) === String(safeId)) ?? null;
    setProperty(found);

    // reset indeksu zdjęć po wejściu na inną nieruchomość
    setActiveIndex(0);
    setPreviewOpen(false);
  }, [safeId]);

  // AUTOPDF: /properties/[id]?autopdf=1
  useEffect(() => {
    if (!property) return;
    const auto = searchParams?.get("autopdf");
    if (auto !== "1") return;

    let cancelled = false;
    (async () => {
      try {
        await generatePropertyPdf(property);
      } catch {
        // ignore
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [property, searchParams]);

  // ręczne dodanie bieżącej nieruchomości do listy dokumentów
  const addToDocumentsList = () => {
    if (!property) return;

    try {
      const CALLI_KEY = "calli_properties_v1";
      const list = safeParseArray<CalliProperty>(localStorage.getItem(CALLI_KEY));

      const pid = String((property as any)?.id ?? "");
      if (!pid) return;

      const now = Date.now();
      const { name, notes } = buildCalliMeta(property as any);

      const idx = list.findIndex((p) => String(p?.id) === pid);

      if (idx >= 0) list[idx] = { ...list[idx], name, notes, updatedAt: now };
      else list.unshift({ id: pid, name, notes, createdAt: now, updatedAt: now });

      localStorage.setItem(CALLI_KEY, JSON.stringify(list));

      try {
        window.dispatchEvent(new Event("calli-properties-changed"));
      } catch {
        // ignore
      }

      setDocAdded(true);
      window.setTimeout(() => setDocAdded(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSwipe = () => {
    if (!images.length) return;
    if (touchStartX === null || touchEndX === null) return;

    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    } else {
      setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleImageClick = (index: number) => {
    if (!images.length) return;
    setActiveIndex(index);
    setPreviewOpen(true);
  };

  const closePreview = () => setPreviewOpen(false);

  const goToNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!images.length) return;
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToPreviousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!images.length) return;
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // Leaflet map
  useEffect(() => {
    if (!property) return;
    if (typeof window === "undefined") return;

    let map: any = null;
    let cancelled = false;

    const loadMap = async () => {
      try {
        const mod = await import("leaflet");
        const L: any = (mod as any).default ?? mod;

        // marker icons
        try {
          delete (L.Icon.Default.prototype as any)._getIconUrl;
        } catch {}

        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const street = (property as any)?.street ?? "";
        const city = (property as any)?.city ?? "";
        const query = `${street}, ${city}, Polska`.trim();

        if (!query || query === ", , Polska") return;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
          {
            headers: {
              "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
            },
          }
        );

        if (!res.ok) return;
        const data: any[] = await res.json().catch(() => []);
        if (!Array.isArray(data) || !data[0]) return;

        const lat = Number.parseFloat(String(data[0].lat));
        const lon = Number.parseFloat(String(data[0].lon));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        if (cancelled) return;

        map = L.map("property-map").setView([lat, lon], 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        }).addTo(map);

        L.marker([lat, lon]).addTo(map);

        window.setTimeout(() => {
          try {
            map?.invalidateSize();
          } catch {}
        }, 300);
      } catch {
        // ignore map failures
      }
    };

    loadMap();

    return () => {
      cancelled = true;
      try {
        map?.remove();
      } catch {}
    };
  }, [property]);

  if (!property) return <div className="p-10">Brak danych</div>;

  const title = (property as any)?.title || "Nieruchomość";
  const city = (property as any)?.city || "";
  const district = (property as any)?.district || "";
  const street = (property as any)?.street || "";
  const apartmentNumber = (property as any)?.apartmentNumber;
  const area = Number((property as any)?.area || 0);
  const price = Number((property as any)?.price || 0);

  const ppm2 = area > 0 && price > 0 ? Math.round(price / area) : null;

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Górna sekcja */}
      <div className="mb-6 flex flex-col md:flex-row items-start">
        {/* Miniatura zdjęcia */}
        <div className="relative w-full md:w-1/3 mb-6 md:mb-0">
          {images.length ? (
            <img
              src={images[safeActiveIndex]}
              className="w-full h-auto object-cover rounded-lg cursor-pointer"
              alt={title}
              onClick={() => handleImageClick(safeActiveIndex)}
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchMove={(e) => setTouchEndX(e.touches[0].clientX)}
              onTouchEnd={handleSwipe}
            />
          ) : (
            <div className="w-full rounded-lg bg-white/5 border border-white/10 p-8 text-gray-300">
              Brak zdjęć
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                onClick={goToPreviousImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
                aria-label="Poprzednie zdjęcie"
              >
                ‹
              </button>

              <button
                onClick={goToNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
                aria-label="Następne zdjęcie"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="w-full md:w-2/3">
          <h1 className="text-2xl md:text-3xl font-semibold text-white text-right">{title}</h1>

          <div className="flex space-x-8 mt-4 justify-end">
            <div className="flex flex-col items-end">
              <p className="text-lg text-gray-300">
                📍 {city}
                {district ? `, ${district}` : ""}
                {street ? `, ${street}` : ""}
                {apartmentNumber ? ` Nr ${apartmentNumber}` : ""}
              </p>

              <p className="text-lg text-gray-300">
                📐 {area ? `${area} m²` : "—"} {property.year ? ` | 🏗️ ${property.year}` : ""}
              </p>
            </div>
          </div>

          <div className="flex space-x-8 mt-4 justify-end flex-wrap">
            <div>
              <div className="text-sm text-gray-300 mb-1">Cena</div>
              <div className="text-3xl font-bold text-white">
                {price ? `${price.toLocaleString("pl-PL")} zł` : "—"}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-300 mb-1">Cena za m²</div>
              <div className="text-2xl font-semibold text-white">
                {ppm2 ? `${ppm2.toLocaleString("pl-PL")} zł` : "—"}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await generatePropertyPdf(property);
                }}
                className="rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold shadow hover:bg-blue-700 transition"
              >
                Pobierz PDF dla klienta
              </button>
            </div>
          </div>

          {/* Dodaj do listy dokumentów */}
          <div className="mt-5 flex justify-end">
            <div className="w-full md:w-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-5 py-4">
              <div className="font-semibold text-white mb-2">📄 Dodaj do listy dokumentów</div>
              <div className="text-sm text-gray-300 mb-3">
                Dzięki temu nieruchomość pojawi się w checklistach dokumentów (np. /documents/sale).
              </div>

              <div className="flex items-center gap-10 justify-end flex-wrap">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToDocumentsList();
                  }}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-black font-semibold shadow hover:bg-emerald-400 transition"
                >
                  ➕ Dodaj / Aktualizuj na liście
                </button>

                {docAdded && <span className="text-emerald-300 font-semibold">Dodano ✓</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Szczegóły + opis */}
      <div className="mt-12 bg-white text-gray-900 rounded-2xl shadow p-8 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-4 text-gray-900">📋 Szczegóły nieruchomości</h2>

          <ul className="space-y-3 text-sm text-gray-800">
            <li>📍 {city}{district ? `, ${district}` : ""}</li>
            <li>🛣️ Ulica: {street || "—"}</li>
            {apartmentNumber ? <li>🏷️ Numer mieszkania: {apartmentNumber}</li> : null}
            <li>📐 Metraż: {area ? `${area} m²` : "—"}</li>
            {"rooms" in property ? <li>🛏️ Pokoje: {(property as any).rooms ?? "—"}</li> : null}
            {"bathrooms" in property ? <li>🛁 Łazienki: {(property as any).bathrooms ?? "—"}</li> : null}
            {"floor" in property ? <li>🏢 Piętro: {(property as any).floor ?? "—"}</li> : null}
            {property.year ? <li>🏗️ Rok budowy: {property.year}</li> : null}
            <li>💰 Cena: {price ? `${price.toLocaleString("pl-PL")} zł` : "—"}</li>
            {"rent" in property && Number((property as any).rent) > 0 ? (
              <li>🧾 Czynsz: {Number((property as any).rent).toLocaleString("pl-PL")} zł</li>
            ) : null}
            {"parking" in property ? <li>🚗 Parking: {(property as any).parking ?? "—"}</li> : null}
            {(property as any).winda ? <li>🛗 Winda</li> : null}
            {(property as any).balkon ? <li>🌤️ Balkon</li> : null}
            {(property as any).loggia ? <li>🏡 Loggia</li> : null}
            {(property as any).piwnica ? <li>📦 Piwnica</li> : null}
            {(property as any).komorka ? <li>📦 Komórka lokatorska</li> : null}
            {(property as any).ownership ? <li>⚖️ Stan prawny: {(property as any).ownership}</li> : null}
          </ul>
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-4 text-gray-900">📝 Opis nieruchomości</h2>

          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {(property as any).description || "Brak opisu."}
          </p>
        </div>
      </div>

      {/* Mapa */}
      <div className="mt-12 bg-white text-gray-900 rounded-2xl shadow p-8">
        <h2 className="text-xl font-semibold mb-4">📍 Lokalizacja</h2>
        <div id="property-map" className="w-full h-[360px] rounded-2xl overflow-hidden" />

        <a
          href={`https://www.google.com/maps/search/?q=${encodeURIComponent(`${street}, ${city}`)}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 mt-4 inline-block"
        >
          Otwórz w Google Maps
        </a>
      </div>

      {/* Preview */}
      {previewOpen && images.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={closePreview}>
          <div className="relative max-w-[90vw] max-h-[90vh] z-10" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[safeActiveIndex]}
              className="max-h-[90vh] max-w-[90vw] rounded-xl"
              alt={title}
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchMove={(e) => setTouchEndX(e.touches[0].clientX)}
              onTouchEnd={handleSwipe}
            />

            <button
              onClick={goToPreviousImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
              aria-label="Poprzednie zdjęcie"
            >
              ‹
            </button>

            <button
              onClick={goToNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
              aria-label="Następne zdjęcie"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
