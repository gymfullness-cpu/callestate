import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Podaj name" }, { status: 400 });
  }

  const org = await prisma.organization.create({
    data: { name: body.name },
  });

  return NextResponse.json({ org }, { status: 201 });
}

export async function GET() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ orgs });
}

