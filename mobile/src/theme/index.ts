import tokens from "./tokens.json";

export { tokens };
export const color = tokens.color;
export type ColorRole = keyof typeof tokens.color;

/** Joint des classes en ignorant les valeurs vides. */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
