import { useId } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { tokens } from "@/theme";

export type ArtName = "rose" | "ember" | "violet" | "night";

/**
 * Illustration abstraite des grandes cartes : dégradé profond, halos de couleur, reflet doux.
 * Un voile sombre en haut garde le texte blanc lisible (4.5:1 sur chaque teinte du dégradé).
 */
export function Art({ name = "rose" }: { name?: ArtName }) {
  const [a, b, c] = tokens.art[name] as string[];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[a, b, c]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`o1-${uid}`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#FF6F91" stopOpacity={0.55} /><Stop offset="1" stopColor="#FF6F91" stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`o2-${uid}`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#A78BFA" stopOpacity={0.5} /><Stop offset="1" stopColor="#A78BFA" stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`o3-${uid}`} cx="35%" cy="30%" r="50%"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.30} /><Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0.04} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Ellipse cx="88%" cy="30%" rx="55%" ry="38%" fill={`url(#o1-${uid})`} />
        <Ellipse cx="20%" cy="92%" rx="65%" ry="40%" fill={`url(#o2-${uid})`} />
        <Ellipse cx="82%" cy="62%" rx="26%" ry="22%" fill={`url(#o3-${uid})`} />
      </Svg>
      <LinearGradient colors={["rgba(25,0,20,0.38)", "rgba(25,0,20,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
