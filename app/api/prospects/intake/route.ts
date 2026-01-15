import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { headers } from "next/headers";

export const runtime = "nodejs";

type Incoming = {
  name?: string;
  phone?: string;
  email?: string;

  city?: string;
  district?: string;
  street?: string;

  propertyType?: string;
  rooms?: string;
  area?: string;
  price?: string;

  timeframe?: string;
  notes?: string;

  consent?: boolean;

  website?: string; // honeypot
  startedAt?: number; // anty-bot: czas startu formularza (ms)
};

function dataDir() {
  return path.join(process.cwd(), "data");
}
function dataFilePath() {
  return path.join(dataDir(), "prospects-intake.json");
}
function rateFilePath() {
  return path.join(dataDir(), "prospects-rate.json");
}

function ensureDataDir() {
  const dir = dataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJsonArray(fp: string): any[] {
  if (!fs.existsSync(fp)) return [];
  try {
    const raw = fs.readFileSync(fp, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(fp: string, data: any) {
  ensureDataDir();
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf8");
}

function getClientIp() {
  const h = headers(); // <-- bez await
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr.trim();
  return "unknown";
}

function nowMs() {
  return Date.now();
}

/**
 * Anty-spam (prosty rate limit per IP):
 * - max 3 zgłoszenia / 10 minut
 * - max 10 zgłoszeń / 24h
 */
function checkRateLimit(ip: string) {
  const fp = rateFilePath();
  const entries = readJsonArray(fp);

  const t = nowMs();
  const TEN_MIN = 10 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;

  // zostaw tylko ostatnie 24h
  const cleaned = entries.filter((e) => typeof e?.ts === "number" && t - e.ts < DAY);

  const last10min = cleaned.filter((e) => e.ip === ip && t - e.ts < TEN_MIN).length;
  const last24h = cleaned.filter((e) => e.ip === ip).length;

  if (last10min >= 3) return { ok: false as const, error: "Za dużo zgłoszeń. Spróbuj ponownie za kilka minut." };
  if (last24h >= 10) return { ok: false as const, error: "Limit dzienny zgłoszeń został przekroczony." };

  // zapisz event
  cleaned.unshift({ ip, ts: t });
  writeJson(fp, cleaned);

  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Incoming;

    // honeypot
    if (body.website && String(body.website).trim().length > 0) {
      return NextResponse.json({ ok: true, id: `spam_${Date.now()}` });
    }

    // anty-bot: wysyłka w < 2 sekundy od wejścia
    const startedAt = Number(body.startedAt || 0);
    if (startedAt && nowMs() - startedAt < 2000) {
      return NextResponse.json(
        { ok: false, error: "Zgłoszenie wygląda na automatyczne. Spróbuj ponownie." },
        { status: 429 }
      );
    }

    // rate limit per IP
    const ip = getClientIp();
    const rl = checkRateLimit(ip);
    if (!rl.ok) return NextResponse.json({ ok: false, error: rl.error }, { status: 429 });

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const city = String(body.city || "").trim();

    if (!name) return NextResponse.json({ ok: false, error: "Brak imienia i nazwiska." }, { status: 400 });
    if (!phone && !email) return NextResponse.json({ ok: false, error: "Podaj telefon lub email." }, { status: 400 });
    if (!city) return NextResponse.json({ ok: false, error: "Podaj miasto." }, { status: 400 });
    if (body.consent !== true) return NextResponse.json({ ok: false, error: "Wymagana zgoda na kontakt." }, { status: 400 });

    const now = new Date().toISOString();
    const id = `p_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    const record = {
      id,
      createdAt: now,
      status: "new", // new | contacted | closed | spam
      source: "public_form",
      ip,

      name,
      phone: phone || null,
      email: email || null,

      city,
      district: String(body.district || "").trim() || null,
      street: String(body.street || "").trim() || null,

      propertyType: String(body.propertyType || "mieszkanie"),
      rooms: String(body.rooms || "").trim() || null,
      area: String(body.area || "").trim() || null,
      price: String(body.price || "").trim() || null,

      timeframe: String(body.timeframe || "nie_wiem"),
      notes: String(body.notes || "").trim() || null,

      consent: true,
      updatedAt: now,
    };

    const list = readJsonArray(dataFilePath());
    list.unshift(record);
    writeJson(dataFilePath(), list);

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Błąd serwera", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}

/**
 * PATCH: aktualizacja statusu (admin / aplikacja)
 * body: { id: string, status: "new"|"contacted"|"closed"|"spam" }
 */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim();

    if (!id) return NextResponse.json({ ok: false, error: "Brak id." }, { status: 400 });
    if (!["new", "contacted", "closed", "spam"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowy status." }, { status: 400 });
    }

    const fp = dataFilePath();
    const list = readJsonArray(fp);
    const idx = list.findIndex((x) => String(x?.id) === id);
    if (idx < 0) return NextResponse.json({ ok: false, error: "Nie znaleziono zgłoszenia." }, { status: 404 });

    const now = new Date().toISOString();
    list[idx] = { ...list[idx], status, updatedAt: now };
    writeJson(fp, list);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Błąd serwera", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
