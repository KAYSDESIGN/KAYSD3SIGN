import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Glass } from "@/components/ui";
import { color } from "@/theme";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
}

/** Bouton retour : rond, en verre, en haut à gauche. */
export function BackButton() {
  return (
    <Glass radius={999} shadow={false} style={{ width: 40, height: 40 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBack} className="flex-1 items-center justify-center active:opacity-70">
        <View><ChevronLeft size={24} color={color.text} strokeWidth={2.4} /></View>
      </Pressable>
    </Glass>
  );
}

/**
 * Glisser depuis le bord gauche pour revenir en arrière (comme sur iPhone).
 * Web : on écoute le geste au niveau de la page (doigt ou souris). Appli installée : la navigation native s'en charge.
 */
export function EdgeSwipeBack() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    let start: { x: number; y: number } | null = null;
    let last: { x: number; y: number } | null = null;
    const begin = (x: number, y: number) => { start = x <= 28 ? { x, y } : null; last = start; };
    const move = (x: number, y: number) => { if (start) last = { x, y }; };
    const end = () => {
      if (start && last) {
        const dx = last.x - start.x, dy = Math.abs(last.y - start.y);
        if (dx > 70 && dy < 90) { Haptics.selectionAsync().catch(() => {}); goBack(); }
      }
      start = null; last = null;
    };
    // doigt : événements tactiles (le navigateur annule les « pointer » quand il prend la main sur le geste)
    const ts = (e: TouchEvent) => { const t = e.touches[0]; if (t) begin(t.clientX, t.clientY); };
    const tm = (e: TouchEvent) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); };
    // souris
    const pd = (e: PointerEvent) => { if (e.pointerType === "mouse") begin(e.clientX, e.clientY); };
    const pm = (e: PointerEvent) => { if (e.pointerType === "mouse") move(e.clientX, e.clientY); };
    const pu = (e: PointerEvent) => { if (e.pointerType === "mouse") end(); };
    const opts = { capture: true, passive: true } as AddEventListenerOptions;
    window.addEventListener("touchstart", ts, opts); window.addEventListener("touchmove", tm, opts);
    window.addEventListener("touchend", end, opts); window.addEventListener("touchcancel", end, opts);
    window.addEventListener("pointerdown", pd, true); window.addEventListener("pointermove", pm, true); window.addEventListener("pointerup", pu, true);
    return () => {
      window.removeEventListener("touchstart", ts, opts); window.removeEventListener("touchmove", tm, opts);
      window.removeEventListener("touchend", end, opts); window.removeEventListener("touchcancel", end, opts);
      window.removeEventListener("pointerdown", pd, true); window.removeEventListener("pointermove", pm, true); window.removeEventListener("pointerup", pu, true);
    };
  }, []);
  return null;
}

/** Vrai si l'écran a un écran précédent dans sa pile (pas pour les onglets). */
export function useCanGoBack() {
  const nav = useNavigation();
  try { return nav.canGoBack(); } catch { return false; }
}
