// Prisma 7 / build na Vercelu potrafi nie mieć eksportów enumów w @prisma/client w tym etapie.
// Dlatego definiujemy lokalne typy zgodne z schema.prisma i nie importujemy ich z Prisma.

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "VIEWING"
  | "OFFER"
  | "WON"
  | "LOST"
  | "ARCHIVED"
  | (string & {});

export type InteractionType =
  | "CALL"
  | "SMS"
  | "EMAIL"
  | "MEETING"
  | "NOTE"
  | "WHATSAPP"
  | (string & {});

type Interaction = { type: InteractionType; createdAt: Date };

export function computeLeadTemperature(args: {
  status: LeadStatus;
  interactions: Interaction[];
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const interactions = [...args.interactions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const last = interactions[0]?.createdAt ?? null;

  let score =
    args.status === "NEW"
      ? 55
      : args.status === "CONTACTED"
      ? 60
      : args.status === "QUALIFIED"
      ? 70
      : args.status === "VIEWING"
      ? 78
      : args.status === "OFFER"
      ? 85
      : args.status === "WON"
      ? 100
      : args.status === "LOST"
      ? 10
      : 40;

  if (last) {
    const days = Math.floor(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    score -= Math.min(40, days * 4);
  } else {
    score -= 10;
  }

  for (const i of interactions.slice(0, 10)) {
    if (i.type === "MEETING") score += 5;
    if (i.type === "CALL") score += 3;
    if (i.type === "EMAIL") score += 1;
    if (i.type === "SMS" || i.type === "WHATSAPP") score += 2;
  }

  score = Math.max(0, Math.min(100, score));
  return { temperature: score, lastContactAt: last };
}
