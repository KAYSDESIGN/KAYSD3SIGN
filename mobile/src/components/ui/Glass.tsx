import type React from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Image, Platform, StyleSheet, useWindowDimensions, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { activePalette, activeScheme, blobs, blur, color, cx, gradient, isEditorial } from "@/theme";

const fill = StyleSheet.absoluteFill;
const IOS_LIQUID = Platform.OS === "ios" && (() => { try { return isLiquidGlassAvailable() && isGlassEffectAPIAvailable(); } catch { return false; } })();

/**
 * Lumière du verre façon iOS : bords épais et lumineux (haut et bas), liseré fin, ombre douce.
 * (Sur le web, la classe CSS « lg » fait la même chose avec en plus le flou d'arrière-plan.)
 */
export function glassLight(opts: { lift?: boolean; glow?: boolean } = {}) {
  const dark = activeScheme() === "dark";
  const rim = dark
    ? "inset 0 2px 1.5px rgba(255,255,255,0.6), inset 0 -2px 2px rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.14)"
    : "inset 0 2.5px 1.5px rgba(255,255,255,0.95), inset 0 -2px 2px rgba(255,255,255,0.65), inset 0 0 0 1px rgba(255,255,255,0.35)";
  const drop = dark ? "0 8px 22px rgba(0,0,0,0.5)" : "0 8px 22px rgba(40,25,60,0.16)";
  return { boxShadow: `${rim}${opts.lift === false ? "" : `, ${drop}`}` } as const;
}
export const glassShadow = (_strong = false) => glassLight({ lift: true });

export type GlassTone = "clear" | "bright" | "smoke" | "tinted";
/** Styles du Liquid Glass d'Apple : « regular » pour les contrôles, « clear » sur photos et médias riches. */
export type GlassVariant = "regular" | "clear";

function toneTint(tone: GlassTone, strong?: boolean) {
  if (tone === "tinted") return color["accent-soft"];   // très léger voile coloré (bulle active)
  if (tone === "bright" || strong) return color["surface-raised"];
  return color.surface;                                   // quasi incolore
}

/** Couleur hexadécimale + opacité (#551D35 → rgba(85,29,53,a)). */
export function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// --- Accessibilité : « Réduire la transparence » (iOS) / prefers-reduced-transparency (web) ---------------
let reduceT = false;
const reduceListeners = new Set<(v: boolean) => void>();
let reduceWatching = false;
function watchReduceTransparency() {
  if (reduceWatching) return; reduceWatching = true;
  const set = (v: boolean) => { reduceT = v; reduceListeners.forEach((l) => l(v)); };
  if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-reduced-transparency: reduce)");
    set(mq.matches); mq.addEventListener?.("change", (e) => set(e.matches));
  } else if (Platform.OS === "ios") {
    AccessibilityInfo.isReduceTransparencyEnabled().then(set).catch(() => {});
    AccessibilityInfo.addEventListener("reduceTransparencyChanged", set);
  }
}
/** Vrai quand l'utilisateur a demandé moins de transparence : le verre devient une surface opaque. */
export function useReduceTransparency() {
  const [v, setV] = useState(reduceT);
  useEffect(() => { reduceListeners.add(setV); watchReduceTransparency(); setV(reduceT); return () => { reduceListeners.delete(setV); }; }, []);
  return v;
}

/**
 * Verre liquide (règles du skill Liquid Glass d'Apple, adaptées à Expo / React Native) :
 * - réservé à la navigation et aux contrôles qui flottent (`float`) ; en palette éditoriale, le contenu
 *   (cartes) reste plein, comme le veut Apple (« never apply glass to content ») ;
 * - `variant` : « regular » (contrôles) ou « clear » (posé sur une photo) ;
 * - `prominent` : verre teinté pour l'action principale (équivalent de .glassProminent) ;
 * - `interactive` : réagit au toucher (léger enfoncement, reflet plus vif), comme .interactive() ;
 * - iPhone iOS 26+ : vrai Liquid Glass (expo-glass-effect) ; web : classes « lg » (+html.tsx) ; ailleurs : flou.
 * - « Réduire la transparence » activé : surface opaque, sans flou.
 */
