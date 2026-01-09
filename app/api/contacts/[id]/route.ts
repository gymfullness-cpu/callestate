import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const tagIds = Array.isArray(body?.tagIds) ? (body.tagIds as string[]) : null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: {
          type: body?.type ?? undefined,
          firstName: body?.firstName ?? undefined,
          lastName: body?.lastName ?? undefined,
          phone: body?.phone ?? undefined,
          email: body?.email ?? undefined,
          notes: body?.notes ?? undefined,
        },
      });

      if (tagIds) {
        await tx.contactTagOnContact.deleteMany({ where: { contactId: id } });

        if (tagIds.length > 0) {
          await tx.contactTagOnContact.createMany({
            data: tagIds.map((tagId) => ({ contactId: id, tagId })),
            // ✅ USUNIĘTE: skipDuplicates (Twoja wersja Prisma nie wspiera tego pola)
          });
        }
      }

      return tx.contact.findUnique({
        where: { id },
        include: { tags: { include: { tag: true } } },
      });
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.log("ERROR /api/contacts/[id] PATCH:", e);
    return NextResponse.json(
      { error: "Błąd serwera PATCH contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.log("ERROR /api/contacts/[id] DELETE:", e);
    return NextResponse.json(
      { error: "Błąd serwera DELETE contact" },
      { status: 500 }
    );
  }
}
