import { useId, type ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { activeScheme, blobs, blur, color, cx, gradient } from "@/theme";

const fill = StyleSheet.absoluteFill;
const IOS_LIQUID = Platform.OS === "ios" && (() => { try { return isLiquidGlassAvailable(); } catch { return false; } })();

/**
 * Lumière du verre : liseré clair en haut à gauche, plus discret en bas à droite, halo intérieur,
 * et ombre portée douce. boxShadow fonctionne sur le web et la nouvelle architecture iOS/Android.
 */
export function glassLight(opts: { lift?: boolean; glow?: boolean } = {}) {
  const dark = activeScheme() === "dark";
  const rim = dark
    ? "inset 1.2px 1.2px 0 rgba(255,255,255,0.30), inset -1px -1px 0 rgba(255,255,255,0.12), inset 0 0 18px rgba(255,255,255,0.06)"
    : "inset 1.5px 1.5px 0 rgba(255,255,255,0.85), inset -1px -1px 0 rgba(255,255,255,0.45), inset 0 0 22px rgba(255,255,255,0.22)";
  const drop = dark ? "0 10px 30px rgba(0,0,0,0.30)" : "0 10px 30px rgba(110,40,110,0.12)";
  const glow = opts.glow ? ", 0 8px 22px rgba(207,36,112,0.32)" : "";
  return { boxShadow: `${rim}${opts.lift === false ? "" : `, ${drop}`}${glow}` } as const;
}

/** Ancien nom, gardé pour les écrans qui l'importent. */
export const glassShadow = (_strong = false) => glassLight({ lift: true });

/**
 * Surface « verre liquide » : très transparente, l'arrière-plan reste visible mais flou et plus coloré,
 * bords qui accrochent la lumière, reflet en diagonale.
 * - iPhone avec iOS 26 : le vrai Liquid Glass d'Apple (expo-glass-effect).
 * - Web : backdrop-filter (flou + saturation).
 * - Ailleurs : expo-blur, ou verre translucide sans flou sur Android.
 */
export function Glass({
  children, className, strong, radius = 28, shadow = true, style, ...p
}: ViewProps & { children?: ReactNode; className?: string; strong?: boolean; radius?: number; shadow?: boolean }) {
  const b = blur() as { tint: "light" | "dark"; intensity: number; css: string };
  const tint = strong ? color["surface-raised"] : color.surface;
  const shine = (
    <LinearGradient
      pointerEvents="none"
      colors={[color["glass-shine"], "transparent", "transparent"]}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={fill}
    />
  );
  const base = [{ borderRadius: radius }, glassLight({ lift: shadow }), style];

  if (IOS_LIQUID) {
    return (
      <GlassView glassEffectStyle="clear" tintColor={tint} style={[...base, { overflow: "hidden" }]} {...p}>
        <View className={cx(className)} style={{ flex: 1 }}>{children}</View>
      </GlassView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View
        className={cx("overflow-hidden border border-glass-edge", className)}
        style={[...base, { backgroundColor: tint, backdropFilter: b.css, WebkitBackdropFilter: b.css } as object]}
        {...p}
      >
        {shine}
        {children}
      </View>
    );
  }

  return (
    <View className={cx("overflow-hidden border border-glass-edge", className)} style={base} {...p}>
      <BlurView
        pointerEvents="none"
        intensity={b.intensity}
        tint={b.tint}
        style={fill}
        {...(Platform.OS === "android" ? { blurMethod: "none" as const } : {})}
      />
      <View pointerEvents="none" style={[fill, { backgroundColor: tint }]} />
      {shine}
      {children}
    </View>
  );
}

/** Dégradé de marque (corail → rose → violet) en fond absolu, avec un reflet de verre par-dessus. */
export function GradientFill({ radius, sheen = true }: { radius?: number; sheen?: boolean }) {
  const r = radius !== undefined ? { borderRadius: radius } : null;
  return (
    <>
      <LinearGradient pointerEvents="none" colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[fill, r]} />
      {sheen ? (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.34)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={[fill, r]}
        />
      ) : null}
    </>
  );
}

// Taches du fond : assez nombreuses et contrastées pour que la transparence du verre se voie.
const SPOTS = [
  { cx: "6%", cy: "4%", rx: "62%", ry: "26%" },
  { cx: "92%", cy: "12%", rx: "48%", ry: "22%" },
  { cx: "48%", cy: "30%", rx: "44%", ry: "18%" },
  { cx: "100%", cy: "44%", rx: "55%", ry: "24%" },
  { cx: "0%", cy: "52%", rx: "52%", ry: "22%" },
  { cx: "58%", cy: "66%", rx: "50%", ry: "20%" },
  { cx: "10%", cy: "84%", rx: "58%", ry: "24%" },
  { cx: "88%", cy: "92%", rx: "56%", ry: "24%" },
  { cx: "44%", cy: "104%", rx: "48%", ry: "16%" },
];

/** Fond de chaque écran : couleur de base + taches colorées floues, derrière tout le verre. */
export function GlassBackground() {
  const cols = blobs();
  // identifiants uniques : sur le web, plusieurs écrans montés partagent le même document
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <View pointerEvents="none" style={[fill, { backgroundColor: color.bg }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {cols.map((c, i) => (
            <RadialGradient key={i} id={`blob-${uid}-${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={c} stopOpacity={1} />
              <Stop offset="0.55" stopColor={c} stopOpacity={0.55} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {SPOTS.slice(0, cols.length).map((s, i) => <Ellipse key={i} {...s} fill={`url(#blob-${uid}-${i})`} />)}
      </Svg>
    </View>
  );
}
