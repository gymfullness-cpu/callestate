?import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PropertyLike = {
  id: string | number;
  title: string;
  city: string;
  district?: string;
  street?: string;
  apartmentNumber?: string;

  price: number;
  area: number;

  rooms?: number;
  bathrooms?: number;
  floor?: string | number;
  year?: string | number;

  rent?: number;
  parking?: string;

  winda?: boolean;
  balkon?: boolean;
  loggia?: boolean;
  piwnica?: boolean;
  komorka?: boolean;

  ownership?: string;
  description?: string;

  images: string[];
};

function formatMoneyPLN(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("pl-PL").format(safe) + " zB";
  } catch {
    return `${safe} zB`;
  }
}

function safeText(v: any) {
  return (v ?? "").toString();
}

function clampText(s: string, max = 160) {
  const t = safeText(s).trim();
  return t.length > max ? t.slice(0, max - 1) + "��" : t;
}

async function addImageSafe(
  doc: jsPDF,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!src) return false;

  if (src.startsWith("data:image/")) {
    const format = src.includes("image/png") ? "PNG" : "JPEG";
    doc.addImage(src, format as any, x, y, w, h, undefined, "FAST");
    return true;
  }

  try {
    const res = await fetch(src, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

    const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
    doc.addImage(dataUrl, format as any, x, y, w, h, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

export async function generatePropertyPdf(property: PropertyLike) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  // fonty z /public/fonts (PL znaki)
  const toBase64 = async (url: string) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const interRegular = await toBase64("/fonts/Inter-Regular.ttf");
  const interBold = await toBase64("/fonts/Inter-Bold.ttf");

  (doc as any).addFileToVFS("Inter-Regular.ttf", interRegular);
  (doc as any).addFont("Inter-Regular.ttf", "Inter", "normal");
  (doc as any).addFileToVFS("Inter-Bold.ttf", interBold);
  (doc as any).addFont("Inter-Bold.ttf", "Inter", "bold");
  doc.setFont("Inter", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const NAVY = [12, 25, 54] as const;
  const ACCENT = [59, 130, 246] as const;
  const SOFT = [245, 247, 255] as const;
  const TEXT = [25, 25, 25] as const;
  const MUTED = [95, 95, 95] as const;

  const addressInline = [
    safeText(property.city),
    property.district ? safeText(property.district) : "",
    property.street ? safeText(property.street) : "",
    property.apartmentNumber ? `Nr ${safeText(property.apartmentNumber)}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const pricePerM2 = property.area > 0 ? Math.round(property.price / property.area) : 0;

  // --- HEADER (granat + prawa kolumna cena)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageW, 42, "F");

  const priceBoxW = 78;
  const priceBoxH = 26;
  const priceBoxX = pageW - margin - priceBoxW;
  const priceBoxY = 10;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(priceBoxX, priceBoxY, priceBoxW, priceBoxH, 4, 4, "F");

  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text(formatMoneyPLN(property.price), priceBoxX + 5, priceBoxY + 11, { maxWidth: priceBoxW - 10 });

  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.text(`Cena za m�: ${formatMoneyPLN(pricePerM2)}`, priceBoxX + 5, priceBoxY + 19);

  // lewa cz"[! meta
  doc.setTextColor(255, 255, 255);
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text("OFERTA NIERUCHOMO9aCI", margin, 16);

  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.text(`ID: ${safeText(property.id)}`, margin, 26);
  doc.text(`d ${addressInline}`, margin, 35, { maxWidth: contentW - priceBoxW - 10 });

  // --- KARTA TYTU9�U (biaBa, pod nagB�wkiem)
  let y = 56;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y - 10, contentW, 18, 4, 4, "F");

  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.setFont("Inter", "bold");
  doc.setFontSize(16);

  const titleCardLines = doc.splitTextToSize(clampText(property.title, 140), contentW - 8);
  doc.text(titleCardLines, margin + 4, y + 2);

  y += titleCardLines.length * 7 + 14;

  // --- MAIN IMAGE
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  const imgBoxH = 74;
  doc.roundedRect(margin, y, contentW, imgBoxH, 4, 4, "F");

  const mainImg = property.images?.[0] || "";
  const imgOk = await addImageSafe(doc, mainImg, margin + 2, y + 2, contentW - 4, imgBoxH - 4);

  if (!imgOk) {
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("Inter", "normal");
    doc.setFontSize(10);
    doc.text(
      "Zdj"cie nie mogBo zosta! osadzone (CORS). Je[li to link  u|yj hostingu z CORS lub zapisuj zdj"cia jako base64.",
      margin + 6,
      y + 34,
      { maxWidth: contentW - 12 }
    );
  }

  y += imgBoxH + 10;

  // --- DETAILS
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text("Szczeg�By nieruchomo[ci", margin, y);
  y += 6;

  const detailsRows: Array<[string, string]> = [
    ["Metra|", `${safeText(property.area)} m�`],
    ["Pokoje", safeText(property.rooms ?? "")],
    ["9�azienki", safeText(property.bathrooms ?? "")],
    ["Pi"tro", safeText(property.floor ?? "")],
    ["Rok budowy", safeText(property.year ?? "")],
    ["Czynsz", property.rent ? `${safeText(property.rent)} zB` : ""],
    ["Parking", safeText(property.parking ?? "")],
    ["Winda", property.winda ? "Tak" : "Nie"],
    ["Balkon", property.balkon ? "Tak" : "Nie"],
    ["Loggia", property.loggia ? "Tak" : "Nie"],
    ["Piwnica", property.piwnica ? "Tak" : "Nie"],
    ["Kom�rka", property.komorka ? "Tak" : "Nie"],
    ["Stan prawny", safeText(property.ownership ?? "")],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Parametr", "Warto[!"]],
    body: detailsRows,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: "Inter",
      fontStyle: "normal",
      fontSize: 9,
      cellPadding: 3,
      textColor: TEXT as any,
      overflow: "linebreak",
    },
    headStyles: { fillColor: NAVY as any, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: SOFT as any },
  });

  const afterTableY = (doc as any).lastAutoTable?.finalY ?? y + 40;

  // --- DESCRIPTION
  let descY = afterTableY + 12;
  if (descY > pageH - 55) {
    doc.addPage();
    descY = 20;
  }

  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text("Opis", margin, descY);
  descY += 8;

  doc.setTextColor(40, 40, 40);
  doc.setFont("Inter", "normal");
  doc.setFontSize(10);

  const desc = safeText(property.description || "");
  const descLines = doc.splitTextToSize(desc, contentW);
  doc.text(descLines, margin, descY);

  // --- GALLERY (reszta zdj"! na sam d�B)
  const galleryImages = (property.images || []).slice(1);
  const descHeight = descLines.length * 5.2;
  let gY = descY + descHeight + 12;

  if (gY > pageH - 40) {
    doc.addPage();
    gY = 20;
  }

  if (galleryImages.length > 0) {
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setFont("Inter", "bold");
    doc.setFontSize(12);
    doc.text("Galeria zdj"!", margin, gY);
    gY += 8;

    const cols = 2;
    const gap = 4;
    const cellW = (contentW - gap) / cols;
    const cellH = 58;

    let x = margin;
    let col = 0;

    for (let i = 0; i < galleryImages.length; i++) {
      if (gY + cellH > pageH - 18) {
        doc.addPage();
        gY = 20;

        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.setFont("Inter", "bold");
        doc.setFontSize(12);
        doc.text("Galeria zdj"! (ci&g dalszy)", margin, gY);
        gY += 8;

        x = margin;
        col = 0;
      }

      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.roundedRect(x, gY, cellW, cellH, 3, 3, "F");

      // eslint-disable-next-line no-await-in-loop
      await addImageSafe(doc, galleryImages[i], x + 1, gY + 1, cellW - 2, cellH - 2);

      col++;
      if (col >= cols) {
        col = 0;
        x = margin;
        gY += cellH + gap;
      } else {
        x += cellW + gap;
      }
    }
  }

  // --- FOOTER (na ka|dej stronie)
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageH - 10;

    doc.setDrawColor(220);
    doc.line(margin, footerY - 6, pageW - margin, footerY - 6);

    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.text(`Wygenerowano w Real Estate App �� Strona ${p}/${totalPages}`, margin, footerY);
  }

  doc.save(`oferta_${safeText(property.id)}.pdf`);
}
