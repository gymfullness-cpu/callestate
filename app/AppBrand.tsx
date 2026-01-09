"use client";

import Link from "next/link";

export function AppBrand() {
  return (
    <Link
      href="/dashboard"
      aria-label="Calyx AI"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        color: "var(--text-main)",
      }}
    >
      <img
        src="/icons/icon-192.png"
        alt="Calyx AI"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(45,212,191,0.25)",
        }}
      />
      <span
        style={{
          fontFamily:
            "Satoshi, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          fontSize: 16,
          lineHeight: "20px",
        }}
      >
        Calyx AI
      </span>
    </Link>
  );
}
