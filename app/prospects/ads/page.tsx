?"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FONT_LIBRARY, FONT_VARS_CLASSNAME } from "./fonts";

/* ================= TYPES ================= */

type Format = "square" | "story";
type LayerType = "text" | "pill" | "box";

type LayerBase = {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  z: number;
  visible: boolean;
  locked: boolean;
};

type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  color: string;
  align: "left" | "center" | "right";
};

type PillLayer = LayerBase & {
  type: "pill";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  bg: string;
  border: string;
  borderWidth: number;
  radius: number;
  paddingX: number;
  paddingY: number;
};

type BoxLayer = LayerBase & {
  type: "box";
  bg: string;
  border: string;
  borderWidth: number;
  radius: number;
  blur: number;
};

type Layer = TextLayer | PillLayer | BoxLayer;

type BgState = {
  dataUrl: string | null;
  iw: number;
  ih: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  dim: number;
};

type StylePresetKey = "luxury" | "editorial" | "nordic" | "night";

/* ================= UTILS ================= */

function uid(prefix = "l") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}

function escapeXml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function svgToDataUrl(svg: string) {
  const encoded = encodeURIComponent(svg).replaceAll("%0A", "").replaceAll("%20", " ");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

async function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadPngFromSvg(svg: string, filename: string, width: number, height: number, bgHex: string) {
  const img = new Image();
  const url = svgToDataUrl(svg);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Nie uda� ao si�� za� aadowa � SVG do konwersji."));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak canvas context.");

  ctx.fillStyle = bgHex || "#0b0b0b";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function artboardSize(format: Format) {
  return { W: 1080, H: format === "square" ? 1080 : 1920 };
}

function coverRect(W: number, H: number, iw: number, ih: number) {
  const scale = Math.max(W / iw, H / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  return { x, y, w, h, scale };
}

const SWATCHES = [
  "#FFFFFF",
  "#E5E7EB",
  "#111827",
  "#0B0B0B",
  "#D4AF37",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#7C3AED",
  "#F97316",
  "#EF4444",
];

/* ================= STYLE PRESETS ================= */

function preset(style: StylePresetKey) {
  // Zasada: premium = mniej element�Bw + lepsze proporcje + mocny typograficzny tytu� a + czytelny CTA
  if (style === "luxury") {
    return {
      label: "Luxury (Gold/Black)",
      bgHex: "#0B0B0B",
      dim: 0.50,
      cardBg: "rgba(10,10,10,0.55)",
      cardBorder: "rgba(212,175,55,0.28)",
      accentBg: "rgba(212,175,55,0.16)",
      accentBorder: "rgba(212,175,55,0.52)",
      textMain: "rgba(255,255,255,0.96)",
      textSub: "rgba(255,255,255,0.78)",
      fontTitle: "Playfair Display, Georgia, serif",
      fontUI: "Plus Jakarta Sans, Inter, system-ui, -apple-system, Segoe UI, Roboto",
    };
  }

  if (style === "editorial") {
    return {
      label: "Editorial (Newspaper)",
      bgHex: "#0A0D10",
      dim: 0.62,
      cardBg: "rgba(255,255,255,0.10)",
      cardBorder: "rgba(255,255,255,0.20)",
      accentBg: "rgba(255,255,255,0.14)",
      accentBorder: "rgba(255,255,255,0.28)",
      textMain: "rgba(255,255,255,0.95)",
      textSub: "rgba(255,255,255,0.76)",
      fontTitle: "Crimson Pro, Georgia, serif",
      fontUI: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
    };
  }

  if (style === "nordic") {
    return {
      label: "Nordic (Clean/Scandi)",
      bgHex: "#07121F",
      dim: 0.52,
      cardBg: "rgba(255,255,255,0.06)",
      cardBorder: "rgba(255,255,255,0.16)",
      accentBg: "rgba(6,182,212,0.14)",
      accentBorder: "rgba(6,182,212,0.40)",
      textMain: "rgba(234,255,251,0.96)",
      textSub: "rgba(234,255,251,0.76)",
      fontTitle: "Manrope, Inter, system-ui, -apple-system, Segoe UI, Roboto",
      fontUI: "Manrope, Inter, system-ui, -apple-system, Segoe UI, Roboto",
    };
  }

  // night neon
  return {
    label: "Night Neon (High CTR)",
    bgHex: "#060716",
    dim: 0.56,
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(124,58,237,0.30)",
    accentBg: "rgba(124,58,237,0.22)",
    accentBorder: "rgba(124,58,237,0.56)",
    textMain: "rgba(255,255,255,0.98)",
    textSub: "rgba(255,255,255,0.78)",
    fontTitle: "Space Grotesk, Inter, system-ui, -apple-system, Segoe UI, Roboto",
    fontUI: "Space Grotesk, Inter, system-ui, -apple-system, Segoe UI, Roboto",
  };
}

/* ================= DEFAULT LAYERS (neutral) ================= */

function defaultLayers(format: Format): Layer[] {
  const { H } = artboardSize(format);
  const baseZ = 10;

  const card: BoxLayer = {
    id: uid("box"),
    type: "box",
    name: "Karta (glass)",
    x: 90,
    y: format === "square" ? 140 : 210,
    w: 900,
    h: format === "square" ? 740 : 1040,
    rotation: 0,
    opacity: 1,
    z: baseZ,
    visible: true,
    locked: false,
    bg: "rgba(0,0,0,0.55)",
    border: "rgba(255,255,255,0.16)",
    borderWidth: 1.5,
    radius: 40,
    blur: 10,
  };

  const pillTop: PillLayer = {
    id: uid("pill"),
    type: "pill",
    name: "Badge (miasto)",
    x: 120,
    y: 92,
    w: 780,
    h: 70,
    rotation: 0,
    opacity: 1,
    z: baseZ + 1,
    visible: true,
    locked: false,
    text: "Twoje miasto ��˘ Agent premium",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
    fontSize: 24,
    fontWeight: 900,
    color: "rgba(255,255,255,0.94)",
    bg: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    radius: 999,
    paddingX: 22,
    paddingY: 14,
  };

  const title: TextLayer = {
    id: uid("txt"),
    type: "text",
    name: "Tytu� a",
    x: 150,
    y: format === "square" ? 290 : 380,
    w: 820,
    h: 220,
    rotation: 0,
    opacity: 1,
    z: baseZ + 2,
    visible: true,
    locked: false,
    text: "Bezp� aatna wycena\nnieruchomo� _ci",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
    fontSize: format === "square" ? 86 : 96,
    fontWeight: 900,
    letterSpacing: -1.2,
    lineHeight: 1.04,
    color: "rgba(255,255,255,0.96)",
    align: "left",
  };

  const subtitle: TextLayer = {
    id: uid("txt"),
    type: "text",
    name: "Hook",
    x: 150,
    y: format === "square" ? 575 : 720,
    w: 820,
    h: 150,
    rotation: 0,
    opacity: 1,
    z: baseZ + 3,
    visible: true,
    locked: false,
    text: "Bezp� aatna wycena + plan sprzeda���y\n(bez zobowi&za�)",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
    fontSize: 34,
    fontWeight: 850,
    letterSpacing: -0.2,
    lineHeight: 1.25,
    color: "rgba(255,255,255,0.80)",
    align: "left",
  };

  const cta: PillLayer = {
    id: uid("pill"),
    type: "pill",
    name: "CTA",
    x: 150,
    y: format === "square" ? H - 320 : H - 360,
    w: 560,
    h: 96,
    rotation: 0,
    opacity: 1,
    z: baseZ + 4,
    visible: true,
    locked: false,
    text: "Zostaw kontakt",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
    fontSize: 34,
    fontWeight: 900,
    color: "rgba(255,255,255,0.96)",
    bg: "rgba(255,255,255,0.12)",
    border: "rgba(255,255,255,0.22)",
    borderWidth: 1.2,
    radius: 999,
    paddingX: 28,
    paddingY: 18,
  };

  const footer: TextLayer = {
    id: uid("txt"),
    type: "text",
    name: "Stopka",
    x: 150,
    y: format === "square" ? H - 180 : H - 210,
    w: 860,
    h: 140,
    rotation: 0,
    opacity: 1,
    z: baseZ + 5,
    visible: true,
    locked: false,
    text: "Pawe� a ��˘ Agent nieruchomo� _ci\n=� 9> 500 600 700\n/prospects/form",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
    fontSize: 24,
    fontWeight: 850,
    letterSpacing: -0.1,
    lineHeight: 1.35,
    color: "rgba(255,255,255,0.72)",
    align: "left",
  };

  return [card, pillTop, title, subtitle, cta, footer];
}

/* ================= APPLY STYLE PRESET ================= */

function applyPresetToDesign(style: StylePresetKey, format: Format, prevLayers: Layer[]) {
  const P = preset(style);

  // helper: find by name heuristics
  const byName = (n: string) => prevLayers.find((l) => l.name.toLowerCase().includes(n));

  const card = byName("karta") as BoxLayer | undefined;
  const badge = byName("badge") as PillLayer | undefined;
  const title = byName("tytu� a") as TextLayer | undefined;
  const hook = byName("hook") as TextLayer | undefined;
  const cta = byName("cta") as PillLayer | undefined;
  const footer = byName("stopka") as TextLayer | undefined;

  const next = prevLayers.map((l) => {
    // global mild polish: roundings etc stay
    if (l.type === "box" && l.id === card?.id) {
      return {
        ...l,
        bg: P.cardBg,
        border: P.cardBorder,
        blur: style === "editorial" ? 8 : 10,
      } as BoxLayer;
    }

    if (l.type === "pill" && (l.id === badge?.id || l.id === cta?.id)) {
      const isCta = l.id === cta?.id;
      return {
        ...l,
        fontFamily: P.fontUI,
        color: P.textMain,
        bg: isCta ? P.accentBg : "rgba(255,255,255,0.08)",
        border: isCta ? P.accentBorder : "rgba(255,255,255,0.18)",
      } as PillLayer;
    }

    if (l.type === "text" && (l.id === title?.id || l.id === hook?.id || l.id === footer?.id)) {
      const isTitle = l.id === title?.id;
      const isHook = l.id === hook?.id;

      return {
        ...l,
        fontFamily: isTitle ? P.fontTitle : P.fontUI,
        color: isTitle ? P.textMain : isHook ? P.textSub : "rgba(255,255,255,0.70)",
        letterSpacing: isTitle ? (style === "editorial" ? -0.6 : -1.2) : l.letterSpacing,
        fontWeight: isTitle ? 900 : l.fontWeight,
      } as TextLayer;
    }

    return l;
  });

  // Adjust title size slightly for editorial
  const out = next.map((l) => {
    if (l.type === "text" && l.id === title?.id) {
      return {
        ...l,
        fontSize: format === "square" ? (style === "editorial" ? 82 : 86) : style === "editorial" ? 90 : 96,
        lineHeight: style === "editorial" ? 1.02 : 1.04,
      } as TextLayer;
    }
    return l;
  });

  return { layers: out, preset: P };
}

/* ================= EXPORT SVG ================= */

function exportSvg(args: { format: Format; bg: BgState; layers: Layer[]; bgHex: string }) {
  const { format, bg, layers, bgHex } = args;
  const { W, H } = artboardSize(format);

  const sorted = layers
    .slice()
    .filter((l) => l.visible)
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  let bgBlock = `<rect width="${W}" height="${H}" fill="${bgHex}"/>`;

  if (bg.dataUrl && bg.iw && bg.ih) {
    const r = coverRect(W, H, bg.iw, bg.ih);
    const s = clamp(bg.scale, 1, 3);
    const w = r.w * s;
    const h = r.h * s;
    const x = r.x - (w - r.w) / 2 + bg.offsetX;
    const y = r.y - (h - r.h) / 2 + bg.offsetY;

    bgBlock = `
      <image href="${escapeXml(bg.dataUrl)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>
      <rect width="${W}" height="${H}" fill="rgba(0,0,0,${clamp(bg.dim, 0, 0.85)})"/>
    `;
  } else {
    // fallback gradient-ish
    bgBlock = `
      <rect width="${W}" height="${H}" fill="${bgHex}"/>
      <rect width="${W}" height="${H}" fill="rgba(0,0,0,${clamp(bg.dim, 0, 0.85)})"/>
    `;
  }

  const defs = `
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="rgba(0,0,0,0.55)"/>
    </filter>
    <filter id="softBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>`;

  const body = sorted
    .map((l) => {
      const rot = l.rotation || 0;
      const op = l.opacity ?? 1;

      if (l.type === "box") {
        const rx = l.radius;
        const bw = l.borderWidth;
        const blur = clamp(l.blur, 0, 20);

        return `
          <g opacity="${op}" transform="rotate(${rot} ${l.x + l.w / 2} ${l.y + l.h / 2})">
            ${blur > 0 ? `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${rx}" ry="${rx}" fill="${l.bg}" filter="url(#softBlur)" opacity="0.7"/>` : ""}
            <rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${rx}" ry="${rx}" fill="${l.bg}" filter="url(#shadow)"/>
            <rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${rx}" ry="${rx}" fill="none" stroke="${l.border}" stroke-width="${bw}"/>
          </g>
        `;
      }

      if (l.type === "pill") {
        const padX = l.paddingX;
        const padY = l.paddingY;
        const text = escapeXml(l.text);
        const Wp = l.w > 0 ? l.w : 720;
        const Hp = l.h > 0 ? l.h : l.fontSize + padY * 2;

        return `
          <g opacity="${op}" transform="rotate(${rot} ${l.x + Wp / 2} ${l.y + Hp / 2})">
            <rect x="${l.x}" y="${l.y}" width="${Wp}" height="${Hp}" rx="${l.radius}" ry="${l.radius}"
              fill="${l.bg}" stroke="${l.border}" stroke-width="${l.borderWidth}" filter="url(#shadow)"/>
            <text x="${l.x + padX}" y="${l.y + padY + l.fontSize}"
              font-family="${escapeXml(l.fontFamily)}"
              font-size="${l.fontSize}"
              font-weight="${l.fontWeight}"
              fill="${l.color}">
              ${text}
            </text>
          </g>
        `;
      }

      const anchor = l.align === "center" ? "middle" : l.align === "right" ? "end" : "start";
      const x = l.align === "center" ? l.x + l.w / 2 : l.align === "right" ? l.x + l.w : l.x;
      const lines = (l.text || "").split("\n");
      const lhPx = Math.round(l.fontSize * l.lineHeight);

      return `
        <g opacity="${op}" transform="rotate(${rot} ${l.x + l.w / 2} ${l.y + 20})">
          <text x="${x}" y="${l.y + l.fontSize}" text-anchor="${anchor}"
            font-family="${escapeXml(l.fontFamily)}"
            font-size="${l.fontSize}"
            font-weight="${l.fontWeight}"
            letter-spacing="${l.letterSpacing}"
            fill="${l.color}">
            ${lines
              .map((line, i) => {
                const dy = i === 0 ? 0 : lhPx;
                return `<tspan x="${x}" dy="${i === 0 ? 0 : dy}">${escapeXml(line)}</tspan>`;
              })
              .join("")}
          </text>
        </g>
      `;
    })
    .join("\n");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  ${bgBlock}
  ${body}
</svg>
`.trim();

  return { svg, W, H };
}

/* ================= UI HELPERS ================= */

function ColorPicker({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  // value can be rgba() �� input[type=color] wants hex, so we keep text input + swatches.
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 900, marginBottom: 6, display: "block", color: "var(--text-muted)" }}>{label}</label>
      <input
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 14,
          border: "1px solid var(--border-soft)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text-main)",
          outline: "none",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="np. rgba(255,255,255,0.86) albo #D4AF37"
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {SWATCHES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            title={s}
            style={{
              width: 26,
              height: 26,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: s,
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {helper ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>{helper}</div> : null}
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 900, marginBottom: 6, display: "block", color: "var(--text-muted)" }}>{label}</label>
      <select
        className="input"
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 14,
          border: "1px solid var(--border-soft)",
          background: "rgba(7, 13, 24, 0.72)",
          color: "rgba(234,255,251,0.95)",
          outline: "none",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {FONT_LIBRARY.map((f) => (
          <option key={f.id} value={f.css}>
            {f.label}
          </option>
        ))}
      </select>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>Podgl&d: <span style={{ fontFamily: value, color: "rgba(234,255,251,0.92)" }}>Bezp� aatna wycena</span></div>
    </div>
  );
}

/* ================= MAIN ================= */

export default function ProspectsAdsPage() {
  const [format, setFormat] = useState<Format>("square");

  const [styleKey, setStyleKey] = useState<StylePresetKey>("luxury");

  const [bgHex, setBgHex] = useState("#0B0B0B");
  const [bg, setBg] = useState<BgState>({
    dataUrl: null,
    iw: 0,
    ih: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dim: preset("luxury").dim,
  });

  const [layers, setLayers] = useState<Layer[]>(() => defaultLayers("square"));
  const [activeId, setActiveId] = useState<string | null>(null);

  // drag/resize
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    mode: "move" | "resize";
    origW: number;
    origH: number;
  } | null>(null);

  const { W, H } = artboardSize(format);

  // persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pros_ads_editor_v2");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s?.format) setFormat(s.format);
      if (s?.styleKey) setStyleKey(s.styleKey);
      if (s?.bgHex) setBgHex(s.bgHex);
      if (s?.bg) setBg(s.bg);
      if (Array.isArray(s?.layers) && s.layers.length) setLayers(s.layers);
      if (typeof s?.activeId === "string") setActiveId(s.activeId);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pros_ads_editor_v2",
        JSON.stringify({
          format,
          styleKey,
          bgHex,
          bg,
          layers,
          activeId,
        })
      );
    } catch {}
  }, [format, styleKey, bgHex, bg, layers, activeId]);

  // clamp y on format change
  useEffect(() => {
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        x: clamp(l.x, 0, 1080),
        y: clamp(l.y, 0, format === "square" ? 1080 : 1920),
      }))
    );
  }, [format]);

  const active = useMemo(() => layers.find((l) => l.id === activeId) || null, [layers, activeId]);

  const sortedLayers = useMemo(() => layers.slice().sort((a, b) => (b.z ?? 0) - (a.z ?? 0)), [layers]);

  const exported = useMemo(() => exportSvg({ format, bg, layers, bgHex }), [format, bg, layers, bgHex]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Skopiowano &");
    } catch {
      alert("Nie uda� ao si�� skopiowa �.");
    }
  };

  const onUploadBg = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("Nie uda� ao si�� wczyta � pliku."));
      r.readAsDataURL(file);
    });

    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
      img.onerror = () => reject(new Error("Nie uda� ao si�� odczyta � obrazu."));
      img.src = dataUrl;
    });

    setBg((prev) => ({
      ...prev,
      dataUrl,
      iw: dims.w,
      ih: dims.h,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    }));
  };

  const addText = () => {
    const id = uid("txt");
    const next: TextLayer = {
      id,
      type: "text",
      name: "Nowy tekst",
      x: 160,
      y: 160,
      w: 760,
      h: 120,
      rotation: 0,
      opacity: 1,
      z: (Math.max(...layers.map((l) => l.z || 0)) || 10) + 1,
      visible: true,
      locked: false,
      text: "Nowy tekst",
      fontFamily: preset(styleKey).fontUI,
      fontSize: 48,
      fontWeight: 900,
      letterSpacing: -0.6,
      lineHeight: 1.15,
      color: preset(styleKey).textMain,
      align: "left",
    };
    setLayers((p) => [next, ...p]);
    setActiveId(id);
  };

  const addBox = () => {
    const id = uid("box");
    const next: BoxLayer = {
      id,
      type: "box",
      name: "Nowy box",
      x: 120,
      y: 260,
      w: 840,
      h: 520,
      rotation: 0,
      opacity: 1,
      z: (Math.max(...layers.map((l) => l.z || 0)) || 10) + 1,
      visible: true,
      locked: false,
      bg: preset(styleKey).cardBg,
      border: preset(styleKey).cardBorder,
      borderWidth: 1.5,
      radius: 34,
      blur: 10,
    };
    setLayers((p) => [next, ...p]);
    setActiveId(id);
  };

  const addPill = () => {
    const id = uid("pill");
    const next: PillLayer = {
      id,
      type: "pill",
      name: "Nowy pill",
      x: 160,
      y: 220,
      w: 720,
      h: 84,
      rotation: 0,
      opacity: 1,
      z: (Math.max(...layers.map((l) => l.z || 0)) || 10) + 1,
      visible: true,
      locked: false,
      text: "Nowy pill",
      fontFamily: preset(styleKey).fontUI,
      fontSize: 26,
      fontWeight: 900,
      color: preset(styleKey).textMain,
      bg: preset(styleKey).accentBg,
      border: preset(styleKey).accentBorder,
      borderWidth: 1,
      radius: 999,
      paddingX: 22,
      paddingY: 14,
    };
    setLayers((p) => [next, ...p]);
    setActiveId(id);
  };

  const removeActive = () => {
    if (!activeId) return;
    setLayers((p) => p.filter((l) => l.id !== activeId));
    setActiveId(null);
  };

  const updateActive = (patch: Partial<Layer>) => {
    if (!activeId) return;
    setLayers((p) => p.map((l) => (l.id === activeId ? ({ ...l, ...patch } as any) : l)));
  };

  const moveLayerZ = (id: string, dir: "up" | "down") => {
    setLayers((prev) => {
      const cur = prev.find((l) => l.id === id);
      if (!cur) return prev;
      const delta = dir === "up" ? 1 : -1;
      const nextZ = (cur.z ?? 0) + delta;
      return prev.map((l) => (l.id === id ? { ...l, z: nextZ } : l));
    });
  };

  const applyStyle = (k: StylePresetKey) => {
    const res = applyPresetToDesign(k, format, layers);
    setStyleKey(k);
    setBgHex(res.preset.bgHex);
    setBg((p) => ({ ...p, dim: res.preset.dim }));
    setLayers(res.layers);
  };

  // stage scaling
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const calc = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width / W, rect.height / H);
      setScale(clamp(s, 0.15, 1));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [W, H]);

  const onPointerDownLayer = (e: React.PointerEvent, layer: Layer, mode: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    if (layer.locked) return;
    setActiveId(layer.id);

    const p = { x: e.clientX, y: e.clientY };
    dragRef.current = {
      id: layer.id,
      startX: p.x,
      startY: p.y,
      origX: layer.x,
      origY: layer.y,
      mode,
      origW: layer.w,
      origH: layer.h,
    };

    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  };

  const onPointerMoveStage = (e: React.PointerEvent) => {
    if (!dragRef.current) return;

    const d = dragRef.current;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;

    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== d.id) return l;
        if (d.mode === "move") {
          const nx = clamp(d.origX + dx, 0, 1080);
          const ny = clamp(d.origY + dy, 0, H);
          return { ...l, x: nx, y: ny };
        } else {
          const nw = clamp(d.origW + dx, 40, 1080);
          const nh = clamp(d.origH + dy, 30, H);
          return { ...l, w: nw, h: nh };
        }
      })
    );
  };

  const onPointerUpStage = () => {
    dragRef.current = null;
  };

  return (
    <main className={`mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 ${FONT_VARS_CLASSNAME}`} style={{ color: "var(--text-main)" }}>
      <style>{`
        .ce-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 1024px) { .ce-grid { grid-template-columns: 1.25fr 0.75fr; gap: 16px; } }
        .ce-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .ce-muted { color: var(--text-muted); }
        .ce-layer { border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.03); border-radius: 14px; padding: 10px; }
        .ce-layerActive { border-color: rgba(45,212,191,0.35); background: rgba(45,212,191,0.08); }
        .ce-handle { width: 14px; height: 14px; border-radius: 4px; background: rgba(45,212,191,0.95); position: absolute; right: -7px; bottom: -7px; cursor: nwse-resize; box-shadow: 0 10px 20px rgba(0,0,0,0.35); }
        .ce-outline { outline: 2px solid rgba(45,212,191,0.65); outline-offset: 2px; }
        select.input { color: rgba(234,255,251,0.95); background: rgba(7, 13, 24, 0.72); }
        select.input option { color: #0f172a; background: #ffffff; }
      `}</style>

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>�9</span> Pozyski ��˘ Premium Ads Studio
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            � Edytor kreacji �� presety + pe� ana kontrola
          </h1>
          <p className="mt-2 text-sm ce-muted">Wybierz styl (Luxury/Editorial/Nordic/Night)  � dopracuj r��cznie  � eksport PNG/SVG.</p>
        </div>

        <div className="ce-row">
          <select className="input" style={uiInput()} value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="square">1080��1080 (post)</option>
            <option value="story">1080��1920 (story/reels/tiktok)</option>
          </select>

          <button style={uiBtn()} onClick={addText}>9> � Tekst</button>
          <button style={uiBtn()} onClick={addPill}>9> � CTA/Pill</button>
          <button style={uiBtn()} onClick={addBox}>9> � Box</button>

          <button style={uiBtn(true)} onClick={async () => downloadPngFromSvg(exported.svg, `ad-${styleKey}-${format}.png`, exported.W, exported.H, bgHex)}>
            ����<�9 Eksport PNG
          </button>

          <button style={uiBtn()} onClick={async () => downloadSvg(exported.svg, `ad-${styleKey}-${format}.svg`)}>
            =�  Eksport SVG
          </button>
        </div>
      </div>

      <div className="mt-6 ce-grid">
        {/* LEFT: STAGE */}
        <section className="p-4" style={uiCard()}>
          <div className="ce-row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="text-sm font-extrabold">Podgl&d</div>
              <div className="text-xs ce-muted">Kliknij element, przeci&gnij, zmie� rozmiar uchwytem.</div>
            </div>

            <div className="ce-row">
              <button
                style={uiBtn()}
                onClick={() => {
                  setLayers(defaultLayers(format));
                  setActiveId(null);
                }}
              >
                �ػ Reset layout
              </button>

              <button style={uiBtn()} onClick={() => copy(exported.svg)}>
                =�   Kopiuj SVG
              </button>
            </div>
          </div>

          <div
            ref={wrapRef}
            className="mt-4"
            style={{
              height: 620,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              onPointerMove={onPointerMoveStage}
              onPointerUp={onPointerUpStage}
              onPointerLeave={onPointerUpStage}
              onPointerDown={() => setActiveId(null)}
              style={{
                width: W,
                height: H,
                transformOrigin: "top left",
                transform: `scale(${scale})`,
                position: "absolute",
                left: 12,
                top: 12,
              }}
            >
              <BgLayer bg={bg} format={format} bgHex={bgHex} />

              {layers
                .slice()
                .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
                .map((l) => {
                  const isActive = l.id === activeId;
                  return (
                    <div
                      key={l.id}
                      style={layerStyle(l)}
                      className={isActive ? "ce-outline" : undefined}
                      onPointerDown={(e) => onPointerDownLayer(e, l, "move")}
                    >
                      {l.type === "text" ? <span>{l.text}</span> : null}
                      {l.type === "pill" ? <span>{l.text}</span> : null}
                      {l.type === "box" ? null : null}

                      {!l.locked ? (
                        <div
                          className="ce-handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            onPointerDownLayer(e, l, "resize");
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        {/* RIGHT: CONTROLS */}
        <section className="p-4" style={uiCard()}>
          {/* STYLE PRESETS */}
          <div>
            <div className="text-sm font-extrabold">Style premium</div>
            <div className="mt-2 ce-row">
              {(["luxury", "editorial", "nordic", "night"] as StylePresetKey[]).map((k) => (
                <button
                  key={k}
                  style={uiBtn(k === styleKey)}
                  onClick={() => applyStyle(k)}
                  title={preset(k).label}
                >
                  {preset(k).label}
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs ce-muted">
              Preset ustawia: typografi�� + kolory + ��[karta/CTA. Potem mo���esz r��cznie dopieszcza � wszystko.
            </div>
          </div>

          {/* BG */}
          <div className="mt-6">
            <div className="text-xs font-extrabold ce-muted">T� ao</div>

            <label style={uiLabel()}>Kolor t� aa (fallback)</label>
            <ColorPicker label="" value={bgHex} onChange={setBgHex} helper="U���ywane, gdy nie masz wgranego zdj��cia." />

            <label style={uiLabel()}>Wczytaj zdj��cie t� aa</label>
            <input type="file" accept="image/*" style={uiInput()} onChange={(e) => e.target.files?.[0] && onUploadBg(e.target.files[0])} />

            <div className="mt-3 ce-row">
              <button style={uiBtn()} onClick={() => setBg((p) => ({ ...p, dataUrl: null, iw: 0, ih: 0 }))} disabled={!bg.dataUrl}>
                � � Usu� t� ao
              </button>
              <button style={uiBtn()} onClick={() => setBg((p) => ({ ...p, scale: 1, offsetX: 0, offsetY: 0 }))}>
                 �9<� Reset kadru
              </button>
            </div>

            <label style={uiLabel()}>Dim (przyciemnienie)</label>
            <input type="range" min={0} max={85} value={Math.round(bg.dim * 100)} onChange={(e) => setBg((p) => ({ ...p, dim: Number(e.target.value || 0) / 100 }))} style={{ width: "100%" }} />
            <div className="text-xs ce-muted">Obecnie: {Math.round(bg.dim * 100)}%</div>

            <label style={uiLabel()}>Zoom</label>
            <input type="range" min={100} max={300} value={Math.round(bg.scale * 100)} onChange={(e) => setBg((p) => ({ ...p, scale: Number(e.target.value || 100) / 100 }))} style={{ width: "100%" }} />
            <div className="text-xs ce-muted">Obecnie: {Math.round(bg.scale * 100)}%</div>

            <div className="mt-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={uiLabel()}>Offset X</label>
                <input style={uiInput()} type="number" value={bg.offsetX} onChange={(e) => setBg((p) => ({ ...p, offsetX: Number(e.target.value || 0) }))} />
              </div>
              <div>
                <label style={uiLabel()}>Offset Y</label>
                <input style={uiInput()} type="number" value={bg.offsetY} onChange={(e) => setBg((p) => ({ ...p, offsetY: Number(e.target.value || 0) }))} />
              </div>
            </div>
          </div>

          {/* LAYERS */}
          <div className="mt-6">
            <div className="text-xs font-extrabold ce-muted">Warstwy</div>

            <div className="mt-2" style={{ display: "grid", gap: 10 }}>
              {sortedLayers.map((l) => {
                const on = l.id === activeId;
                return (
                  <div key={l.id} className={`ce-layer ${on ? "ce-layerActive" : ""}`} onClick={() => setActiveId(l.id)} style={{ cursor: "pointer" }}>
                    <div className="ce-row" style={{ justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>
                        {l.name} <span className="ce-muted" style={{ fontWeight: 800 }}>{`(${l.type})`}</span>
                      </div>
                      <div className="ce-row">
                        <button style={uiBtn()} onClick={(e) => { e.stopPropagation(); moveLayerZ(l.id, "up"); }}> � �</button>
                        <button style={uiBtn()} onClick={(e) => { e.stopPropagation(); moveLayerZ(l.id, "down"); }}> �=� </button>
                      </div>
                    </div>

                    <div className="ce-row" style={{ marginTop: 8 }}>
                      <button style={uiBtn()} onClick={(e) => { e.stopPropagation(); setLayers((p) => p.map((x) => (x.id === l.id ? { ...x, visible: !x.visible } : x))); }}>
                        {l.visible ? " �� Widoczny" : "� Ukryty"}
                      </button>

                      <button style={uiBtn()} onClick={(e) => { e.stopPropagation(); setLayers((p) => p.map((x) => (x.id === l.id ? { ...x, locked: !x.locked } : x))); }}>
                        {l.locked ? " Zablok." : "=�  Odblok."}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE EDIT */}
          <div className="mt-6">
            <div className="text-xs font-extrabold ce-muted">Edycja zaznaczonej warstwy</div>

            {!active ? (
              <div className="mt-3 text-sm ce-muted">Kliknij element na podgl&dzie albo wybierz warstw��.</div>
            ) : (
              <div className="mt-3" style={{ display: "grid", gap: 12 }}>
                <div className="ce-row">
                  <button style={uiBtn(false, true)} onClick={removeActive}>� � Usu�</button>
                </div>

                <div>
                  <label style={uiLabel()}>Nazwa</label>
                  <input style={uiInput()} value={active.name} onChange={(e) => updateActive({ name: e.target.value })} />
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <div><label style={uiLabel()}>X</label><input style={uiInput()} type="number" value={active.x} onChange={(e) => updateActive({ x: Number(e.target.value || 0) })} /></div>
                  <div><label style={uiLabel()}>Y</label><input style={uiInput()} type="number" value={active.y} onChange={(e) => updateActive({ y: Number(e.target.value || 0) })} /></div>
                  <div><label style={uiLabel()}>W</label><input style={uiInput()} type="number" value={active.w} onChange={(e) => updateActive({ w: Number(e.target.value || 0) })} /></div>
                  <div><label style={uiLabel()}>H</label><input style={uiInput()} type="number" value={active.h} onChange={(e) => updateActive({ h: Number(e.target.value || 0) })} /></div>
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <label style={uiLabel()}>Opacity</label>
                    <input type="range" min={10} max={100} value={Math.round((active.opacity ?? 1) * 100)} onChange={(e) => updateActive({ opacity: Number(e.target.value || 100) / 100 })} style={{ width: "100%" }} />
                    <div className="text-xs ce-muted">{Math.round((active.opacity ?? 1) * 100)}%</div>
                  </div>
                  <div>
                    <label style={uiLabel()}>Rotation</label>
                    <input style={uiInput()} type="number" value={active.rotation ?? 0} onChange={(e) => updateActive({ rotation: Number(e.target.value || 0) })} />
                  </div>
                </div>

                {active.type === "text" ? (
                  <>
                    <div>
                      <label style={uiLabel()}>Tekst</label>
                      <textarea style={{ ...uiInput(), minHeight: 110 }} value={active.text} onChange={(e) => updateActive({ text: e.target.value })} />
                    </div>

                    <FontSelect label="Font" value={active.fontFamily} onChange={(v) => updateActive({ fontFamily: v })} />

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                      <div><label style={uiLabel()}>Rozmiar</label><input style={uiInput()} type="number" value={active.fontSize} onChange={(e) => updateActive({ fontSize: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Waga</label><input style={uiInput()} type="number" value={active.fontWeight} onChange={(e) => updateActive({ fontWeight: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Line height</label><input style={uiInput()} type="number" step="0.05" value={active.lineHeight} onChange={(e) => updateActive({ lineHeight: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Tracking</label><input style={uiInput()} type="number" step="0.1" value={active.letterSpacing} onChange={(e) => updateActive({ letterSpacing: Number(e.target.value || 0) })} /></div>
                    </div>

                    <ColorPicker label="Kolor tekstu" value={active.color} onChange={(v) => updateActive({ color: v })} />
                  </>
                ) : null}

                {active.type === "pill" ? (
                  <>
                    <div>
                      <label style={uiLabel()}>Tekst</label>
                      <input style={uiInput()} value={active.text} onChange={(e) => updateActive({ text: e.target.value })} />
                    </div>

                    <FontSelect label="Font" value={active.fontFamily} onChange={(v) => updateActive({ fontFamily: v })} />

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                      <div><label style={uiLabel()}>Rozmiar</label><input style={uiInput()} type="number" value={active.fontSize} onChange={(e) => updateActive({ fontSize: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Waga</label><input style={uiInput()} type="number" value={active.fontWeight} onChange={(e) => updateActive({ fontWeight: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Padding X</label><input style={uiInput()} type="number" value={active.paddingX} onChange={(e) => updateActive({ paddingX: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Padding Y</label><input style={uiInput()} type="number" value={active.paddingY} onChange={(e) => updateActive({ paddingY: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Radius</label><input style={uiInput()} type="number" value={active.radius} onChange={(e) => updateActive({ radius: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Border width</label><input style={uiInput()} type="number" step="0.5" value={active.borderWidth} onChange={(e) => updateActive({ borderWidth: Number(e.target.value || 0) })} /></div>
                    </div>

                    <ColorPicker label="Kolor tekstu" value={active.color} onChange={(v) => updateActive({ color: v })} />
                    <ColorPicker label="T� ao (pill)" value={active.bg} onChange={(v) => updateActive({ bg: v })} />
                    <ColorPicker label="Ramka (pill)" value={active.border} onChange={(v) => updateActive({ border: v })} />
                  </>
                ) : null}

                {active.type === "box" ? (
                  <>
                    <ColorPicker label="T� ao (box)" value={active.bg} onChange={(v) => updateActive({ bg: v })} />
                    <ColorPicker label="Ramka (box)" value={active.border} onChange={(v) => updateActive({ border: v })} />

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                      <div><label style={uiLabel()}>Border width</label><input style={uiInput()} type="number" step="0.5" value={active.borderWidth} onChange={(e) => updateActive({ borderWidth: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Radius</label><input style={uiInput()} type="number" value={active.radius} onChange={(e) => updateActive({ radius: Number(e.target.value || 0) })} /></div>
                      <div><label style={uiLabel()}>Blur</label><input style={uiInput()} type="number" value={active.blur} onChange={(e) => updateActive({ blur: Number(e.target.value || 0) })} /></div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ================= RENDER HELPERS ================= */

function layerStyle(layer: Layer): React.CSSProperties {
  if (!layer.visible) return { display: "none" };

  const base: React.CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    transform: `rotate(${layer.rotation || 0}deg)`,
    opacity: layer.opacity ?? 1,
    userSelect: "none",
    boxSizing: "border-box",
    pointerEvents: layer.locked ? "none" : "auto",
  };

  if (layer.type === "box") {
    return {
      ...base,
      background: layer.bg,
      border: `${layer.borderWidth}px solid ${layer.border}`,
      borderRadius: layer.radius,
      backdropFilter: layer.blur > 0 ? `blur(${layer.blur}px)` : undefined,
    };
  }

  if (layer.type === "pill") {
    return {
      ...base,
      width: layer.w || "auto",
      height: layer.h || "auto",
      padding: `${layer.paddingY}px ${layer.paddingX}px`,
      background: layer.bg,
      border: `${layer.borderWidth}px solid ${layer.border}`,
      borderRadius: layer.radius,
      color: layer.color,
      fontFamily: layer.fontFamily,
      fontSize: layer.fontSize,
      fontWeight: layer.fontWeight as any,
      lineHeight: 1.15,
      whiteSpace: "pre-wrap",
      display: "inline-block",
    };
  }

  return {
    ...base,
    color: layer.color,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight as any,
    letterSpacing: `${layer.letterSpacing}px`,
    lineHeight: layer.lineHeight,
    whiteSpace: "pre-wrap",
    textAlign: layer.align,
    width: layer.w,
    height: "auto",
  };
}

function BgLayer({ bg, format, bgHex }: { bg: BgState; format: Format; bgHex: string }) {
  const { W, H } = artboardSize(format);

  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: W,
    height: H,
    overflow: "hidden",
    background: bgHex,
  };

  if (!bg.dataUrl || !bg.iw || !bg.ih) {
    return (
      <div style={base}>
        <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${bg.dim})` }} />
      </div>
    );
  }

  const r = coverRect(W, H, bg.iw, bg.ih);
  const s = clamp(bg.scale, 1, 3);
  const w = r.w * s;
  const h = r.h * s;
  const x = r.x - (w - r.w) / 2 + bg.offsetX;
  const y = r.y - (h - r.h) / 2 + bg.offsetY;

  return (
    <div style={base}>
      <img src={bg.dataUrl} alt="bg" style={{ position: "absolute", left: x, top: y, width: w, height: h, objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${clamp(bg.dim, 0, 0.85)})` }} />
    </div>
  );
}

/* ================= UI STYLE FUNCS ================= */

function uiCard(): React.CSSProperties {
  return {
    background: "var(--bg-card)",
    border: "1px solid var(--border-soft)",
    borderRadius: 18,
  };
}

function uiInput(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid var(--border-soft)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-main)",
    outline: "none",
  };
}

function uiLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
    display: "block",
    color: "var(--text-muted)",
    marginTop: 10,
  };
}

function uiBtn(primary = false, danger = false): React.CSSProperties {
  if (danger) {
    return {
      borderRadius: 14,
      padding: "10px 14px",
      fontWeight: 900,
      fontSize: 13,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.12)",
      color: "rgba(255,220,220,0.95)",
      cursor: "pointer",
    };
  }

  return {
    borderRadius: 14,
    padding: "10px 14px",
    fontWeight: 900,
    fontSize: 13,
    border: primary ? "1px solid rgba(45,212,191,0.35)" : "1px solid rgba(255,255,255,0.14)",
    background: primary ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.06)",
    color: "rgba(234,255,251,0.95)",
    cursor: "pointer",
  };
}