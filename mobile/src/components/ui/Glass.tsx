import type React from "react";
import { useRef, useState, type ReactNode } from "react";
import { Image, Platform, StyleSheet, useWindowDimensions, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { activePalette, activeScheme, blobs, blur, color, cx, gradient } from "@/theme";

const fill = StyleSheet.absoluteFill;
const IOS_LIQUID = Platform.OS === "ios" && (() => { try { return isLiquidGlassAvailable(); } catch { return false; } })();

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

function toneTint(tone: GlassTone, strong?: boolean) {
  if (tone === "tinted") return color["accent-soft"];   // très léger voile coloré (bulle active)
  if (tone === "bright" || strong) return color["surface-raised"];
  return color.surface;                                   // quasi incolore
}

/**
 * Verre liquide quasi incolore : à peine flouté, presque pas teinté ; l'épaisseur vient des bords.
 * - iPhone iOS 26 et plus : vrai Liquid Glass d'Apple (expo-glass-effect).
 * - Web : classe « lg » (+html.tsx) : flou léger, saturation, bords lumineux, halo du texte.
 * - Ailleurs : expo-blur léger (Android : translucide sans flou).
 */
export function Glass({
  children, className, strong, tone = "clear", radius = 28, shadow = true, style, ...p
}: ViewProps & { children?: ReactNode; className?: string; strong?: boolean; tone?: GlassTone; radius?: number; shadow?: boolean }) {
  const b = blur();
  const tint = toneTint(tone, strong);

  if (IOS_LIQUID) {
    return (
      <GlassView glassEffectStyle="clear" tintColor={tone === "tinted" ? tint : undefined} style={[{ borderRadius: radius, overflow: "hidden" }, style]} {...p}>
        <View className={cx(className)} style={{ flex: 1 }}>{children}</View>
      </GlassView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View className={cx("lg overflow-hidden", !shadow && "lg-flat", className)} style={[{ borderRadius: radius, backgroundColor: tint }, style]} {...p}>
        {children}
      </View>
    );
  }

  return (
    <View className={cx("overflow-hidden", className)} style={[{ borderRadius: radius }, glassLight({ lift: shadow }), style]} {...p}>
      <BlurView pointerEvents="none" intensity={Math.round(b.intensity * 0.4)} tint={b.tint} style={fill} {...(Platform.OS === "android" ? { blurMethod: "none" as const } : {})} />
      <View pointerEvents="none" style={[fill, { backgroundColor: tint }]} />
      <LinearGradient pointerEvents="none" colors={[color["glass-shine"], "transparent", "transparent", color["glass-shine"]]} locations={[0, 0.22, 0.78, 1]} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 1 }} style={fill} />
      {children}
    </View>
  );
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
    <Glass radius={radius} tone={tinted ? "tinted" : "clear"} style={style} className={className}>
      <View ref={ref} onLayout={measure} pointerEvents="none" style={[fill, { borderRadius: radius, overflow: "hidden" }]}>
        {pos ? (
          <View style={{
            position: "absolute", left: -pos.x, top: -pos.y, width: win.width, height: win.height,
            transform: [{ scale }], transformOrigin: `${pos.x + pos.w / 2}px ${pos.y + pos.h / 2}px`,
          } as object}>
            <GlassBackground />
          </View>
        ) : null}
        {tinted ? <View style={[fill, { backgroundColor: color["accent-soft"] }]} /> : null}
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