export function Glass({
  children, className, strong, tone = "clear", radius = 28, shadow = true, float, variant, interactive, prominent, style, ...p
}: ViewProps & { children?: ReactNode; className?: string; strong?: boolean; tone?: GlassTone; radius?: number; shadow?: boolean;
  /** Élément flottant (dock, boutons, menus, champs) : toujours en verre, même en palette éditoriale. */
  float?: boolean; variant?: GlassVariant; interactive?: boolean;
  /** Couleur de l'action principale : verre teinté de cette couleur. */
  prominent?: string }) {
  const b = blur();
  const tint = toneTint(tone, strong);
  const reduce = useReduceTransparency();
  const dark = activeScheme() === "dark";

  // Palette Bordeaux : cartes pleines et douces, sans ombre ni verre ; le verre est gardé pour ce qui flotte.
  if (isEditorial() && !float) {
    const bg = tone === "tinted" ? color["accent-soft"] : tone === "bright" || strong ? color["card-sand"] : color["card-rose"];
    return (
      <View className={cx("overflow-hidden", className)} style={[{ borderRadius: radius, backgroundColor: bg }, style]} {...p}>
        {children}
      </View>
    );
  }

  // Moins de transparence demandé : surface opaque, liseré fin pour garder la forme
  if (reduce) {
    const bg = prominent ?? (variant === "clear" ? "rgba(30,10,18,0.85)" : tone === "tinted" ? color["accent-soft"] : color["card-sand"]);
    return (
      <View className={cx("overflow-hidden", className)} style={[{ borderRadius: radius, backgroundColor: bg, borderWidth: 1, borderColor: color.border }, style]} {...p}>
        {children}
      </View>
    );
  }

  if (IOS_LIQUID) {
    return (
      <GlassView glassEffectStyle={variant ?? (float ? "regular" : "clear")} isInteractive={!!interactive} colorScheme={activeScheme()}
        tintColor={prominent ?? (tone === "tinted" ? tint : undefined)} style={[{ borderRadius: radius, overflow: "hidden" }, style]} {...p}>
        <View className={cx(className)} style={{ flex: 1 }}>{children}</View>
      </GlassView>
    );
  }

  // Fond du verre : teinte de l'action principale, voile clair sur photo, ou verre presque incolore
  const glassBg = prominent ? withAlpha(prominent, dark ? 0.8 : 0.86)
    : variant === "clear" ? "rgba(255,255,255,0.16)"
    : isEditorial() ? (tone === "tinted" ? withAlpha(color["accent-soft"].startsWith("#") ? color["accent-soft"] : "#EFDFE3", 0.7) : dark ? "rgba(38,25,32,0.55)" : "rgba(252,248,247,0.55)")
    : tint;

  if (Platform.OS === "web") {
    return (
      <View className={cx("lg overflow-hidden", !shadow && "lg-flat", float && "lg-float", variant === "clear" && "lg-clear", interactive && "lg-interactive", prominent && "lg-prominent", className)}
        style={[{ borderRadius: radius, backgroundColor: glassBg }, style]} {...p}>
        {children}
      </View>
    );
  }

  return (
    <View className={cx("overflow-hidden", className)} style={[{ borderRadius: radius }, glassLight({ lift: shadow }), style]} {...p}>
      <BlurView pointerEvents="none" intensity={Math.round(b.intensity * (variant === "clear" ? 0.25 : 0.4))} tint={b.tint} style={fill} {...(Platform.OS === "android" ? { blurMethod: "none" as const } : {})} />
      <View pointerEvents="none" style={[fill, { backgroundColor: glassBg }]} />
      <LinearGradient pointerEvents="none" colors={[color["glass-shine"], "transparent", "transparent", color["glass-shine"]]} locations={[0, 0.22, 0.78, 1]} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 1 }} style={fill} />
      {children}
    </View>
  );
}

/**
 * Groupe de verres voisins (dock + bouton cœur, rangée de boutons) : sur iOS 26, un GlassEffectContainer
 * pour que les verres s'échantillonnent ensemble et fusionnent ; ailleurs, une simple vue.
 */
export function GlassGroup({ spacing = 10, children, ...p }: ViewProps & { spacing?: number; children?: ReactNode }) {
  if (IOS_LIQUID) return <GlassContainer spacing={spacing} {...p}>{children}</GlassContainer>;
  return <View {...p}>{children}</View>;
}

/**
 * Bulle « loupe » : verre qui reprend le fond de l'écran à l'intérieur, agrandi (réfraction),
 * comme la bulle active de la barre d'onglets d'iOS. Une teinte très légère peut s'y ajouter.
 */
export function LensGlass({
  children, radius = 999, tinted, style, className, scale = 1.35,
}: { children?: ReactNode; radius?: number; tinted?: boolean; style?: ViewProps["style"]; className?: string; scale?: number }) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const win = useWindowDimensions();
  const measure = () => ref.current?.measureInWindow((x: number, y: number, w: number, h: number) => { if (w && h) setPos({ x, y, w, h }); });
  return (
    <Glass float interactive radius={radius} tone={tinted ? "tinted" : "clear"} style={style} className={className}>
      <View ref={ref} onLayout={measure} pointerEvents="none" style={[fill, { borderRadius: radius, overflow: "hidden" }]}>
        {pos && !isEditorial() ? (
          <View style={{
            position: "absolute", left: -pos.x, top: -pos.y, width: win.width, height: win.height,
            transform: [{ scale }], transformOrigin: `${pos.x + pos.w / 2}px ${pos.y + pos.h / 2}px`,
          } as object}>
            <GlassBackground />
          </View>
        ) : null}
        {tinted ? <View style={[fill, { backgroundColor: color["accent-soft"], opacity: isEditorial() ? 0.85 : 1 }]} /> : null}
      </View>
      {children}
    </Glass>
  );
}

/** Dégradé de marque en fond absolu (palette Lilas : encre anthracite). */
export function GradientFill({ radius, sheen = true }: { radius?: number; sheen?: boolean }) {
  const r = radius !== undefined ? { borderRadius: radius } : null;
  return (
    <>
      <LinearGradient pointerEvents="none" colors={[...gradient] as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[fill, r]} />
      {sheen ? (
        <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={[fill, r]} />
      ) : null}
    </>
  );
}

const FROSTED = { light: require("../../../assets/bg/frosted-light.jpg"), dark: require("../../../assets/bg/frosted-dark.jpg") };

/** Fond de chaque écran : dégradé de couleurs givré (palette Lilas) ou dégradé simple (autres palettes). */
export function GlassBackground() {
  const scheme = activeScheme();
  if (isEditorial()) return <View pointerEvents="none" style={[fill, { backgroundColor: color.bg }]} />;
  if (activePalette() === "lilas") {
    return (
      <View pointerEvents="none" style={[fill, { backgroundColor: color.bg }]}>
        <Image source={FROSTED[scheme]} resizeMode="cover" style={{ width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  const [a, b, c] = blobs();
  return (
    <View pointerEvents="none" style={[fill, { backgroundColor: color.bg }]}>
      <LinearGradient colors={[a, b, c]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[fill, { opacity: 0.85 }]} />
    </View>
  );
}
