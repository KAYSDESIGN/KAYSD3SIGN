import tokens from "./tokens.json";

export { tokens };
export type Scheme = "light" | "dark";
export type Palette = "lilas" | "neon" | "coral";
export type ColorRole = keyof typeof tokens.themes.light.color;

let active: Scheme = "light";
let palette: Palette = (tokens.palettes.default as Palette) ?? "lilas";
/** Appelé par ThemeRoot à chaque changement (l'arbre est remonté dans la foulée). */
export function setActiveScheme(s: Scheme) { active = s; }
export function setActivePalette(p: Palette) { palette = p; }
export function activeScheme() { return active; }
export function activePalette() { return palette; }

type PaletteDef = {
  gradient: string[];
  light: { color: Record<string, string>; blobs: string[] };
  dark: { color: Record<string, string>; blobs: string[] };
  art: typeof tokens.art;
};
const pal = (): PaletteDef | null => (palette === "coral" ? null : ((tokens.palettes as unknown as Record<string, PaletteDef>)[palette] ?? null));

/** Couleurs d'un thème avec la palette choisie appliquée par-dessus. */
export function colorsFor(s: Scheme): Record<string, string> {
  return { ...(tokens.themes[s].color as Record<string, string>), ...(pal()?.[s].color ?? {}) };
}

/** Couleurs du thème actif, pour les props qui ne passent pas par les classes (icônes, dégradés…). */
export const color = new Proxy({} as Record<ColorRole, string>, {
  get: (_t, k: string) => colorsFor(active)[k],
});

/** Dégradé de marque de la palette active (3 arrêts). */
export const gradient = new Proxy([] as unknown as [string, string, string], {
  get: (_t, k) => {
    const g = pal()?.gradient ?? tokens.gradient.brand;
    const v = (g as unknown as Record<string | symbol, unknown>)[k];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(g) : v;
  },
});
export const blur = () => tokens.themes[active].blur as { tint: "light" | "dark"; intensity: number; css: string };
export const blobs = () => pal()?.[active].blobs ?? tokens.themes[active].blobs;
export const art = () => pal()?.art ?? tokens.art;

/** Variables CSS d'un thème, au format attendu par nativewind/vars. */
export function themeVars(s: Scheme) {
  return Object.fromEntries(Object.entries(colorsFor(s)).map(([k, v]) => [`--c-${k}`, v]));
}

/** Joint des classes en ignorant les valeurs vides. */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Couleur « flamme » : orange vif, contour orange profond (≥ 3:1 sur les cases claires et sombres). */
export const FLAME = { fill: "#FF8A1E", stroke: "#E8590C" } as const;

/** Rouge du cœur (bouton ❤, pions du morpion), identique dans toutes les palettes. */
export const HEART = "#EE4058";
/** Couleurs des initiales quand il n'y a pas de photo. */
export const AVATAR_COLORS = ["#9C82E8", "#E7738E"] as const;
