import tokens from "./tokens.json";

export { tokens };
export type Scheme = "light" | "dark";
export type ColorRole = keyof typeof tokens.themes.light.color;

let active: Scheme = "light";
/** Appelé par ThemeRoot à chaque changement clair/sombre (l'arbre est remonté dans la foulée). */
export function setActiveScheme(s: Scheme) { active = s; }
export function activeScheme() { return active; }

/** Couleurs du thème actif, pour les props qui ne passent pas par les classes (icônes, gradients…). */
export const color = new Proxy({} as Record<ColorRole, string>, {
  get: (_t, k: string) => (tokens.themes[active].color as Record<string, string>)[k],
});

export const gradient = tokens.gradient.brand as [string, string, string];
export const blur = () => tokens.themes[active].blur as { tint: "light" | "dark"; intensity: number };
export const blobs = () => tokens.themes[active].blobs;

/** Variables CSS d'un thème, au format attendu par nativewind/vars. */
export function themeVars(s: Scheme) {
  return Object.fromEntries(Object.entries(tokens.themes[s].color).map(([k, v]) => [`--c-${k}`, v]));
}

/** Joint des classes en ignorant les valeurs vides. */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Couleur « flamme » : orange vif, contour orange profond (≥ 3:1 sur les cases claires et sombres). */
export const FLAME = { fill: "#FF8A1E", stroke: "#E8590C" } as const;
