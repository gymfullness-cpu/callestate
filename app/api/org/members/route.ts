import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = (searchParams.get("orgId") || "").trim();

    if (!orgId) return json({ error: "Podaj orgId" }, 400);

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return json({ members });
  } catch (e: any) {
    return json({ error: "GET members failed", detail: e?.message ?? String(e) }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => ({}));

    const orgId = String(body?.orgId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const name = String(body?.name || "").trim();
    const role = String(body?.role || "AGENT").trim();

    if (!orgId || !email) return json({ error: "Wymagane: orgId, email" }, 400);
    if (!name) return json({ error: "Wymagane: name (imię i nazwisko)" }, 400);

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return json({ error: "Nieprawidłowy orgId (biuro nie istnieje)" }, 400);

    const existing = await prisma.orgMember.findFirst({
      where: { orgId, email },
    });

    if (existing) {
      return json({ error: "Taki email już istnieje w tym biurze", existing }, 409);
    }

    const member = await prisma.orgMember.create({
      data: {
        orgId,
        email,
        name,
        phone: body?.phone ? String(body.phone).trim() : null,
        rank: body?.rank ? String(body.rank).trim() : null,
        role,
      },
    });

    return json({ member }, 201);
  } catch (e: any) {
    return json({ error: "POST members failed", detail: e?.message ?? String(e) }, 500);
  }
}
