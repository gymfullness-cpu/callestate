import Link from "next/link";

type Lead = {
  id: number;
  name: string;
  status: string;
};

const leads: Lead[] = [
  { id: 1, name: "Jan Kowalski", status: "Nowy" },
  { id: 2, name: "Anna Nowak", status: "Oddzwonić" },
  { id: 3, name: "Piotr Zieliński", status: "Zainteresowany" },
];

export default function LeadsPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Leady</h1>

      <ul>
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link href={`/leads/${lead.id}`}>
              {lead.name} — {lead.status}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
