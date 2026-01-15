import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proposeFollowUp } from "@/app/lib/ai/followup";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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

    const proposal = proposeFollowUp({
      lead: {
        id: lead.id,
        fullName: lead.fullName,
        status: lead.status,
        temperature: lead.temperature,
        lastContactAt: lead.lastContactAt,
        source: lead.source,
      },
    });

    if (!proposal) {
      return NextResponse.json({
        ok: true,
        created: false,
        reason: "No proposal",
      });
    }

    // brak duplikatów pending FOLLOW_UP
    const existing = await prisma.aITask.findFirst({
      where: {
        leadId: lead.id,
        type: "FOLLOW_UP",
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, created: false, task: existing });
    }

    const task = await prisma.aITask.create({
      data: {
        orgId: lead.orgId,
        leadId: lead.id,
        ownerId: lead.ownerId ?? null,
        type: "FOLLOW_UP",
        status: "PENDING",
        title: proposal.title,
        rationale: proposal.rationale,
        payload: JSON.stringify(proposal.payload),
        dueAt: proposal.dueAt,
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextActionAt: proposal.dueAt },
    });

    return NextResponse.json({ ok: true, created: true, task }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "AI followup failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
