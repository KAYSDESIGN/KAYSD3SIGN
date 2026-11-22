import { useEffect, useState, type ReactNode } from "react";
import { Platform, useColorScheme, View } from "react-native";
import { vars } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { color, setActiveScheme, themeVars, type Scheme } from "@/theme";

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
  const scheme = useScheme();
  setActiveScheme(scheme);
  return (
    <View key={scheme} style={[{ flex: 1, backgroundColor: color.bg }, vars(themeVars(scheme))]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </View>
  );
}
