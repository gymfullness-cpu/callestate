// Zamiast importu z @prisma/client (u Ciebie nie ma LeadStatus)
// definiujemy lokalny typ zgodny z tym, co wykorzystuje logika poniżej.
export type LeadStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "CONTACTED"
  | "WON"
  | "LOST"
  | "ARCHIVED"
  | (string & {}); // pozwala przeżyć, jeśli w DB pojawi się inny string

export function proposeFollowUp(args: {
  lead: {
    id: string;
    fullName: string;
    status: LeadStatus;
    temperature: number;
    lastContactAt?: Date | null;
    source?: string | null;
  };
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const lead = args.lead;

  if (lead.status === "WON" || lead.status === "LOST" || lead.status === "ARCHIVED") {
    return null;
  }

  const last = lead.lastContactAt ? new Date(lead.lastContactAt) : null;
  const daysSince = last
    ? Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  let hours = 24;
  if (lead.temperature >= 80) hours = 6;
  else if (lead.temperature >= 65) hours = 12;
  else if (lead.temperature >= 50) hours = 24;
  else hours = 36;

  if (daysSince >= 3) hours = 2;

  const dueAt = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const messageDraft =
    lead.temperature >= 70
      ? `Cześć ${lead.fullName}! Wracam do naszej rozmowy — chcesz, żebym podesłał 2-3 najlepsze opcje?`
      : `Cześć ${lead.fullName}! Daj znać proszę, czy temat jest nadal aktualny — jeśli tak, dopasuję świeże oferty.`;

  return {
    title: `Follow-up do ${lead.fullName}`,
    rationale: `Temperatura: ${lead.temperature}/100. Ostatni kontakt: ${
      last ? `${daysSince} dni temu` : "brak"
    }.`,
    dueAt,
    payload: {
      messageDraft,
      suggestedChannel: lead.temperature >= 70 ? "CALL" : "SMS",
    },
  };
}
