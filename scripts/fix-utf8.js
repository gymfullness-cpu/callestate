// scripts/fix-utf8.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "app");
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile() && exts.has(path.extname(p))) out.push(p);
  }
  return out;
}

// “krzaki” które typowo oznaczają zły encoding (mojibake)
const BAD_RE = /(Ĺ|Ä|Å|â|đź|<U\+|Â¤|Â§|â‚¬|â„|Ä🏠|Â¸|Ĺą|Äą)/g;

function badCount(s) {
  const m = s.match(BAD_RE);
  return m ? m.length : 0;
}

// Konkretne frazy (Twoje realne przypadki)
const FIXES = [
  ["OGĹOSZENIE", "OGŁOSZENIE"],
  ["WYĹć„CZNIE", "WYŁĄCZNIE"],
  ["WYÄąÂćâ€žCZNIE", "WYŁĄCZNIE"],
  ["ZwrÄ‚łcenie", "Zwrócenie"],
  ["Nieoczekiwany bÄąâ€šć…d", "Nieoczekiwany błąd"],

  ["”’ Obawa przed wyÄąâ€šć…cznoÄąâ€şcić…", "💭 Obawa przed wyłącznością"],
  ["📊 Ĺ Tylko otwarta", "📊 Tylko otwarta"],
  ["Â¤” Muszćâ„˘ sićâ„˘ zastanowićâ€ˇ", "🤔 Muszę się zastanowić"],
  ["â„˘… Bez poÄąâ€şrednika", "🌿 Bez pośrednika"],
  ["â€Ä„ Wielu agentÄ‚łw", "👥 Wielu agentów"],
  ["ĹąÂ·Ä🏠Â¸Ĺą Cena", "💲 Cena"],
  ["Â¤ĹĄ Zaufanie", "🤝 Zaufanie"],
  ["Â±Ä🏠Â¸Ĺą Timing", "⏱️ Timing"],
  ["WartoÄąâ€şćâ€ˇ", "Wartość"],
  ["Domknićâ„˘cie", "Domknięcie"],

  // cudzysłowy z mojibake
  ["â‚¬Ĺľ", "„"],
  ["â‚¬ĹĄ", "”"],
];

// Typowe pojedyncze znaki mojibake
const CHAR_FIXES = [
  ["Å‚", "ł"],
  ["Å„", "ń"],
  ["Å›", "ś"],
  ["Å¼", "ż"],
  ["Åº", "ź"],
  ["Ä‡", "ć"],
  ["Ä™", "ę"],
  ["Ä…", "ą"],
  ["Ã³", "ó"],

  ["â€¦", "…"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["â†’", "→"],
  ["â€ž", "„"],
  ["â€ť", "”"],
  ["â€ś", "“"],
  ["â€™", "’"],
  ["â€", "†"],

  // “Â” wtrącone przez złe dekodowanie
  ["Â", ""],
];

function stripControlJunk(s) {
  // usuwa znaki kontrolne poza tab/newline/CR
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function applyFixes(text) {
  let s = text;

  for (const [from, to] of FIXES) {
    if (s.includes(from)) s = s.split(from).join(to);
  }

  for (const [from, to] of CHAR_FIXES) {
    if (s.includes(from)) s = s.split(from).join(to);
  }

  s = stripControlJunk(s);
  return s;
}

// Klucz: próba naprawy mojibake “latin1 → utf8”
// To często idealnie odkręca takie krzaki jak u Ciebie
function latin1ToUtf8(s) {
  return Buffer.from(s, "latin1").toString("utf8");
}

const files = walk(ROOT);
let changed = 0;
let stillBad = [];

for (const file of files) {
  const orig = fs.readFileSync(file, "utf8");

  // wariant A: tylko podmiany
  const a = applyFixes(orig);

  // wariant B: najpierw “odkręć” mojibake latin1→utf8, potem podmiany
  const b0 = latin1ToUtf8(orig);
  const b = applyFixes(b0);

  // wybierz najlepszy wariant (mniej krzaków)
  const origBad = badCount(orig);
  const aBad = badCount(a);
  const bBad = badCount(b);

  let best = orig;
  let bestBad = origBad;

  if (aBad < bestBad) {
    best = a;
    bestBad = aBad;
  }
  if (bBad < bestBad) {
    best = b;
    bestBad = bBad;
  }

  if (best !== orig) {
    fs.writeFileSync(file, best, "utf8");
    console.log("Fixed:", path.relative(process.cwd(), file), `(bad ${origBad} → ${bestBad})`);
    changed++;
  }

  if (bestBad > 0) {
    stillBad.push(path.relative(process.cwd(), file));
  }
}

console.log(`\nDone. Changed: ${changed}/${files.length}`);
if (stillBad.length) {
  console.log("\nStill suspicious files:");
  for (const f of stillBad.slice(0, 80)) console.log(" -", f);
  if (stillBad.length > 80) console.log(` ... and ${stillBad.length - 80} more`);
} else {
  console.log("\n✅ No suspicious mojibake left under app/");
}
