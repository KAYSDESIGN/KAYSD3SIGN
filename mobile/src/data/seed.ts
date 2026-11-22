import type { Desire, Prompt, Quiz } from "./types";

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


export const SEED_QUIZZES: Quiz[] = [
  { id: "z1", title: "Nos petites habitudes", blurb: "Le quotidien à deux, plusieurs réponses possibles.", spice_level: "soft", is_premium: false, questions: [
    { id: "z1q1", body: "Le dimanche idéal commence par…", choices: ["Une grasse matinée", "Un café au lit", "Un footing", "Un brunch dehors"] },
    { id: "z1q2", body: "En cas de dispute, on…", choices: ["En parle tout de suite", "Laisse retomber", "Rigole pour désamorcer", "S'écrit un message"] },
    { id: "z1q3", body: "Le cadeau qui touche le plus :", choices: ["Fait main", "Une expérience", "Une surprise", "Un mot écrit"] },
    { id: "z1q4", body: "En vacances, on préfère…", choices: ["La plage", "La ville", "La montagne", "Partir à l'aventure"] },
    { id: "z1q5", body: "Le soir, en semaine :", choices: ["Série sous la couette", "Dîner cuisiné ensemble", "Sortie improvisée", "Chacun son truc, côte à côte"] },
  ]},
  { id: "z2", title: "Ce qui nous fait vibrer", blurb: "Séduction et envies, plusieurs réponses possibles.", spice_level: "spicy", is_premium: false, questions: [
    { id: "z2q1", body: "Les moments qui me mettent dans l'ambiance :", choices: ["Le matin au réveil", "La pause de midi", "En fin de soirée", "Au milieu de la nuit", "Sous la douche"] },
    { id: "z2q2", body: "Ce qui allume la mèche chez moi :", choices: ["Un regard appuyé", "Un message osé", "Un compliment", "Un geste tendre", "Un baiser dans le cou"] },
    { id: "z2q3", body: "Les tenues qui me font craquer :", choices: ["Chemise entrouverte", "Lingerie", "Rien du tout", "Un pyjama tout doux", "Une tenue de soirée"] },
    { id: "z2q4", body: "Les endroits dont je rêve avec toi :", choices: ["Une chambre d'hôtel", "La salle de bain", "Une plage déserte", "Le canapé", "La voiture"] },
    { id: "z2q5", body: "Pour faire monter la température, j'aime :", choices: ["Les préliminaires qui durent", "Les mots doux à l'oreille", "La musique d'ambiance", "Les massages", "L'effet de surprise"] },
  ]},
  { id: "z3", title: "Jusqu'où on ose", blurb: "Le quiz Brûlant, plusieurs réponses possibles.", spice_level: "hot", is_premium: true, questions: [
    { id: "z3q1", body: "Prendre les commandes, pour moi c'est :", choices: ["Mon truc", "Ton truc", "Chacun son tour", "Jamais essayé", "À tester"] },
    { id: "z3q2", body: "Les jouets à deux :", choices: ["Oui, vite", "Pourquoi pas", "Plus tard", "Non merci", "Déjà conquis·e"] },
    { id: "z3q3", body: "Dire ses envies à voix haute :", choices: ["Facile", "Gênant mais excitant", "Plutôt par écrit", "Très difficile", "Seulement dans le feu de l'action"] },
    { id: "z3q4", body: "Ce que j'aimerais essayer :", choices: ["Les yeux bandés", "Les liens doux", "Le jeu de rôle", "Un lieu inattendu", "Prendre notre temps toute une nuit"] },
    { id: "z3q5", body: "Mon fantasme du moment tient plutôt de :", choices: ["La surprise totale", "Le scénario préparé", "La domination douce", "La lenteur extrême", "L'improvisation"] },
  ]},
];

/** Dés coquins : texte non explicite, du plus doux au plus osé. */
export const DICE = {
  soft: { actions: ["Embrasse", "Caresse", "Souffle sur", "Masse"], zones: ["la nuque", "les mains", "le dos", "les épaules", "le front", "le creux du poignet"] },
  spicy: { actions: ["Embrasse", "Mordille", "Caresse", "Effleure du bout des lèvres"], zones: ["le cou", "l'oreille", "le ventre", "l'intérieur du poignet", "le bas du dos", "les lèvres"] },
  hot: { actions: ["Embrasse", "Mordille", "Déshabille lentement", "Explore", "Taquine"], zones: ["le cou", "le ventre", "les cuisses", "le creux des reins", "où tu veux", "là où l'autre te guide"] },
  timers: [30, 60, 90, 120],
} as const;
