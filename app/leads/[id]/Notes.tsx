"use client";

import { useEffect, useState } from "react";

type Note = {
  text: string;
  date: string;
};

export default function Notes({ leadId }: { leadId: number }) {
  const storageKey = `lead-notes-${leadId}`;

  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setNotes(JSON.parse(saved));
    }
  }, [storageKey]);

  const saveNote = () => {
    if (!text.trim()) return;

    const newNote: Note = {
      text,
      date: new Date().toLocaleString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setText("");
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h3>📝 Notatki po rozmowie</h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8 }}
        placeholder="Wpisz notatkę z rozmowy..."
      />

      <br />

      <button onClick={saveNote} style={{ marginTop: 10 }}>
        💾 Zapisz notatkę
      </button>

      <ul style={{ marginTop: 20 }}>
        {notes.map((note, index) => (
          <li key={index} style={{ marginBottom: 10 }}>
            <strong>{note.date}</strong>
            <br />
            {note.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
