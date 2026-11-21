// Source unique des tokens : ../replica/design/tokens.json
// Copie-les dans l'app et régénère replica/design/tokens.css (pour le site web).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../replica/design/tokens.json");
const tokens = JSON.parse(readFileSync(src, "utf8"));

writeFileSync(resolve(here, "../src/theme/tokens.json"), JSON.stringify(tokens, null, 2) + "\n");

const lines = [":root {", "  color-scheme: dark;"];
for (const [k, v] of Object.entries(tokens.color)) lines.push(`  --color-${k}: ${v};`);
for (const [k, v] of Object.entries(tokens.font)) lines.push(`  --font-${k}: ${v};`);
for (const [k, t] of Object.entries(tokens.type)) {
  lines.push(`  --text-${k}: ${t.size}px;`, `  --leading-${k}: ${t.line}px;`, `  --weight-${k}: ${t.weight};`);
}
tokens.space.forEach((v, i) => lines.push(`  --space-${i}: ${v}px;`));
for (const [k, v] of Object.entries(tokens.radius)) lines.push(`  --radius-${k}: ${v}px;`);
for (const [k, v] of Object.entries(tokens.shadow)) lines.push(`  --shadow-${k}: ${v};`);
for (const [k, v] of Object.entries(tokens.motion)) if (k !== "spring") lines.push(`  --motion-${k}: ${v};`);
lines.push("}", "");
writeFileSync(resolve(here, "../../replica/design/tokens.css"), lines.join("\n"));
console.log("tokens synced");
