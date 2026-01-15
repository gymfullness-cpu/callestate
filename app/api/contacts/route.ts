import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const q = (searchParams.get("q") ?? "").trim();

    if (!orgId) return NextResponse.json({ error: "Brak orgId" }, { status: 400 });

    // SQLite + Prisma: NIE uĹĽywamy mode:"insensitive" (powoduje 500)
    const where: any = { orgId };

    if (q) {
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { notes: { contains: q } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
  } catch (e: any) {
    console.log("ERROR /api/contacts GET:", e);
    return NextResponse.json(
      { error: "BĹ‚Ä…d serwera /api/contacts", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const orgId = body.orgId as string | undefined;
    const firstName = (body.firstName as string | undefined)?.trim();
    const lastName = (body.lastName as string | undefined)?.trim();

    if (!orgId) return NextResponse.json({ error: "Brak orgId" }, { status: 400 });
    if (!firstName) return NextResponse.json({ error: "Brak firstName" }, { status: 400 });
    if (!lastName) return NextResponse.json({ error: "Brak lastName" }, { status: 400 });

    const contact = await prisma.contact.create({
      data: {
        orgId,
        type: body.type ?? "OTHER",
        firstName,
        lastName,
        phone: body.phone ?? null,
        email: body.email ?? null,
        notes: body.notes ?? null,
      },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (e: any) {
    console.log("ERROR /api/contacts POST:", e);
    return NextResponse.json(
      { error: "BĹ‚Ä…d serwera /api/contacts", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
