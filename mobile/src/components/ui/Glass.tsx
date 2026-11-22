import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { activeScheme, blobs, blur, color, cx, gradient } from "@/theme";

const fill = StyleSheet.absoluteFill;

/** Ombre portée douce du verre (boxShadow : web + nouvelle architecture iOS/Android). */
export function glassShadow(strong = false) {
  const dark = activeScheme() === "dark";
  return { boxShadow: dark ? `0 ${strong ? 14 : 10}px ${strong ? 36 : 28}px rgba(0,0,0,0.38)` : `0 ${strong ? 14 : 10}px ${strong ? 36 : 28}px rgba(120,50,120,${strong ? 0.18 : 0.13})` } as const;
}

/**
 * Surface « verre liquide » : flou de l'arrière-plan, teinte translucide, liseré lumineux,
 * reflet en haut. Les enfants se posent par-dessus ; className règle la forme et le padding.
 */
export function Glass({
  children, className, strong, radius = 28, shadow = true, style, ...p
}: ViewProps & { children?: ReactNode; className?: string; strong?: boolean; radius?: number; shadow?: boolean }) {
  const b = blur();
  return (
    <View
      className={cx("overflow-hidden border border-glass-edge", className)}
      style={[{ borderRadius: radius }, shadow ? glassShadow(strong) : null, style]}
      {...p}
    >
      <BlurView
        pointerEvents="none"
        intensity={strong ? b.intensity + 15 : b.intensity}
        tint={b.tint}
        style={fill}
        {...(Platform.OS === "android" ? { blurMethod: "none" as const } : {})}
      />
      <View pointerEvents="none" style={[fill, { backgroundColor: strong ? color["surface-raised"] : color.surface }]} />
      <LinearGradient
        pointerEvents="none"
        colors={[color["glass-shine"], "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: "55%" }}
      />
      {children}
    </View>
  );
}

/** Dégradé de marque (corail → rose → violet) en fond absolu. */
export function GradientFill({ radius }: { radius?: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[fill, radius !== undefined ? { borderRadius: radius } : null]}
    />
  );
}

/** Fond de l'app : couleur de base + grandes taches colorées floues, derrière tout le verre. */
export function GlassBackground() {
  const [a, b, c, d] = blobs();
  const spots = [
    { id: "a", col: a, cx: "8%", cy: "6%", rx: "75%", ry: "38%" },
    { id: "b", col: b, cx: "100%", cy: "26%", rx: "70%", ry: "34%" },
    { id: "c", col: c, cx: "22%", cy: "72%", rx: "85%", ry: "40%" },
    { id: "d", col: d, cx: "96%", cy: "100%", rx: "65%", ry: "30%" },
  ];
  return (
    <View pointerEvents="none" style={[fill, { backgroundColor: color.bg }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {spots.map((s) => (
            <RadialGradient key={s.id} id={`blob-${s.id}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={s.col} stopOpacity={1} />
              <Stop offset="1" stopColor={s.col} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {spots.map((s) => <Ellipse key={s.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={`url(#blob-${s.id})`} />)}
      </Svg>
    </View>
  );
}
