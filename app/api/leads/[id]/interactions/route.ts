import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeLeadTemperature } from "@/app/lib/ai/scoring";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // Next 16: params jest Promise
) {
  const { id: leadId } = await ctx.params;

  const body = await req.json();

  if (!body?.type || !body?.content) {
    return NextResponse.json(
      { error: "Wymagane: type, content" },
      { status: 400 }
    );
  }

  // Tworzymy interakcjć™ i łć…czymy jć… z leadem przez relacjć™
  const interaction = await prisma.interaction.create({
    data: {
      actorId: body.actorId ?? null,
      type: body.type,
      content: body.content,
      lead: { connect: { id: leadId } },
    },
  });

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { interactions: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { temperature, lastContactAt } = computeLeadTemperature({
    status: lead.status,
    interactions: lead.interactions.map((i) => ({
      type: i.type,
      createdAt: i.createdAt,
    })),
  });

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { temperature, lastContactAt: lastContactAt ?? lead.lastContactAt },
  });

  return NextResponse.json({ interaction, lead: updated }, { status: 201 });
}