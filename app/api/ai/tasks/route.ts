import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const ownerId = searchParams.get("ownerId");
  const status = searchParams.get("status") ?? "PENDING";

  if (!orgId) {
    return NextResponse.json({ error: "Podaj orgId" }, { status: 400 });
  }

  const tasks = await prisma.aITask.findMany({
    where: {
      orgId,
      status: status as any,
      ...(ownerId ? { ownerId } : {}),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { lead: true },
  });

  return NextResponse.json({ tasks });
}

