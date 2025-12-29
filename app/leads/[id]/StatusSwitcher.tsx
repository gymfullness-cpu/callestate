"use client";

import { useEffect, useState } from "react";

const statuses = ["Nowy", "Oddzwonić", "Zamknięty"] as const;
type Status = (typeof statuses)[number];

export default function StatusSwitcher({
  leadId,
  initialStatus,
}: {
  leadId: number;
  initialStatus: Status;
}) {
  const storageKey = `lead-status-${leadId}`;

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>(initialStatus);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setStatus(saved as Status);
    }
  }, [storageKey]);

  const nextStatus = () => {
    const index = statuses.indexOf(status);
    const next = statuses[(index + 1) % statuses.length];
    setStatus(next);
    localStorage.setItem(storageKey, next);
  };

  // ⛔️ NA SERWERZE NIC NIE RENDERUJEMY
  if (!mounted) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <p>
        <strong>Status:</strong> {status}
      </p>

      <button
        onClick={nextStatus}
        style={{
          marginTop: 10,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        Zmień status
      </button>
    </div>
  );
}
