import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const now = new Date();

  const due = await prisma.client.findMany({
    where: {
      followUpAt: { lte: now },
      followUpDoneAt: null,
    },
    orderBy: { followUpAt: "asc" },
    take: 50,
    select: { id: true, name: true, followUpAt: true, followUpNote: true },
  });

  return NextResponse.json({ due });
}
