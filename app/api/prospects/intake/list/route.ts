import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function filePath() {
  return path.join(process.cwd(), "data", "prospects-intake.json");
}

function ensureDirExists() {
  const dir = path.dirname(filePath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function GET() {
  try {
    ensureDirExists();

    const p = filePath();
    if (!fs.existsSync(p)) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const raw = fs.readFileSync(p, "utf8").trim();
    if (!raw) {
      return NextResponse.json({ ok: true, items: [] });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // jeśli plik jest uszkodzony, nie wywalaj 500 — zwróć pustą listę
      return NextResponse.json({
        ok: true,
        items: [],
        warning: "Invalid JSON in prospects-intake.json (returned empty list).",
      });
    }

    return NextResponse.json({
      ok: true,
      items: Array.isArray(parsed) ? parsed : [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Błąd serwera", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
