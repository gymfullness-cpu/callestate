import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SocialLinkUpsertSchema } from "@/lib/social";

export const runtime = "nodejs";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * MVP: bierzemy pierwszego AgentProfile z bazy.
 * Potem podmienisz to na np. session.user.memberId.
 */
async function getAgentProfileIdMvp(): Promise<string> {
  const profile = await prisma.agentProfile.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    // To nie jest "bad request", tylko brak zasobu / brak danych inicjalnych.
    throw new HttpError(
      404,
      "Brak AgentProfile w bazie. Utwórz profil agenta (AgentProfile) i spróbuj ponownie."
    );
  }

  return profile.id;
}

function toErrorResponse(e: any) {
  const status = typeof e?.status === "number" ? e.status : 500;
  const message = e?.message ?? "Błąd serwera";
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const agentProfileId = await getAgentProfileIdMvp();

    const links = await prisma.agentSocialLink.findMany({
      where: { agentProfileId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ links });
  } catch (e: any) {
    return toErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const agentProfileId = await getAgentProfileIdMvp();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "bad_request", details: "Body musi być poprawnym JSON." },
        { status: 400 }
      );
    }

    const parsed = SocialLinkUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ValidationError", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platform, url, label } = parsed.data;

    const link = await prisma.agentSocialLink.upsert({
      where: {
        agentProfileId_platform: { agentProfileId, platform },
      },
      create: { agentProfileId, platform, url, label: label || null },
      update: { url, label: label || null },
    });

    return NextResponse.json({ link });
  } catch (e: any) {
    return toErrorResponse(e);
  }
}
