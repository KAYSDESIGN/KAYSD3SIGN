// Génère supabase/seed.sql à partir de src/data/seed.ts (une seule source pour le contenu).
// Usage : npx tsx scripts/gen-seed-sql.ts
import { writeFileSync } from "node:fs";
import { SEED_CHALLENGES, SEED_DESIRES, SEED_PROMPTS, SEED_QUIZZES } from "../src/data/seed";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const id = (k: string) => `md5('hotcouple:${k}')::uuid`; // identifiants stables, réexécutable sans doublon
const out: string[] = ["-- Contenu HotCouple (généré, ne pas éditer à la main)", "begin;"];

for (const p of [...SEED_PROMPTS, ...SEED_CHALLENGES]) {
  out.push(`insert into public.prompts (id, kind, challenge_kind, spice_level, locale, body) values (${id(p.id)}, ${q(p.kind)}, ${p.challenge_kind ? q(p.challenge_kind) : "null"}, ${q(p.spice_level)}, 'fr', ${q(p.body)}) on conflict (id) do update set body = excluded.body, spice_level = excluded.spice_level, challenge_kind = excluded.challenge_kind;`);
}
// Contenu retiré du fichier : désactivé (jamais supprimé, des cartes passées y font référence).
out.push(`update public.prompts set active = (id in (${[...SEED_PROMPTS, ...SEED_CHALLENGES].map((p) => id(p.id)).join(", ")}));`);
for (const d of SEED_DESIRES) {
  out.push(`insert into public.desires (id, locale, category, spice_level, body, is_premium) values (${id(d.id)}, 'fr', ${q(d.category)}, ${q(d.spice_level)}, ${q(d.body)}, ${d.is_premium}) on conflict (id) do update set body = excluded.body, category = excluded.category, spice_level = excluded.spice_level, is_premium = excluded.is_premium;`);
}
for (const z of SEED_QUIZZES) {
  out.push(`insert into public.quizzes (id, title, blurb, locale, spice_level, is_premium) values (${id(z.id)}, ${q(z.title)}, ${q(z.blurb)}, 'fr', ${q(z.spice_level)}, ${z.is_premium}) on conflict (id) do update set title = excluded.title, blurb = excluded.blurb, spice_level = excluded.spice_level, is_premium = excluded.is_premium;`);
  z.questions.forEach((qq, i) => {
    out.push(`insert into public.quiz_questions (id, quiz_id, position, body, choices) values (${id(qq.id)}, ${id(z.id)}, ${i + 1}, ${q(qq.body)}, ${q(JSON.stringify(qq.choices))}::jsonb) on conflict (id) do update set body = excluded.body, choices = excluded.choices, position = excluded.position;`);
  });
}
out.push("commit;", "");
writeFileSync(new URL("../../supabase/seed.sql", import.meta.url), out.join("\n"));
console.log(`seed.sql : ${out.length - 3} lignes`);
