import { useEffect, useState, type ReactNode } from "react";
import { Platform, useColorScheme, View } from "react-native";
import { vars } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { activePalette, color, setActivePalette, setActiveScheme, themeVars, type Scheme } from "@/theme";
import { usePalettePref, useThemePref } from "@/theme/preference";

/** Réglage clair/sombre du téléphone. Sur le web, on lit directement le navigateur (après l'hydratation). */
function useScheme(): Scheme {
  const native = useColorScheme();
  const [web, setWeb] = useState<Scheme | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setWeb(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  if (Platform.OS === "web") return web ?? "light";
  return native === "dark" ? "dark" : "light";
}

/** Thème clair le jour, sombre le soir : on suit le téléphone. Changer de thème remonte l'arbre. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const system = useScheme();
  const pref = useThemePref();
  const scheme: Scheme = pref === "auto" ? system : pref;
  const palette = usePalettePref();
  setActiveScheme(scheme);
  setActivePalette(palette);
  // web : la feuille de style du verre suit le thème choisi (et pas seulement celui du téléphone)
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") { document.documentElement.dataset.scheme = scheme; document.documentElement.dataset.palette = activePalette(); }
  }, [scheme, palette]);
  return (
    <View key={`${scheme}-${palette}`} style={[{ flex: 1, backgroundColor: color.bg }, vars(themeVars(scheme))]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </View>
  );
}
