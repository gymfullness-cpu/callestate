import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId required" }, { status: 400 });
    }

    const profile = await prisma.agentProfile.findUnique({
      where: { memberId },
      include: { member: true },
    });

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

    return NextResponse.json(
      { error: "API error", details: message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    if (!body?.memberId || !body?.displayName) {
      return NextResponse.json(
        { error: "memberId + displayName required" },
        { status: 400 }
      );
    }

    const memberId = String(body.memberId);
    const displayName = String(body.displayName);

    const profile = await prisma.agentProfile.upsert({
      where: { memberId },
      update: {
        displayName,
        title: body.title ?? null,
        bio: body.bio ?? null,
        phone: body.phone ?? null,
        avatarUrl: body.avatarUrl ?? null,
        coverUrl: body.coverUrl ?? null,
        primaryColor: body.primaryColor ?? null,
        accentColor: body.accentColor ?? null,
        ctaText: body.ctaText ?? null,
      },
      create: {
        memberId,
        displayName,
        title: body.title ?? null,
        bio: body.bio ?? null,
        phone: body.phone ?? null,
        avatarUrl: body.avatarUrl ?? null,
        coverUrl: body.coverUrl ?? null,
        primaryColor: body.primaryColor ?? null,
        accentColor: body.accentColor ?? null,
        ctaText: body.ctaText ?? null,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

    return NextResponse.json(
      { error: "API error", details: message },
      { status: 500 }
    );
  }
}
