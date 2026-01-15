"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import NavLink from "./NavLink";
import { AppBrand } from "./components/AppBrand";
import ThemeSwitcher from "./components/ThemeSwitcher";

export default function TopNav() {
  const [hidden, setHidden] = useState(false);

  const lastY = useRef(0);
  const ticking = useRef(false);

  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const pathname = usePathname();

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  // ✅ zamykaj menu po zmianie trasy
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  /**
   * ✅ ZACHOWANIE:
   * - chowaj topbar przy scrollu w dół
   * - pokaż przy scrollu w górę / na górze
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    lastY.current = window.scrollY || 0;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const delta = y - lastY.current;

        // ✅ na samej górze zawsze pokaż
        if (y < 8) {
          setHidden(false);
          lastY.current = y;
          ticking.current = false;
          return;
        }

        const TH = 10;
        if (delta > TH) setHidden(true);
        else if (delta < -TH) setHidden(false);

        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ klik w link w dropdown → zamknij menu
  const onDropdownClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement | null;
    const a = el?.closest?.("a");
    if (a) closeMenu();
  };

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border-soft)",
          background: "rgba(7, 13, 24, 0.72)",
          backdropFilter: "blur(10px)",
          transform: hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 220ms ease",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <AppBrand />
            <ThemeSwitcher />
          </div>

          {/* MOBILE */}
          <div>
            <details ref={detailsRef}>
              <summary style={{ cursor: "pointer" }}>☰ Menu</summary>
              <div onClick={onDropdownClick}>
                <NavLink href="/dashboard">📊 Dashboard</NavLink>
                <NavLink href="/leads">📞 Leady</NavLink>
                <NavLink href="/contacts">👥 Kontakty</NavLink>
                <NavLink href="/agents">🧑‍💼 Agenci</NavLink>
                <NavLink href="/prospects">🎯 Pozyski</NavLink>
                <NavLink href="/properties">🏠 Nieruchomości</NavLink>
                <NavLink href="/calendar">📅 Kalendarz</NavLink>
                <NavLink href="/followups">🔔 Follow-up</NavLink>
                <NavLink href="/settings/social-media">📱 Social media</NavLink>
                <NavLink href="/assistant/live">🎧 AI Coach</NavLink>
                <NavLink href="/voice-notes">🎙️ Głosówki</NavLink>
                <NavLink href="/documents/sale">📄 Dokumenty</NavLink>
              </div>
            </details>
          </div>
        </div>
      </nav>
    </>
  );
}
