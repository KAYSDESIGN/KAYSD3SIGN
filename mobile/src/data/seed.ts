import type { Desire, Prompt } from "./types";

// Contenu écrit pour HotCouple. Rien n'est repris de Space for Two.
const q = (id: string, body: string): Prompt => ({ id, kind: "question", spice_level: "soft", body });
const sq = (id: string, spice_level: Prompt["spice_level"], body: string): Prompt => ({ id, kind: "spicy_question", spice_level, body });

export const SEED_PROMPTS: Prompt[] = [
  q("q01", "Quel moment de cette semaine aimerais-tu revivre avec moi ?"),
  q("q02", "Qu'est-ce que je fais sans m'en rendre compte et qui te fait craquer ?"),
  q("q03", "Si on partait demain, sans bagages, ce serait où ?"),
  q("q04", "Quelle petite chose pourrais-je faire cette semaine pour te faciliter la vie ?"),
  q("q05", "Ton plus beau souvenir de nous, en trois mots ?"),
  q("q06", "Quelle chanson te fait penser à moi, et pourquoi ?"),
  q("q07", "Qu'est-ce que tu n'as jamais osé me demander ?"),
  q("q08", "Le dîner parfait à deux : où, quoi, et après ?"),
  q("q09", "Quel compliment aimerais-tu entendre plus souvent ?"),
  q("q10", "Qu'est-ce qui t'a fait sourire aujourd'hui ?"),
  sq("s01", "soft", "Quel est le baiser dont tu te souviens le mieux ?"),
  sq("s02", "spicy", "Où aimerais-tu que je t'embrasse en premier ce soir ?"),
  sq("s03", "spicy", "Quelle tenue aimerais-tu me voir porter juste pour toi ?"),
  sq("s04", "hot", "Décris en une phrase la soirée dont tu rêves avec moi, sans filtre."),
];

const ch = (id: string, kind: Prompt["kind"], spice_level: Prompt["spice_level"], challenge_kind: Prompt["challenge_kind"], body: string): Prompt =>
  ({ id, kind, spice_level, challenge_kind, body });

export const SEED_CHALLENGES: Prompt[] = [
  ch("c01", "challenge", "soft", "text", "Écris trois choses que tu as adorées chez l'autre cette semaine."),
  ch("c02", "challenge", "soft", "text", "Raconte le moment exact où tu as su que c'était différent avec moi."),
  ch("c03", "challenge", "soft", "text", "Propose un rendez-vous à moins de 20 € pour ce week-end."),
  ch("c04", "challenge", "soft", "text", "Envoie la phrase que tu voudrais entendre en te réveillant demain."),
  ch("c05", "challenge", "soft", "photo", "Une photo de ce que tu vois là, tout de suite."),
  ch("x01", "spicy_challenge", "soft", "text", "Décris le dernier baiser qui t'a donné des frissons."),
  ch("x02", "spicy_challenge", "spicy", "text", "Écris ce que tu vas me murmurer à l'oreille la prochaine fois qu'on se voit."),
  ch("x03", "spicy_challenge", "spicy", "text", "Choisis la playlist de notre prochaine soirée à deux : trois titres."),
  ch("x04", "spicy_challenge", "hot", "text", "Raconte un fantasme, juste les grandes lignes. L'autre peut répondre « oui », « peut-être » ou « non ». "),
];

export const SEED_DESIRES: Desire[] = [
  { id: "d01", category: "Tendresse", spice_level: "soft", body: "Un massage aux huiles, sans se presser", is_premium: false },
  { id: "d02", category: "Tendresse", spice_level: "soft", body: "Un bain à deux, bougies allumées", is_premium: false },
  { id: "d03", category: "Tendresse", spice_level: "soft", body: "Une matinée entière au lit, téléphones éteints", is_premium: false },
  { id: "d04", category: "Jeux", spice_level: "spicy", body: "Un jeu de rôle : deux inconnus qui se rencontrent au bar", is_premium: false },
  { id: "d05", category: "Jeux", spice_level: "spicy", body: "Les yeux bandés, se laisser guider", is_premium: false },
  { id: "d06", category: "Ailleurs", spice_level: "spicy", body: "Une nuit à l'hôtel, juste pour nous, en semaine", is_premium: false },
  { id: "d07", category: "Jeux", spice_level: "spicy", body: "Un strip-poker improvisé", is_premium: true },
  { id: "d08", category: "Audace", spice_level: "hot", body: "Essayer un nouveau jouet ensemble", is_premium: true },
  { id: "d09", category: "Audace", spice_level: "hot", body: "Se filmer, pour nous seuls, puis tout effacer", is_premium: true },
  { id: "d10", category: "Audace", spice_level: "hot", body: "Une soirée où l'un·e décide de tout", is_premium: true },
];
