import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.orgId || !body?.fullName) {
    return NextResponse.json(
      { error: "Wymagane: orgId, fullName" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      orgId: body.orgId,
      ownerId: body.ownerId ?? null,
      fullName: body.fullName,
      phone: body.phone ?? null,
      email: body.email ?? null,
      source: body.source ?? null,
      status: body.status ?? "NEW",
      temperature: 50,
    },
  });

  return NextResponse.json({ lead }, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "Podaj orgId w query" }, { status: 400 });
  }

  const leads = await prisma.lead.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ leads });
}

