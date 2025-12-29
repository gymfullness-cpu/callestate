
import Notes from "./Notes";

import CallButton from "./CallButton";
import StatusSwitcher from "./StatusSwitcher";
type LeadStatus = "Nowy" | "Oddzwonić" | "Zamknięty";

type Lead = {
  id: number;
  name: string;
  phone: string;
  status: LeadStatus;
};


const leads: Lead[] = [
  { id: 1, name: "Jan Kowalski", phone: "600123456", status: "Nowy" },
  { id: 2, name: "Anna Nowak", phone: "500987654", status: "Oddzwonić" },
  { id: 3, name: "Piotr Zieliński", phone: "700111222", status: "Zamknięty"
 },
];

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = leads.find((l) => l.id === Number(id));

  if (!lead) {
    return <p>Nie znaleziono leada</p>;
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>{lead.name}</h1>

      <StatusSwitcher leadId={lead.id} initialStatus={lead.status} />


      <p>
        <strong>Telefon:</strong>{" "}
        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
      </p>

      <CallButton phone={lead.phone} />
      <Notes leadId={lead.id} />

    </main>
  );
}
