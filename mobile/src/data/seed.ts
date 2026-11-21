import type { Prompt } from "./types";

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
