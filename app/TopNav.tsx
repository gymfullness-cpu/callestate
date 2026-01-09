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

  // ✅ zamykaj menu po zmianie trasy (klik w link)
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * ✅ ZACHOWANIE:
   * - chowaj topbar gdy scroll w dół
   * - pokaż gdy scroll w górę / na górze
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

  // ✅ klik w link w dropdown -> zamknij details
  const onDropdownClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement | null;
    const a = el?.closest?.("a");
    if (a) closeMenu();
  };

  return (
    <>
      {/* ✅ CSS tylko do responsywnego menu */}
      <style>{`
        .ce-desktop-links { display: none; }
        .ce-mobile-menu { display: block; }

        @media (min-width: 900px) {
          .ce-desktop-links { display: flex; }
          .ce-mobile-menu { display: none; }
        }

        .ce-hamburger {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: var(--text-main);
          font-weight: 800;
          cursor: pointer;
          user-select: none;
        }
        .ce-hamburger:active { transform: translateY(1px); }

        summary { list-style: none; }
        summary::-webkit-details-marker { display: none; }

        .ce-dropdown {
          margin-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.10);
          padding-top: 12px;
          max-height: 70vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ce-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        @media (max-width: 360px) {
          .ce-grid { grid-template-columns: 1fr; }
        }

        @media (min-width: 900px) {
          .ce-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav
        id="ce-topnav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border-soft)",
          background: "rgba(7, 13, 24, 0.72)",
          backdropFilter: "blur(10px)",
          transform: hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 220ms ease",
          willChange: "transform",
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
            flexWrap: "wrap",
          }}
        >
          {/* LOGO + ThemeSwitcher obok */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AppBrand />
            <ThemeSwitcher />
          </div>

          {/* MOBILE */}
          <div className="ce-mobile-menu">
            <details ref={detailsRef}>
              <summary className="ce-hamburger">☰ Menu</summary>

              <div className="ce-dropdown" onClick={onDropdownClick}>
                <div className="ce-grid">
                  <NavLink href="/dashboard">📊 Dashboard</NavLink>
                  <NavLink href="/leads">📞 Leady</NavLink>
                  <NavLink href="/contacts">👥 Kontakty</NavLink>
                  <NavLink href="/agents">🧑‍💼 Agenci</NavLink>

                  <NavLink href="/prospects">🎯 Pozyski</NavLink>
                  <NavLink href="/prospects/intake">🧾 Pozyski z formularzy</NavLink>
                  <NavLink href="/prospects/ads">📣 Reklamy / Social</NavLink>
                  <NavLink href="/prospects/form">📝 Formularz</NavLink>

                  <NavLink href="/properties">🏠 Nieruchomości</NavLink>

                  <NavLink href="/calendar">📅 Kalendarz</NavLink>
                  <NavLink href="/followups">🔔 Follow-up</NavLink>

                  <NavLink href="/analyzed">🤖 AI: Analiza</NavLink>
                  <NavLink href="/assistant/live">🎧 AI: Coach</NavLink>

                  <NavLink href="/news">🗞️ Prasówka</NavLink>
                  <NavLink href="/newsletter">✉️ Newsletter</NavLink>
                  <NavLink href="/market">🌍 Market</NavLink>
                  <NavLink href="/voice-notes">🎙️ Głosówki</NavLink>
                  <NavLink href="/documents/sale">📄 Dokumenty</NavLink>
                </div>
              </div>
            </details>
          </div>

          {/* DESKTOP */}
          <div className="ce-desktop-links" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <NavLink href="/dashboard">📊 Dashboard</NavLink>
            <NavLink href="/leads">📞 Leady</NavLink>
            <NavLink href="/contacts">👥 Kontakty</NavLink>
            <NavLink href="/agents">🧑‍💼 Agenci</NavLink>

            <NavLink href="/prospects">🎯 Pozyski</NavLink>
            <NavLink href="/properties">🏠 Nieruchomości</NavLink>

            <NavLink href="/calendar">📅 Kalendarz</NavLink>
            <NavLink href="/followups">🔔 Follow-up</NavLink>

            <NavLink href="/analyzed">🤖 AI: Analiza</NavLink>
            <NavLink href="/assistant/live">🎧 AI: Coach</NavLink>

            <NavLink href="/market">🌍 Market</NavLink>
            <NavLink href="/voice-notes">🎙️ Głosówki</NavLink>
            <NavLink href="/documents/sale">📄 Dokumenty</NavLink>
            <NavLink href="/news">🗞️ Prasówka</NavLink>
            <NavLink href="/newsletter">✉️ Newsletter</NavLink>
          </div>
        </div>
      </nav>
    </>
  );
}
