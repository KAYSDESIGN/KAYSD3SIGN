// Source unique des tokens : ../replica/design/tokens.json (deux thèmes : light, dark).
// Copie-les dans l'app et régénère replica/design/tokens.css (variables CSS pour le site).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(resolve(here, "../../replica/design/tokens.json"), "utf8"));
writeFileSync(resolve(here, "../src/theme/tokens.json"), JSON.stringify(tokens, null, 2) + "\n");

const vars = (theme) => Object.entries(tokens.themes[theme].color).map(([k, v]) => `  --c-${k}: ${v};`);
const shared = [
  ...tokens.gradient.brand.map((c, i) => `  --grad-${i}: ${c};`),
  ...Object.entries(tokens.font).map(([k, v]) => `  --font-${k}: ${v};`),
  ...Object.entries(tokens.radius).map(([k, v]) => `  --radius-${k}: ${v}px;`),
];
const css = [":root {", "  color-scheme: light dark;", ...vars("light"), ...shared, "}",
  "@media (prefers-color-scheme: dark) {", "  :root {", ...vars("dark").map((l) => "  " + l), "  }", "}", ""].join("\n");
writeFileSync(resolve(here, "../../replica/design/tokens.css"), css);
console.log("tokens synced");
