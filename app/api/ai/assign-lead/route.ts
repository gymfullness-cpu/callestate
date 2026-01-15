import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.leadId) {
    return NextResponse.json({ error: "Wymagane: leadId" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: body.leadId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // 1) wybieramy agentów z biura
  const agents = await prisma.orgMember.findMany({
    where: {
      orgId: lead.orgId,
      role: { in: ["AGENT", "MANAGER", "OWNER"] },
    },
    take: 200,
  });

  if (agents.length === 0) {
    return NextResponse.json(
      { error: "Brak agentów w biurze" },
      { status: 400 }
    );
  }

  // 2) policz ile leadów ma każdy agent
  const counts = await prisma.lead.groupBy({
    by: ["ownerId"],
    where: { orgId: lead.orgId, ownerId: { not: null } },
    _count: { _all: true },
  });

  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c.ownerId) countMap.set(c.ownerId, c._count._all);
  }

  // 3) wybierz tego z najmniejszć… liczbć… leadów
  let best = agents[0];
  let bestCount = countMap.get(best.id) ?? 0;

  for (const a of agents) {
    const c = countMap.get(a.id) ?? 0;
    if (c < bestCount) {
      best = a;
      bestCount = c;
    }
  }

  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: { ownerId: best.id },
  });

  return NextResponse.json({
    ok: true,
    assigned: true,
    lead: updatedLead,
    owner: best,
    ownerLeadCount: bestCount,
  });
}
