"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================= Location suggestions (OSM Nominatim) ================= */

type LocationSuggestion = {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    road?: string;
  };
};

async function fetchLocationSuggestions(query: string, signal?: AbortSignal): Promise<LocationSuggestion[]> {
  if (query.trim().length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=pl&q=${encodeURIComponent(
      query
    )}`,
    { signal }
  );

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? (data as LocationSuggestion[]) : [];
}

/* ================= TYPES ================= */

type Status = "dostepna" | "zarezerwowana" | "sprzedana";
type Parking = "brak" | "podziemny" | "naziemny" | "publiczny";
type Kitchen = "oddzielna" | "aneks";
type Heating = "miejskie" | "gazowe" | "elektryczne";

// trzymamy jako string, bo mogłeś mieć legacy wartości
type FinishState = string;

type Market = "pierwotny" | "wtorny";

/** typ nieruchomości */
type PropertyType = "mieszkanie" | "dom" | "dzialka" | "grunt" | "lokal_uslugowy";

export type Property = {
  id: number;
  title: string;
  status: Status;

  city: string;
  district: string;
  street: string;
  apartmentNumber: string;

  heating: Heating;
  finishState: FinishState;
  market: Market;

  propertyType: PropertyType;

  price: number;
  area: number;
  rooms: number;
  bathrooms: number;
  floor: number;
  totalFloors: number;
  year: number;
  rent: number;

  ownership: string;
  kitchen: Kitchen;

  winda: boolean;
  balkon: boolean;
  loggia: boolean;
  piwnica: boolean;
  komorka: boolean;

  parking: Parking;

  description: string;
  images: string[];
};

const EMPTY_FORM: Property = {
  id: 0,
  title: "",
  status: "dostepna",
  city: "",
  district: "",
  street: "",
  apartmentNumber: "",
  heating: "miejskie",
  finishState: "gotowe do wejścia",
  market: "wtorny",

  propertyType: "mieszkanie",

  price: 0,
  area: 0,
  rooms: 0,
  bathrooms: 1,
  floor: 0,
  totalFloors: 0,
  year: 0,
  rent: 0,

  ownership: "",
  kitchen: "aneks",

  winda: false,
  balkon: false,
  loggia: false,
  piwnica: false,
  komorka: false,

  parking: "brak",
  description: "",
  images: [],
};

const FINISH_OPTIONS: { value: string; label: string }[] = [
  { value: "gotowe do wejścia", label: "Gotowe do wejścia" },
  { value: "do wykończenia", label: "Do wykończenia" },
  { value: "do remontu", label: "Do remontu" },
  { value: "do odświeżenia", label: "Do odświeżenia" },
  { value: "po remoncie", label: "Po remoncie" },
  { value: "stan deweloperski", label: "Stan deweloperski" },
];

function statusLabel(s: Status) {
  if (s === "dostepna") return "Dostępna";
  if (s === "zarezerwowana") return "Zarezerwowana";
  return "Sprzedana";
}

function statusBadgeStyle(s: Status): React.CSSProperties {
  if (s === "dostepna")
    return {
      border: "1px solid rgba(45,212,191,0.55)",
      background: "rgba(45,212,191,0.14)",
      color: "rgba(234,255,251,0.95)",
    };
  if (s === "zarezerwowana")
    return {
      border: "1px solid rgba(245,158,11,0.45)",
      background: "rgba(245,158,11,0.12)",
      color: "rgba(255,236,200,0.95)",
    };
  return {
    border: "1px solid rgba(239,68,68,0.45)",
    background: "rgba(239,68,68,0.12)",
    color: "rgba(255,220,220,0.95)",
  };
}

function formatMoney(v: number) {
  if (!v) return "";
  return `${v.toLocaleString("pl-PL")} zł`;
}

function propertyTypeLabel(t: PropertyType) {
  if (t === "mieszkanie") return "Mieszkanie";
  if (t === "dom") return "Dom";
  if (t === "dzialka") return "Działka";
  if (t === "grunt") return "Grunt";
  return "Lokal usługowy";
}

/** naprawia najczęstsze legacy-krzaki z wcześniejszych zapisów */
function normalizeLegacyString(s: any): string {
  const x = String(s ?? "");
  return x
    .replaceAll("wt�rny", "wtorny")
    .replaceAll("wej[cia", "wejścia")
    .replaceAll("wykoDczenia", "wykończenia")
    .replaceAll("od[wie|enia", "odświeżenia")
    .replaceAll("zB", "zł");
}

function normalizeLoadedProperty(p: any): Property {
  const legacyMarket = normalizeLegacyString(p?.market);
  const market: Market = legacyMarket === "pierwotny" ? "pierwotny" : "wtorny";

  const finish = normalizeLegacyString(p?.finishState || "gotowe do wejścia");

  const propertyType: PropertyType = (p?.propertyType as PropertyType) || "mieszkanie";

  return {
    ...EMPTY_FORM,
    ...p,
    id: Number(p?.id ?? 0) || 0,

    title: String(p?.title ?? ""),
    city: String(p?.city ?? ""),
    district: String(p?.district ?? ""),
    street: String(p?.street ?? ""),
    apartmentNumber: String(p?.apartmentNumber ?? ""),

    status: (p?.status as Status) || "dostepna",
    heating: (p?.heating as Heating) || "miejskie",

    finishState: finish,
    market,
    propertyType,

    price: Number(p?.price ?? 0) || 0,
    area: Number(p?.area ?? 0) || 0,
    rooms: Number(p?.rooms ?? 0) || 0,
    bathrooms: Number(p?.bathrooms ?? 1) || 1,
    floor: Number(p?.floor ?? 0) || 0,
    totalFloors: Number(p?.totalFloors ?? 0) || 0,
    year: Number(p?.year ?? 0) || 0,
    rent: Number(p?.rent ?? 0) || 0,

    ownership: String(p?.ownership ?? ""),
    kitchen: (p?.kitchen as Kitchen) || "aneks",

    winda: Boolean(p?.winda ?? false),
    balkon: Boolean(p?.balkon ?? false),
    loggia: Boolean(p?.loggia ?? false),
    piwnica: Boolean(p?.piwnica ?? false),
    komorka: Boolean(p?.komorka ?? false),

    parking: (p?.parking as Parking) || "brak",

    description: String(p?.description ?? ""),
    images: Array.isArray(p?.images) ? p.images : [],
  };
}

/* ================= COMPONENT ================= */

export default function PropertiesPage() {
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [suggestFor, setSuggestFor] = useState<"city" | "district" | "street" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [list, setList] = useState<Property[]>([]);
  const [form, setForm] = useState<Property>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  // galeria mini w kafelku listy
  const [activeImage, setActiveImage] = useState<Record<number, number>>({});

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // filtry / wyszukiwanie
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_desc" | "price_asc" | "area_desc" | "area_asc">("newest");

  const onLocationInput = (value: string, field: "city" | "district" | "street") => {
    setSuggestFor(field);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const suggestions = await fetchLocationSuggestions(value, abortRef.current.signal);
        setLocationSuggestions(Array.isArray(suggestions) ? suggestions.slice(0, 6) : []);
      } catch {
        setLocationSuggestions([]);
      }
    }, 220);
  };

  const applySuggestion = (s: LocationSuggestion) => {
    const city = s.address.city || s.address.town || s.address.village || "";
    const district = s.address.suburb || "";
    const street = s.address.road || "";
    setForm((prev) => ({
      ...prev,
      city: city || prev.city,
      district: district || prev.district,
      street: street || prev.street,
    }));
    setLocationSuggestions([]);
    setSuggestFor(null);
  };

  /* ===== LOAD ===== */
  useEffect(() => {
    const saved = localStorage.getItem("properties");
    if (!saved) return;

    const parsed: any[] = JSON.parse(saved);
    const normalized: Property[] = Array.isArray(parsed) ? parsed.map(normalizeLoadedProperty) : [];

    setList(normalized);
  }, []);

  const persist = (data: Property[]) => {
    setList(data);
    localStorage.setItem("properties", JSON.stringify(data));

    // żeby inne moduły zobaczyły zmianę
    try {
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  /* ===== IMAGES ===== */
  const handleImages = async (files: FileList | null) => {
    if (!files) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...(Array.isArray((data as any)?.paths) ? (data as any).paths : [])],
    }));
  };

  const saveProperty = () => {
    if (!form.title || !form.price || !form.area) {
      alert("Uzupełnij minimum: tytuł, cena, metraż.");
      return;
    }

    if (editingId) {
      persist(list.map((p) => (p.id === editingId ? { ...form, id: editingId } : p)));
    } else {
      persist([...list, { ...form, id: Date.now() }]);
    }

    setForm({ ...EMPTY_FORM, id: 0 });
    setEditingId(null);
  };

  const editProperty = (p: Property) => {
    setForm(normalizeLoadedProperty(p));
    setEditingId(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProperty = (id: number) => {
    if (!confirm("Usunąć nieruchomość?")) return;
    persist(list.filter((p) => p.id !== id));
  };

  const stats = useMemo(() => {
    const all = list.length;
    const available = list.filter((p) => p.status === "dostepna").length;
    const reserved = list.filter((p) => p.status === "zarezerwowana").length;
    const sold = list.filter((p) => p.status === "sprzedana").length;
    return { all, available, reserved, sold };
  }, [list]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let data = [...list];

    if (statusFilter !== "all") data = data.filter((p) => p.status === statusFilter);

    if (needle) {
      data = data.filter((p) => {
        const hay = [
          p.title,
          p.city,
          p.district,
          p.street,
          p.description,
          p.ownership,
          p.market,
          p.finishState,
          propertyTypeLabel(p.propertyType),
        ]
          .filter(Boolean)
          .join(" · ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    const sortNum = (a: number, b: number) => (a === b ? 0 : a > b ? -1 : 1);
    if (sortBy === "newest") data.sort((a, b) => b.id - a.id);
    if (sortBy === "price_desc") data.sort((a, b) => sortNum(a.price, b.price));
    if (sortBy === "price_asc") data.sort((a, b) => -sortNum(a.price, b.price));
    if (sortBy === "area_desc") data.sort((a, b) => sortNum(a.area, b.area));
    if (sortBy === "area_asc") data.sort((a, b) => -sortNum(a.area, b.area));

    return data;
  }, [list, q, statusFilter, sortBy]);

  /* ================= UI ================= */
  return (
    <div className="mx-auto max-w-7xl py-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between px-4 sm:px-6">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>🏠</span> Moduł: Nieruchomości
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            Nieruchomości
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Dodawaj oferty, zdjęcia, parametry i szybko filtruj. Wszystko zapisuje się lokalnie.
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Dostępne" value={stats.available} tone="mint" />
          <Kpi label="Zarezerw." value={stats.reserved} tone="amber" />
          <Kpi label="Sprzedane" value={stats.sold} tone="red" />
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        className="mt-6 rounded-2xl p-4 mx-4 sm:mx-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="label">Szukaj</label>
              <input
                className="input"
                placeholder="np. Mokotów, 3 pokoje, po remoncie..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="min-w-[220px]">
              <label className="label">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">Wszystkie</option>
                <option value="dostepna">Dostępna</option>
                <option value="zarezerwowana">Zarezerwowana</option>
                <option value="sprzedana">Sprzedana</option>
              </select>
            </div>

            <div className="min-w-[220px]">
              <label className="label">Sortowanie</label>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="newest">Najnowsze</option>
                <option value="price_desc">Cena ↓</option>
                <option value="price_asc">Cena ↑</option>
                <option value="area_desc">Metraż ↓</option>
                <option value="area_asc">Metraż ↑</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 md:justify-end">
            <button
              className="rounded-xl px-4 py-2 text-sm font-extrabold"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-main)",
              }}
              onClick={() => {
                setQ("");
                setStatusFilter("all");
                setSortBy("newest");
              }}
            >
              Wyczyść
            </button>

            <button className="btn-primary" onClick={saveProperty}>
              {editingId ? "Zapisz zmiany" : "Dodaj ofertę"}
            </button>
          </div>
        </div>
      </div>

      {/* FORM */}
      <section
        className="mt-6 rounded-2xl p-6 md:p-7 mx-4 sm:mx-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
              {editingId ? "Edytuj nieruchomość" : "Dodaj nieruchomość"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Minimum: tytuł, cena, metraż. Reszta opcjonalna.
            </p>
          </div>

          {editingId ? (
            <button
              className="rounded-xl px-4 py-2 text-sm font-extrabold"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.30)",
                color: "rgba(255,220,220,0.95)",
              }}
              onClick={() => {
                setForm({ ...EMPTY_FORM, id: 0 });
                setEditingId(null);
              }}
            >
              Anuluj edycję
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Tytuł oferty</label>
            <input
              className="input"
              placeholder="np. 3 pokoje, Mokotów"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
              <option value="dostepna">Dostępna</option>
              <option value="zarezerwowana">Zarezerwowana</option>
              <option value="sprzedana">Sprzedana</option>
            </select>
          </div>

          <div>
            <label className="label">Rodzaj nieruchomości</label>
            <select
              className="input"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyType })}
            >
              <option value="mieszkanie">Mieszkanie</option>
              <option value="dom">Dom</option>
              <option value="dzialka">Działka</option>
              <option value="grunt">Grunt</option>
              <option value="lokal_uslugowy">Lokal usługowy</option>
            </select>
          </div>

          {/* lokalizacja */}
          <div className="relative">
            <label className="label">Miasto</label>
            <input
              className="input"
              placeholder="Miasto"
              value={form.city}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, city: v });
                onLocationInput(v, "city");
              }}
              onFocus={() => setSuggestFor("city")}
            />
            {suggestFor === "city" && locationSuggestions.length > 0 ? (
              <SuggestList suggestions={locationSuggestions} onPick={applySuggestion} />
            ) : null}
          </div>

          <div className="relative">
            <label className="label">Dzielnica</label>
            <input
              className="input"
              placeholder="Dzielnica"
              value={form.district}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, district: v });
                onLocationInput(v, "district");
              }}
              onFocus={() => setSuggestFor("district")}
            />
            {suggestFor === "district" && locationSuggestions.length > 0 ? (
              <SuggestList suggestions={locationSuggestions} onPick={applySuggestion} />
            ) : null}
          </div>

          <div className="relative">
            <label className="label">Ulica</label>
            <input
              className="input"
              placeholder="Ulica"
              value={form.street}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, street: v });
                onLocationInput(v, "street");
              }}
              onFocus={() => setSuggestFor("street")}
            />
            {suggestFor === "street" && locationSuggestions.length > 0 ? (
              <SuggestList suggestions={locationSuggestions} onPick={applySuggestion} />
            ) : null}
          </div>

          <div>
            <label className="label">Numer mieszkania</label>
            <input
              className="input"
              value={form.apartmentNumber}
              onChange={(e) => setForm({ ...form, apartmentNumber: e.target.value })}
            />
          </div>

          {/* parametry */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="label">Cena (zł)</label>
                <input className="input" type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Metraż (m²)</label>
                <input className="input" type="number" value={form.area || ""} onChange={(e) => setForm({ ...form, area: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Pokoje</label>
                <input className="input" type="number" value={form.rooms || ""} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Łazienki</label>
                <input className="input" type="number" value={form.bathrooms || ""} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Ogrzewanie</label>
            <select className="input" value={form.heating} onChange={(e) => setForm({ ...form, heating: e.target.value as Heating })}>
              <option value="miejskie">Miejskie</option>
              <option value="gazowe">Gazowe</option>
              <option value="elektryczne">Elektryczne</option>
            </select>
          </div>

          <div>
            <label className="label">Stan wykończenia</label>
            <select className="input" value={form.finishState} onChange={(e) => setForm({ ...form, finishState: e.target.value })}>
              {FINISH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Rynek</label>
            <select className="input" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value as Market })}>
              <option value="pierwotny">Pierwotny</option>
              <option value="wtorny">Wtórny</option>
            </select>
          </div>

          <div>
            <label className="label">Stan prawny</label>
            <select className="input" value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value })}>
              <option value="">— wybierz —</option>
              <option value="pełna własność">Pełna własność</option>
              <option value="spółdzielcze własnościowe">Spółdzielcze własnościowe</option>
              <option value="spółdzielcze własnościowe z KW">Spółdzielcze własnościowe z KW</option>
              <option value="z możliwością założenia KW">Z możliwością założenia KW</option>
              <option value="udziały">Udziały</option>
            </select>
          </div>

          <div>
            <label className="label">Kuchnia</label>
            <select className="input" value={form.kitchen} onChange={(e) => setForm({ ...form, kitchen: e.target.value as Kitchen })}>
              <option value="aneks">Aneks kuchenny</option>
              <option value="oddzielna">Oddzielna kuchnia</option>
            </select>
          </div>

          <div>
            <label className="label">Parking</label>
            <select className="input" value={form.parking} onChange={(e) => setForm({ ...form, parking: e.target.value as Parking })}>
              <option value="brak">Brak</option>
              <option value="podziemny">Podziemny</option>
              <option value="naziemny">Naziemny</option>
              <option value="publiczny">Publiczny</option>
            </select>
          </div>
        </div>

        {/* checkboxes */}
        <div className="mt-5 flex flex-wrap gap-4">
          {[
            ["winda", "Winda"],
            ["balkon", "Balkon"],
            ["loggia", "Loggia"],
            ["piwnica", "Piwnica"],
            ["komorka", "Komórka lok."],
          ].map(([k, label]) => (
            <label
              key={k}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold"
              style={{
                border: "1px solid var(--border-soft)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-main)",
              }}
            >
              <input
                type="checkbox"
                checked={(form as any)[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.checked } as any)}
              />
              {label}
            </label>
          ))}
        </div>

        {/* opis */}
        <div className="mt-5">
          <label className="label">Opis</label>
          <textarea
            className="input h-28 resize-y"
            placeholder="Opis nieruchomości"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* upload */}
        <div className="mt-5">
          <label className="label">Zdjęcia</label>
          <div
            className="rounded-2xl p-4"
            style={{
              border: "1px dashed rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <input type="file" multiple accept="image/*" onChange={(e) => handleImages(e.target.files)} />

            {form.images.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {form.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Zdjęcie ${i + 1}`}
                    onClick={() => {
                      setPreviewImages(form.images);
                      setPreviewIndex(i);
                      setPreviewImage(img);
                    }}
                    className="h-24 w-24 rounded-xl object-cover cursor-pointer hover:opacity-80"
                    style={{ border: "1px solid var(--border-soft)" }}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                Dodaj zdjęcia, żeby wygodnie przeglądać oferty w kafelkach.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* LIST */}
      <section className="mt-6 mx-4 sm:mx-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
              Lista ofert
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Wyniki: <span style={{ color: "rgba(234,255,251,0.95)" }}>{filtered.length}</span>
              {filtered.length !== list.length ? ` / ${list.length}` : ""}
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-4 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Brak wyników. Zmień filtry lub dodaj nową nieruchomość.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl cursor-pointer"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-soft)",
                }}
                onClick={() => (window.location.href = `/properties/${p.id}`)}
              >
                {/* image */}
                {p.images.length > 0 ? (
                  <div className="relative h-48">
                    <img
                      src={p.images[activeImage[p.id] ?? 0]}
                      alt={p.title || "Zdjęcie nieruchomości"}
                      className="h-48 w-full object-cover"
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = activeImage[p.id] ?? 0;
                        setPreviewImages(p.images);
                        setPreviewIndex(idx);
                        setPreviewImage(p.images[idx]);
                      }}
                    />

                    {/* arrows */}
                    {p.images.length > 1 ? (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-sm font-black"
                          style={{
                            background: "rgba(0,0,0,0.55)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.20)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImage((prev) => ({
                              ...prev,
                              [p.id]: ((prev[p.id] ?? 0) - 1 + p.images.length) % p.images.length,
                            }));
                          }}
                          aria-label="Poprzednie zdjęcie"
                        >
                          ‹
                        </button>

                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-sm font-black"
                          style={{
                            background: "rgba(0,0,0,0.55)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.20)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImage((prev) => ({
                              ...prev,
                              [p.id]: ((prev[p.id] ?? 0) + 1) % p.images.length,
                            }));
                          }}
                          aria-label="Następne zdjęcie"
                        >
                          ›
                        </button>
                      </>
                    ) : null}

                    {/* status badge */}
                    <div
                      className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold"
                      style={statusBadgeStyle(p.status)}
                    >
                      {statusLabel(p.status)}
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex h-48 items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(600px 220px at 30% 0%, rgba(45,212,191,0.12), transparent 60%), rgba(255,255,255,0.03)",
                      borderBottom: "1px solid var(--border-soft)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Brak zdjęć
                  </div>
                )}

                {/* content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="text-lg font-extrabold leading-snug" style={{ color: "var(--text-main)" }}>
                        {p.title || ""}
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                        {p.city || ""}
                        {p.district ? `, ${p.district}` : ""}
                        {p.street ? ` · ${p.street}` : ""}
                      </p>

                      <p className="mt-1 text-xs font-extrabold" style={{ color: "rgba(234,255,251,0.90)" }}>
                        {propertyTypeLabel(p.propertyType)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black" style={{ color: "rgba(234,255,251,0.95)" }}>
                        {formatMoney(p.price)}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {p.area ? `${p.area} m²` : ""} {p.rooms ? `· ${p.rooms} pok.` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm" style={{ color: "var(--text-main)" }}>
                    <InfoPill label="Metraż" value={p.area ? `${p.area} m²` : "—"} />
                    <InfoPill label="Pokoje" value={p.rooms ? `${p.rooms}` : "—"} />
                    <InfoPill label="Piętro" value={`${p.floor ?? "—"}`} />
                    <InfoPill label="Czynsz" value={p.rent ? `${p.rent.toLocaleString("pl-PL")} zł` : "—"} />
                  </div>

                  {p.description ? (
                    <p className="mt-4 text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
                      {p.description}
                    </p>
                  ) : null}

                  {/* actions */}
                  <div className="mt-5 flex gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => editProperty(p)}
                      className="flex-1 rounded-xl py-2 text-sm font-extrabold"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border-soft)",
                        color: "var(--text-main)",
                      }}
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => deleteProperty(p.id)}
                      className="flex-1 rounded-xl py-2 text-sm font-extrabold"
                      style={{
                        background: "rgba(239,68,68,0.10)",
                        border: "1px solid rgba(239,68,68,0.28)",
                        color: "rgba(255,220,220,0.95)",
                      }}
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LIGHTBOX */}
      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.78)" }}
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImages[previewIndex]}
              alt="Podgląd zdjęcia"
              className="max-h-[88vh] max-w-[92vw] rounded-2xl shadow-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.14)" }}
            />

            {previewImages.length > 1 ? (
              <>
                <button
                  onClick={() => setPreviewIndex((previewIndex - 1 + previewImages.length) % previewImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xl font-black"
                  style={{
                    background: "rgba(0,0,0,0.60)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.20)",
                  }}
                  aria-label="Poprzednie"
                >
                  ‹
                </button>
                <button
                  onClick={() => setPreviewIndex((previewIndex + 1) % previewImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xl font-black"
                  style={{
                    background: "rgba(0,0,0,0.60)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.20)",
                  }}
                  aria-label="Następne"
                >
                  ›
                </button>
              </>
            ) : null}

            <button
              className="absolute right-3 top-3 rounded-xl px-3 py-2 text-sm font-extrabold"
              style={{
                background: "rgba(0,0,0,0.60)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.20)",
              }}
              onClick={() => setPreviewImage(null)}
            >
              Zamknij
            </button>
          </div>
        </div>
      ) : null}

      {/* minimalny CSS dla input/label */}
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
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        select.input {
          background-color: rgba(7, 13, 24, 0.85);
          color: rgba(234, 255, 251, 0.95);
          cursor: pointer;
        }

        select.input option {
          background: rgb(7, 13, 24);
          color: rgba(234, 255, 251, 0.95);
          font-weight: 700;
        }

        .input:focus {
          border-color: rgba(45, 212, 191, 0.55);
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
          background: rgba(255, 255, 255, 0.06);
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
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 900;
          border: 1px solid rgba(45, 212, 191, 0.35);
          background: rgba(45, 212, 191, 0.12);
          color: rgba(234, 255, 251, 0.95);
          cursor: pointer;
          user-select: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px rgba(45, 212, 191, 0.18);
        }
      `}</style>
    </div>
  );
}

/* ====== small UI helpers ====== */

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "mint" | "amber" | "red";
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
    amber: {
      border: "1px solid rgba(245,158,11,0.28)",
      background: "rgba(245,158,11,0.10)",
      color: "rgba(255,236,200,0.95)",
    },
    red: {
      border: "1px solid rgba(239,68,68,0.26)",
      background: "rgba(239,68,68,0.10)",
      color: "rgba(255,220,220,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div className="text-[11px] font-extrabold" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="mt-0.5 text-sm font-black" style={{ color: "var(--text-main)" }}>
        {value}
      </div>
    </div>
  );
}

function SuggestList({
  suggestions,
  onPick,
}: {
  suggestions: LocationSuggestion[];
  onPick: (s: LocationSuggestion) => void;
}) {
  return (
    <div
      className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl"
      style={{
        background: "rgba(7, 13, 24, 0.92)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      {suggestions.map((s, idx) => (
        <button
          key={idx}
          className="block w-full px-4 py-3 text-left text-sm"
          style={{
            color: "var(--text-main)",
            borderBottom: idx === suggestions.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={(e) => {
            e.preventDefault();
            onPick(s);
          }}
        >
          <div className="font-extrabold" style={{ color: "rgba(234,255,251,0.95)" }}>
            {s.address.city || s.address.town || s.address.village || ""}
            {s.address.suburb ? ` · ${s.address.suburb}` : ""}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {s.display_name}
          </div>
        </button>
      ))}
    </div>
  );
}
