// Le thème vient des tokens (src/theme/tokens.json, synchronisé par `npm run tokens`).
// Les composants utilisent les rôles (bg-surface, text-muted…), jamais de hex.
const t = require("./src/theme/tokens.json");

const px = (n) => `${n}px`;
const fontSize = Object.fromEntries(
  Object.entries(t.type).map(([k, v]) => [k, [px(v.size), { lineHeight: px(v.line) }]])
);
const spacing = Object.fromEntries(t.space.map((v, i) => [i, px(v)]));
const borderRadius = Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [k, px(v)]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    // Chaque rôle pointe vers une variable CSS posée par ThemeRoot (clair ou sombre).
    colors: { transparent: "transparent", white: "#FFFFFF", ...Object.fromEntries(Object.keys(t.themes.light.color).map((k) => [k, `var(--c-${k})`])) },
    spacing,
    borderRadius,
    fontSize,
    // Sur mobile, chaque graisse est un fichier : une famille par graisse.
    fontFamily: {
      display: ["Fraunces_600SemiBold"],
      "display-italic": ["Fraunces_600SemiBold_Italic"],
      sans: ["Manrope_500Medium"],
      "sans-semibold": ["Manrope_600SemiBold"],
      "sans-bold": ["Manrope_700Bold"],
    },
    extend: {},
  },
  plugins: [],
};
