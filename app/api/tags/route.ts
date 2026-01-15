import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function errorPayload(e: any) {
  return {
    error: "Błąd serwera /api/tags",
    message: e?.message ?? String(e),
    code: e?.code ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Brak orgId" }, { status: 400 });
    }

    const tags = await prisma.contactTag.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (e: any) {
    console.error("ERROR /api/tags GET:", e);
    return NextResponse.json(errorPayload(e), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orgId = body.orgId as string | undefined;
    const name = (body.name as string | undefined)?.trim();

    if (!orgId) {
      return NextResponse.json({ error: "Brak orgId" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Brak nazwy tagu" }, { status: 400 });
    }

    const tag = await prisma.contactTag.create({
      data: { orgId, name },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (e: any) {
    console.error("ERROR /api/tags POST:", e);
    return NextResponse.json(errorPayload(e), { status: 500 });
  }
}
