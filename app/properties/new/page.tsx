"use client";

import { useEffect, useState } from "react";

/* ================= TYPES ================= */

type PropertyStatus = "Dostć™pna" | "Zarezerwowana" | "Sprzedana";
type KitchenType = "Osobna kuchnia" | "Salon z aneksem";
type ParkingType = "Garaż podziemny" | "Miejsce naziemne" | "Publiczne" | "Brak";

type Property = {
  id: number;

  title: string;
  status: PropertyStatus;

  city: string;
  district: string;
  street: string;

  price: number;
  area: number;
  rooms: number;
  bathrooms: number;

  kitchen: KitchenType;

  floor: number;
  floors: number;
  year: number;

  legalStatus: string;
  condition: string;

  elevator: boolean;
  balcony: boolean;
  basement: boolean;
  storage: boolean;

  parking: ParkingType;
  rent: number;

  sunExposure: string;
  description: string;

  images: string[];
};

/* ================= DEFAULT FORM ================= */

const emptyForm: Omit<Property, "id"> = {
  title: "",
  status: "Dostć™pna",

  city: "",
  district: "",
  street: "",

  price: 0,
  area: 0,
  rooms: 1,
  bathrooms: 1,

  kitchen: "Salon z aneksem",

  floor: 0,
  floors: 0,
  year: 0,

  legalStatus: "",
  condition: "",

  elevator: false,
  balcony: false,
  basement: false,
  storage: false,

  parking: "Brak",
  rent: 0,

  sunExposure: "",
  description: "",

  images: [],
};

/* ================= COMPONENT ================= */

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setProperties(JSON.parse(localStorage.getItem("properties") || "[]"));
  }, []);

  const save = () => {
    if (!form.title || !form.city || !form.price || !form.area) return;
    const updated = [...properties, { ...form, id: Date.now() }];
    setProperties(updated);
    localStorage.setItem("properties", JSON.stringify(updated));
    setForm(emptyForm);
  };

  const uploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      setForm({ ...form, images: [...form.images, reader.result as string] });
    reader.readAsDataURL(file);
  };

  const Section = ({ title }: { title: string }) => (
    <h2 style={{ marginTop: 40, marginBottom: 12, fontSize: 20 }}>
      {title}
    </h2>
  );

  const Field = ({ label, children }: any) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );

  const Checkbox = ({ label, value, onChange }: any) => (
    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <input type="checkbox" checked={value} onChange={onChange} />
      {label}
    </label>
  );

  return (
    <main style={{ padding: 40, maxWidth: 1200, fontFamily: "Inter, system-ui" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>🏠  Nieruchomości</h1>

      {/* ================= FORM ================= */}
      <div
        style={{
          marginTop: 30,
          padding: 32,
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <Section title="Podstawowe informacje" />

        <Field label="Tytuł ogłoszenia">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>

        <Field label="Status nieruchomości">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PropertyStatus })}>
            <option>Dostć™pna</option>
            <option>Zarezerwowana</option>
            <option>Sprzedana</option>
          </select>
        </Field>

        <Section title="Lokalizacja" />

        <Field label="Miasto">
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>

        <Field label="Dzielnica">
          <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        </Field>

        <Field label="Ulica">
          <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
        </Field>

        <Section title="Cena i metraż" />

        <Field label="Cena (zł)">
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
        </Field>

        <Field label="Powierzchnia (m˛)">
          <input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: +e.target.value })} />
        </Field>

        <Field label="Liczba pokoi">
          <input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: +e.target.value })} />
        </Field>

        <Field label="Rodzaj kuchni">
          <select value={form.kitchen} onChange={(e) => setForm({ ...form, kitchen: e.target.value as KitchenType })}>
            <option>Salon z aneksem</option>
            <option>Osobna kuchnia</option>
          </select>
        </Field>

        <Section title="Udogodnienia" />

        <Checkbox label="Winda" value={form.elevator} onChange={() => setForm({ ...form, elevator: !form.elevator })} />
        <Checkbox label="Balkon / taras" value={form.balcony} onChange={() => setForm({ ...form, balcony: !form.balcony })} />
        <Checkbox label="Piwnica" value={form.basement} onChange={() => setForm({ ...form, basement: !form.basement })} />
        <Checkbox label="Komórka lokatorska" value={form.storage} onChange={() => setForm({ ...form, storage: !form.storage })} />

        <Section title="Opis nieruchomości" />

        <textarea
          placeholder="Pełny opis nieruchomości — standard, lokalizacja, atuty"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Section title="Zdjć™cia" />
        <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadImage(e.target.files[0])} />

        <button
          onClick={save}
          style={{
            marginTop: 30,
            padding: "14px 24px",
            borderRadius: 14,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            fontSize: 16,
          }}
        >
          ’ľ Zapisz nieruchomość‡
        </button>
      </div>
    </main>
  );
}
