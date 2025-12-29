import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 40 }}>
      <h1>CallEstate</h1>

      <p>Moja pierwsza działająca strona.</p>

      <p>
        <Link href="/leads">Przejdź do listy leadów</Link>
      </p>
    </main>
  );
}
