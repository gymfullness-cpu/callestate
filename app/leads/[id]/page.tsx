"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Notes from "./Notes";
import CallButton from "./CallButton";
import StatusSwitcher from "./StatusSwitcher";

type LeadRole = "wBa[ciciel" | "kupuj&cy";
type LeadStatus = "Nowy" | "Oddzwoni!" | "Zamkni"ty";

function normalizeLeadStatus(s: unknown): LeadStatus {
  return s === "Nowy" || s === "Oddzwoni!" || s === "Zamkni"ty" ? s : "Nowy";
}

type Lead = {
  id: number;
  name: string;
  phone: string;
  status: LeadStatus;
  role?: LeadRole;
  propertyIds?: number[];
};

type Property = {
  id: number;
  street: string;
};

export default function LeadPage() {
  const params = useParams();
  const id = Number((params as any).id);

  const [lead, setLead] = useState<Lead | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  //  LEAD Z LOCALSTORAGE
  useEffect(() => {
    const saved = localStorage.getItem("leads");
    if (!saved) return;

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      setLead(null);
      return;
    }

    // normalizacja danych z localStorage
    const list: Lead[] = parsed
      .filter((x) => x && typeof x === "object")
      .map((x: any) => ({
        id: typeof x.id === "number" ? x.id : Number(x.id),
        name: typeof x.name === "string" ? x.name : "",
        phone: typeof x.phone === "string" ? x.phone : "",
        status: normalizeLeadStatus(x.status),
        role: x.role === "wBa[ciciel" || x.role === "kupuj&cy" ? x.role : undefined,
        propertyIds: Array.isArray(x.propertyIds)
          ? x.propertyIds
              .map((v: any) => (typeof v === "number" ? v : Number(v)))
              .filter((n: number) => Number.isFinite(n))
          : undefined,
      }))
      .filter((l) => Number.isFinite(l.id) && l.name.trim() && l.phone.trim());

    const found = list.find((l) => l.id === id) || null;
    setLead(found);
  }, [id]);

  //  NIERUCHOMO9aCI
  useEffect(() => {
    const saved = localStorage.getItem("properties");
    if (!saved) return;

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return;

    const list: Property[] = parsed
      .filter((x) => x && typeof x === "object")
      .map((x: any) => ({
        id: typeof x.id === "number" ? x.id : Number(x.id),
        street: typeof x.street === "string" ? x.street : "",
      }))
      .filter((p) => Number.isFinite(p.id) && p.street.trim());

    setProperties(list);
  }, []);

  if (!lead) {
    return <p style={{ padding: 40 }}>Nie znaleziono leada</p>;
  }

  const saveLead = (updated: Lead) => {
    // upewnij si, |e status zawsze jest poprawny
    const safeUpdated: Lead = { ...updated, status: normalizeLeadStatus(updated.status) };

    setLead(safeUpdated);

    const saved = localStorage.getItem("leads");
    if (!saved) return;

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return;

    // zapisujemy z zachowaniem reszty p�l w storage, ale status normalizujemy
    const newList = parsed.map((x: any) => {
      const xid = typeof x?.id === "number" ? x.id : Number(x?.id);
      if (xid === safeUpdated.id) return safeUpdated;
      return x;
    });

    localStorage.setItem("leads", JSON.stringify(newList));
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>{lead.name}</h1>

      <hr />

      <h3><� Powi&zane nieruchomo[ci</h3>

      {properties.length === 0 && <p>Brak nieruchomo[ci</p>}

      <ul>
        {properties.map((p) => {
          const assigned = lead.propertyIds?.includes(p.id) ?? false;

          return (
            <li key={p.id}>
              <label>
                <input
                  type="checkbox"
                  checked={assigned}
                  onChange={() => {
                    const updatedIds = assigned
                      ? lead.propertyIds?.filter((pid) => pid !== p.id)
                      : [...(lead.propertyIds ?? []), p.id];

                    saveLead({
                      ...lead,
                      propertyIds: updatedIds,
                    });
                  }}
                />
                {p.street}
              </label>
            </li>
          );
        })}
      </ul>

      <hr />

      <p>
        <strong>Rola leada:</strong>{" "}
        <select
          value={lead.role ?? ""}
          onChange={(e) =>
            saveLead({
              ...lead,
              role: e.target.value as LeadRole,
            })
          }
        >
          <option value=""> wybierz </option>
          <option value="wBa[ciciel"><� WBa[ciciel</option>
          <option value="kupuj&cy">�d Kupuj&cy</option>
        </select>
      </p>

      {/* & tu ju| zawsze idzie poprawny union */}
      <StatusSwitcher leadId={lead.id} initialStatus={lead.status} />

      <p>
        <strong>Telefon:</strong>{" "}
        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
      </p>

      <hr />

      <h3>& Spotkania</h3>

      {(() => {
        const saved = localStorage.getItem("meetings");
        if (!saved) return <p>Brak spotkaD</p>;

        let meetingsRaw: unknown;
        try {
          meetingsRaw = JSON.parse(saved);
        } catch {
          return <p>Brak spotkaD</p>;
        }

        if (!Array.isArray(meetingsRaw)) return <p>Brak spotkaD</p>;

        const meetings = meetingsRaw.filter((m: any) => m?.leadId === lead.id);

        if (meetings.length === 0) {
          return <p>Brak spotkaD</p>;
        }

        return (
          <ul>
            {meetings.map((m: any) => (
              <li key={m.id}>
                {m.date} {m.time} {" "}
                {m.type === "pozyskowe" ? "d�<� Pozyskowe" : "<� Prezentacja"}
              </li>
            ))}
          </ul>
        );
      })()}

      <CallButton phone={lead.phone} />
      <Notes leadId={lead.id} />
    </main>
  );
}