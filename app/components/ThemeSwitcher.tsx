"use client";

import { useEffect, useMemo, useState } from "react";

type ThemeId =
  | "navyMint"
  | "ocean"
  | "emerald"
  | "royal"
  | "graphite"
  | "burgundy"
  | "offwhite";

const ORDER: ThemeId[] = [
  "navyMint",
  "ocean",
  "emerald",
  "royal",
  "graphite",
  "burgundy",
  "offwhite",
];

const LABEL: Record<ThemeId, string> = {
  navyMint: "Navy Mint",
  ocean: "Ocean",
  emerald: "Emerald",
  royal: "Royal",
  graphite: "Graphite",
  burgundy: "Burgundy",
  offwhite: "Off-White",
};

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("navyMint");

  useEffect(() => {
    const raw = localStorage.getItem("ce-theme");

    // migracje starych nazw
    const migrated = raw === "ivory" || raw === "pastel" ? "offwhite" : raw;

    const safe: ThemeId = ORDER.includes(migrated as ThemeId)
      ? (migrated as ThemeId)
      : "navyMint";

    document.documentElement.dataset.theme = safe;
    localStorage.setItem("ce-theme", safe);
    setTheme(safe);
  }, []);

  const nextTheme = () => {
    const i = ORDER.indexOf(theme);
    const next = ORDER[(i + 1) % ORDER.length];
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ce-theme", next);
    setTheme(next);
  };

  const hint = useMemo(
    () => `Motyw: ${LABEL[theme]} (kliknij aby zmienić)`,
    [theme]
  );

  return (
    <button
      onClick={nextTheme}
      title={hint}
      aria-label={hint}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        border: "1px solid var(--border-soft)",
        background: "rgba(255,255,255,0.06)",
        color: "var(--text-main)",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
        backdropFilter: "blur(14px)",
      }}
    >
      🏠
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "var(--accent)",
          boxShadow: "0 0 0 3px var(--accent-soft)",
        }}
      />
      {LABEL[theme]}
    </button>
  );
}
