?"use client";

import { useEffect, useMemo, useState } from "react";

type Tag = {
  id: string;
  orgId: string;
  name: string;
};

type Contact = {
  id: string;
  orgId: string;
  type: "SELLER" | "BUYER" | "OTHER";
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  tags: { tagId: string; tag: Tag }[];
};

function badge(text: string) {
  return (
    <span
      style={{
        border: "1px solid var(--border-soft)",
        background: "var(--green-soft)",
        color: "var(--green-main)",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: "16px",
        whiteSpace: "nowrap",
        fontWeight: 700,
      }}
    >
      {text}
    </span>
  );
}

function typeLabel(t: Contact["type"]) {
  if (t === "SELLER") return "Sprzedaj&cy";
  if (t === "BUYER") return "Kupuj&cy";
  return "Inne";
}

export default function ContactsPage() {
  const [orgId, setOrgId] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  // add contact
  const [type, setType] = useState<Contact["type"]>("OTHER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // add tag
  const [newTagName, setNewTagName] = useState("");

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingContact = useMemo(
    () => contacts.find((c) => c.id === editingId) ?? null,
    [contacts, editingId]
  );

  const [editType, setEditType] = useState<Contact["type"]>("OTHER");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  const pickOrgId = (data: any): string | null => {
    if (typeof data?.id === "string") return data.id;
    if (typeof data?.orgId === "string") return data.orgId;
    if (typeof data?.org?.id === "string") return data.org.id;
    if (typeof data?.organization?.id === "string") return data.organization.id;
    if (typeof data?.user?.orgId === "string") return data.user.orgId;
    if (typeof data?.user?.org?.id === "string") return data.user.org.id;
    if (Array.isArray(data) && typeof data?.[0]?.id === "string") return data[0].id;
    if (Array.isArray(data?.orgs) && typeof data?.orgs?.[0]?.id === "string") return data.orgs[0].id;
    return null;
  };

  const safeJson = async (res: Response, label: string) => {
    const text = await res.text();
    if (!res.ok) {
      console.error(`DEBUG ${label} status:`, res.status);
      console.error(`DEBUG ${label} raw:`, text);
      throw new Error(`${label} status ${res.status}`);
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error(`DEBUG ${label} raw (nie JSON):`, text);
      throw new Error(`${label} nie JSON`);
    }
  };

  async function loadAll(query?: string) {
    setLoading(true);
    try {
      const orgRes = await fetch("/api/org/current");
      const org = await safeJson(orgRes, "/api/org/current");
      const id = pickOrgId(org);

      if (!id) {
        console.log("DEBUG org parsed:", org);
        alert("Nie mog�� znale�9z � orgId. Sprawd�9<� Console (F12).");
        setLoading(false);
        return;
      }

      setOrgId(id);

      const tagsRes = await fetch(`/api/tags?orgId=${id}`);
      const tagsData = await safeJson(tagsRes, "/api/tags");
      setTags(Array.isArray(tagsData) ? tagsData : []);

      const q2 = (query ?? q).trim();
      const url = q2
        ? `/api/contacts?orgId=${id}&q=${encodeURIComponent(q2)}`
        : `/api/contacts?orgId=${id}`;

      const contactsRes = await fetch(url);
      const contactsData = await safeJson(contactsRes, "/api/contacts");
      setContacts(Array.isArray(contactsData) ? contactsData : []);

      setLoading(false);
    } catch (e) {
      console.error("DEBUG loadAll error:", e);
      alert("B� a&d � aadowania. Otw�rz F12 -> Console i wklej DEBUG.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      alert("imi�� i nazwisko s& wymagane");
      return;
    }

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          type,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone || null,
          email: email || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert("B� a&d dodawania: " + text);
        return;
      }

      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setType("OTHER");

      await loadAll();
    } catch (error) {
      console.error("B� a&d podczas dodawania kontaktu:", error);
      alert("B� a&d dodawania kontaktu. Sprawd�9<� konsol��.");
    }
  }

  async function removeContact(id: string) {
    if (!confirm("Usun& � kontakt?")) return;

    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Nie uda� ao si�� usun& �");
      return;
    }

    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditType(c.type);
    setEditFirstName(c.firstName);
    setEditLastName(c.lastName);
    setEditPhone(c.phone ?? "");
    setEditEmail(c.email ?? "");
    setEditNotes(c.notes ?? "");
    setEditTagIds(c.tags.map((t) => t.tagId));
  }

  function toggleEditTag(tagId: string) {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId]
    );
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editFirstName.trim() || !editLastName.trim()) {
      alert("imi�� i nazwisko s& wymagane");
      return;
    }

    const res = await fetch(`/api/contacts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: editType,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone || null,
        email: editEmail || null,
        notes: editNotes || null,
        tagIds: editTagIds,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert("B� a&d zapisu: " + text);
      return;
    }

    const updated = (await res.json()) as Contact;
    setContacts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setEditingId(null);
  }

  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, name }),
    });

    if (res.status === 409) {
      alert("Taki tag ju��� istnieje");
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      alert("B� a&d dodania tagu: " + text);
      return;
    }

    setNewTagName("");
    await loadAll();
  }

  // stats
  const countSellers = useMemo(
    () => contacts.filter((c) => c.type === "SELLER").length,
    [contacts]
  );
  const countBuyers = useMemo(
    () => contacts.filter((c) => c.type === "BUYER").length,
    [contacts]
  );

  return (
    <div
      className="ce-page"
      style={{
        minHeight: "100vh",
        padding: 24,
      }}
    >
      {/* & mobile responsive helpers (bez zmiany logiki) */}
      <style>{`
        @media (max-width: 720px) {
          .ce-page { padding: 14px !important; }
          .ce-toolbar-row { gap: 8px !important; }
          .ce-input { min-width: 0 !important; width: 100% !important; }
          .ce-two-cols { grid-template-columns: 1fr !important; }
          .ce-minw { min-width: 0 !important; }
          .ce-break { overflow-wrap: anywhere; word-break: break-word; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
              Kontakty
            </div>
            <div style={{ opacity: 0.8, marginTop: 6, color: "var(--text-muted)" }}>
              CRM dla biura: szybkie wyszukiwanie, tagi, edycja i notatki.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            {badge(`Wszyscy: ${contacts.length}`)}
            {badge(`Sprzedaj&cy: ${countSellers}`)}
            {badge(`Kupuj&cy: ${countBuyers}`)}
          </div>
        </div>

        {/* Toolbar */}
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 16,
            border: "1px solid var(--border-soft)",
            background: "var(--bg-card)",
          }}
        >
          <div className="ce-toolbar-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="ce-input"
              placeholder="Szukaj: imi��, nazwisko, tel, email, notatki..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                minWidth: 260,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--bg-card-soft)",
                color: "var(--text-main)",
                outline: "none",
              }}
            />
            <button
              onClick={() => loadAll(q)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--green-main)",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Szukaj
            </button>
            <button
              onClick={() => {
                setQ("");
                loadAll("");
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--bg-card-soft)",
                color: "var(--text-main)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Wyczy� _ �
            </button>

            <div style={{ marginLeft: "auto", opacity: 0.9, fontSize: 12, color: "var(--text-muted)" }}>
              {loading ? "��adowanie..." : "Gotowe"}
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
          {/* Cards row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {/* Tags + Add Contact in one row on wide screens */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 16,
              }}
            >
              {/* Tags */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid var(--border-soft)",
                  background: "var(--bg-card)",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>Tagi</div>
                <div style={{ opacity: 0.9, marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                  Dodaj tagi i przypisuj je do kontakt�Bw (VIP, Kredyt, Pilne).
                </div>

                <form onSubmit={addTag} style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <input
                    className="ce-input"
                    placeholder="np. VIP"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border-soft)",
                      background: "var(--bg-card-soft)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border-soft)",
                      background: "var(--accent-soft)",
                      color: "var(--green-main)",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Dodaj tag
                  </button>
                </form>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {tags.length === 0 ? (
                    <span style={{ opacity: 0.9, color: "var(--text-muted)" }}>Brak tag�Bw</span>
                  ) : (
                    tags.map((t) => <span key={t.id}>{badge(t.name)}</span>)
                  )}
                </div>
              </div>

              {/* Add contact */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid var(--border-soft)",
                  background: "var(--bg-card)",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>Dodaj kontakt</div>
                <div style={{ opacity: 0.9, marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                  Minimalne dane: imi�� i nazwisko. Reszta opcjonalna.
                </div>

                <form onSubmit={addContact} style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.95 }}>
                      <span style={{ fontSize: 13, color: "var(--text-main)" }}>Typ</span>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border-soft)",
                          background: "var(--bg-card-soft)",
                          color: "var(--text-main)",
                          outline: "none",
                        }}
                      >
                        <option value="SELLER">Sprzedaj&cy</option>
                        <option value="BUYER">Kupuj&cy</option>
                        <option value="OTHER">Inne</option>
                      </select>
                    </label>
                  </div>

                  <div className="ce-two-cols" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <input
                      className="ce-input"
                      placeholder="imi��"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border-soft)",
                        background: "var(--bg-card-soft)",
                        color: "var(--text-main)",
                        outline: "none",
                      }}
                    />
                    <input
                      className="ce-input"
                      placeholder="Nazwisko"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border-soft)",
                        background: "var(--bg-card-soft)",
                        color: "var(--text-main)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div className="ce-two-cols" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <input
                      className="ce-input"
                      placeholder="Telefon"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border-soft)",
                        background: "var(--bg-card-soft)",
                        color: "var(--text-main)",
                        outline: "none",
                      }}
                    />
                    <input
                      className="ce-input"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border-soft)",
                        background: "var(--bg-card-soft)",
                        color: "var(--text-main)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <textarea
                    placeholder="Notatki"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border-soft)",
                      background: "var(--bg-card-soft)",
                      color: "var(--text-main)",
                      outline: "none",
                      minHeight: 80,
                      resize: "vertical",
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border-soft)",
                      background: "var(--green-main)",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Dodaj
                  </button>
                </form>
              </div>
            </div>

            {/* List */}
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid var(--border-soft)",
                background: "var(--bg-card)",
                marginTop: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>Lista kontakt�Bw</div>
                  <div style={{ opacity: 0.9, marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                    Kliknij ��[Edytuj, |eby zmieni � dane i tagi.
                  </div>
                </div>
              </div>

              {contacts.length === 0 ? (
                <div style={{ marginTop: 12, opacity: 0.95, color: "var(--text-muted)" }}>Brak kontakt�Bw.</div>
              ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {contacts.map((c) => {
                    const isEditing = editingId === c.id;
                    const title = `${c.firstName} ${c.lastName}`;

                    return (
                      <div
                        key={c.id}
                        style={{
                          borderRadius: 16,
                          border: "1px solid var(--border-soft)",
                          background: "var(--bg-card-soft)",
                          overflow: "hidden",
                        }}
                      >
                        {!isEditing ? (
                          <div
                            style={{
                              padding: 14,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <div className="ce-minw" style={{ minWidth: 260 }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 900, fontSize: 15, color: "var(--text-main)" }}>
                                  {title}
                                </div>
                                {badge(typeLabel(c.type))}
                              </div>

                              <div className="ce-break" style={{ opacity: 0.95, marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                {c.phone ? badge(`=� 9> ${c.phone}`) : null}
                                {c.email ? badge(` ��<�9 ${c.email}`) : null}
                              </div>

                              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {c.tags.length === 0 ? (
                                  <span style={{ opacity: 0.9, fontSize: 13, color: "var(--text-muted)" }}>bez tag�Bw</span>
                                ) : (
                                  c.tags.map((t) => <span key={t.tagId}>{badge(t.tag.name)}</span>)
                                )}
                              </div>

                              {c.notes ? (
                                <div style={{ marginTop: 10, opacity: 0.95, fontSize: 13, lineHeight: "18px", color: "var(--text-muted)" }}>
                                  {c.notes}
                                </div>
                              ) : null}
                            </div>

                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <button
                                onClick={() => startEdit(c)}
                                style={{
                                  padding: "9px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-main)",
                                  cursor: "pointer",
                                  fontWeight: 800,
                                }}
                              >
                                Edytuj
                              </button>
                              <button
                                onClick={() => removeContact(c.id)}
                                style={{
                                  padding: "9px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "rgba(239,68,68,0.15)",
                                  color: "rgb(185,28,28)",
                                  cursor: "pointer",
                                  fontWeight: 800,
                                }}
                              >
                                Usu�
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: 14, display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 900, color: "var(--text-main)" }}>
                                {editingContact ? `${editingContact.firstName} ${editingContact.lastName}` : "Edycja"}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={saveEdit}
                                  style={{
                                    padding: "9px 12px",
                                    borderRadius: 12,
                                    border: "1px solid var(--border-soft)",
                                    background: "var(--green-main)",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: 900,
                                  }}
                                >
                                  Zapisz
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  style={{
                                    padding: "9px 12px",
                                    borderRadius: 12,
                                    border: "1px solid var(--border-soft)",
                                    background: "var(--bg-card)",
                                    color: "var(--text-main)",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                  }}
                                >
                                  Anuluj
                                </button>
                              </div>
                            </div>

                            <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.95 }}>
                              <span style={{ fontSize: 13, color: "var(--text-main)" }}>Typ</span>
                              <select
                                value={editType}
                                onChange={(e) => setEditType(e.target.value as any)}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "var(--bg-card-soft)",
                                  color: "var(--text-main)",
                                  outline: "none",
                                }}
                              >
                                <option value="SELLER">Sprzedaj&cy</option>
                                <option value="BUYER">Kupuj&cy</option>
                                <option value="OTHER">Inne</option>
                              </select>
                            </label>

                            <div className="ce-two-cols" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                              <input
                                className="ce-input"
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "var(--bg-card-soft)",
                                  color: "var(--text-main)",
                                  outline: "none",
                                }}
                              />
                              <input
                                className="ce-input"
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "var(--bg-card-soft)",
                                  color: "var(--text-main)",
                                  outline: "none",
                                }}
                              />
                            </div>

                            <div className="ce-two-cols" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                              <input
                                className="ce-input"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "var(--bg-card-soft)",
                                  color: "var(--text-main)",
                                  outline: "none",
                                }}
                              />
                              <input
                                className="ce-input"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid var(--border-soft)",
                                  background: "var(--bg-card-soft)",
                                  color: "var(--text-main)",
                                  outline: "none",
                                }}
                              />
                            </div>

                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px solid var(--border-soft)",
                                background: "var(--bg-card-soft)",
                                color: "var(--text-main)",
                                outline: "none",
                                minHeight: 90,
                                resize: "vertical",
                              }}
                            />

                            <div
                              style={{
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid var(--border-soft)",
                                background: "var(--bg-card)",
                              }}
                            >
                              <div style={{ fontWeight: 900, marginBottom: 10, color: "var(--text-main)" }}>
                                Tagi kontaktu
                              </div>
                              {tags.length === 0 ? (
                                <div style={{ opacity: 0.95, fontSize: 13, color: "var(--text-muted)" }}>
                                  Brak tag�Bw �� dodaj je wy���ej.
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                  {tags.map((t) => (
                                    <label key={t.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={editTagIds.includes(t.id)}
                                        onChange={() => toggleEditTag(t.id)}
                                      />
                                      <span style={{ fontSize: 13, color: "var(--text-main)" }}>{t.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ opacity: 0.95, marginTop: 18, fontSize: 12, color: "var(--text-muted)" }}>
          Tip: dodaj tagi ��[VIP, ��[Kredyt, ��[Pilne i filtruj listy klient�Bw w sekund�� (zrobimy filtr w nast��pnym kroku).
        </div>
      </div>
    </div>
  );
}