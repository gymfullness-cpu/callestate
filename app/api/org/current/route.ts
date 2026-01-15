import { NextResponse } from "next/server";

export const runtime = "nodejs"; // bezpiecznie na Windows/dev
export const dynamic = "force-dynamic";

type Org = {
  id: string;
  name: string;
  plan?: string;
};

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * DEV-SAFE endpoint:
 * - Nigdy nie powinien wysypywać 500 (żeby UI nie spamowało konsoli).
 * - Jeśli kiedyś podłączysz prawdziwą organizację (auth/DB),
 *   to logikę podmieniasz tylko tutaj.
 */
export async function GET() {
  try {
    // 1) ENV (opcjonalnie)
    const envOrgId = process.env.ORG_ID?.trim();
    const envOrgName = process.env.ORG_NAME?.trim();

    if (envOrgId && envOrgName) {
      const org: Org = {
        id: envOrgId,
        name: envOrgName,
        plan: process.env.ORG_PLAN?.trim() || undefined,
      };
      return json({ ok: true, org });
    }

    // 2) Fallback lokalny – UI zawsze działa
    const org: Org = { id: "local", name: "Local Workspace", plan: "dev" };
    return json({ ok: true, org });
  } catch (err: any) {
    // Nigdy 500 – UI nie ma się wysypywać
    const org: Org = { id: "local", name: "Local Workspace", plan: "dev" };
    return json({
      ok: true,
      org,
      warning: "Fallback local org (error in /api/org/current).",
      error: String(err?.message || err),
    });
  }
}
