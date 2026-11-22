// Vérifie le contraste des deux thèmes avec contrast.py (pack Replica) ou, à défaut, un calcul intégré.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(resolve(here, "../../replica/design/tokens.json"), "utf8"));
const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const NEED = { normal: 4.5, large: 3, ui: 3 };
// Couleurs translucides : on calcule le pire cas opaque = verre posé sur la tache de fond la plus claire.
const rgba = (c) => { if (c.startsWith("#")) return [...hex(c), 1]; const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; };
const over = (top, under) => { const [r, g, b, a] = rgba(top); const [R, G, B] = rgba(under); return "#" + [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)].map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""); };
function worstCases(theme) {
  const c = theme.color;
  const peaks = theme.blobs.map((b) => over(b, c.bg));
  const brightest = peaks.sort((x, y) => lum(hex(y)) - lum(hex(x)))[0];
  const darkest = peaks.sort((x, y) => lum(hex(x)) - lum(hex(y)))[0];
  const dark = lum(hex(c.text)) > 0.5; // texte clair = thème sombre : le pire fond est le plus clair
  const base = dark ? brightest : darkest;
  return { "surface-worst": over(c.surface, base), "raised-worst": over(c["surface-raised"], base),
    "accent-soft-worst": over(c["accent-soft"], over(c.surface, base)), "tabbar-worst": over(c["tab-bar"], base) };
}
let fails = 0;
for (const name of ["light", "dark"]) {
  const cols = { ...t.themes[name].color, ...worstCases(t.themes[name]) };
  console.log(`\n${name} — pires fonds : ${JSON.stringify(worstCases(t.themes[name]))}`);
  t.gradient.brand.forEach((c, i) => (cols[`grad-${i}`] = c));
  for (const [fg, bg, size = "normal"] of [...t.pairs.both, ...(t.pairs[name] ?? [])]) {
    const a = cols[fg], b = cols[bg];
    if (!a?.startsWith("#") || !b?.startsWith("#")) { console.log(`  ??   ${fg} on ${bg}`); fails++; continue; }
    const r = ratio(a, b); const ok = r >= NEED[size];
    if (!ok) fails++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${r.toFixed(2).padStart(5)}:1  ${fg} on ${bg}${size !== "normal" ? ` (${size})` : ""}`);
  }
}
console.log(`\n${fails} échec(s)`);
process.exit(fails ? 1 : 0);
