import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SocialPlatform } from "@prisma/client";

async function getAgentProfileIdMvp(): Promise<string> {
  const profile = await prisma.agentProfile.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    throw new Error("Brak AgentProfile w bazie. Utwórz profil agenta (AgentProfile) i spróbuj ponownie.");
  }

  return profile.id;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { platform: string } }
) {
  try {
    const agentProfileId = await getAgentProfileIdMvp();
    const platform = params.platform as SocialPlatform;

    if (!Object.values(SocialPlatform).includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    await prisma.agentSocialLink.deleteMany({
      where: { agentProfileId, platform },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Błąd" }, { status: 400 });
  }
}
