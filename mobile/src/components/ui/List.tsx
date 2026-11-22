import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { Glass } from "./Glass";
import { color, cx } from "@/theme";

const TILE: Record<string, [string, string]> = {
  coral: ["#FF8A5B", "#D63A45"], rose: ["#FF6FA5", "#CF2470"], violet: ["#B57BFF", "#8338EC"],
  amber: ["#FFB36B", "#E8562A"], plum: ["#C04BD6", "#6D28D9"], night: ["#6366F1", "#3B0764"],
};
export type TileColor = keyof typeof TILE;

/** Icône d'app : carré arrondi en dégradé, icône blanche, petit reflet. */
export function AppTile({ icon: Icon, tone = "rose", size = 50 }: { icon: LucideIcon; tone?: TileColor; size?: number }) {
  return (
    <View className="items-center justify-center overflow-hidden" style={{ width: size, height: size, borderRadius: size * 0.26, boxShadow: "0 4px 10px rgba(40,10,50,0.18)" }}>
      <LinearGradient colors={TILE[tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />
      <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }} style={{ position: "absolute", inset: 0 }} />
      <View><Icon size={size * 0.48} color="#FFFFFF" strokeWidth={2.1} /></View>
    </View>
  );
}

/** Liste en verre façon App Store. */
export function GlassList({ children, className }: { children: ReactNode; className?: string }) {
  return <Glass radius={26} className={cx("px-4 py-1", className)}>{children}</Glass>;
}

/** Ligne : icône d'app, titre, sous-titre, pastille d'action en verre (« OUVRIR »). */
export function ListRow({
  icon, tone, title, subtitle, action = "Ouvrir", onPress, first,
}: { icon: LucideIcon; tone?: TileColor; title: string; subtitle?: string; action?: string; onPress?: () => void; first?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ""}`} onPress={onPress}
      className={cx("min-h-[72px] flex-row items-center gap-3 py-[11px] active:opacity-80", !first && "border-t border-border")}>
      <AppTile icon={icon} tone={tone} />
      <View className="flex-1 gap-[1px]">
        <Text numberOfLines={1} className="font-sans-bold text-[15.5px] text-text">{title}</Text>
        {subtitle ? <Text numberOfLines={2} className="font-sans text-[13px] text-text-muted">{subtitle}</Text> : null}
      </View>
      <View className="h-[32px] items-center justify-center rounded-pill border border-glass-edge bg-surface-raised px-4">
        <Text className="font-sans-bold text-[13px] uppercase tracking-wider" style={{ color: color.accent }}>{action}</Text>
      </View>
    </Pressable>
  );
}

/** Titre de section avec lien « Tout voir ». */
export function SectionTitle({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <View className="mt-2 flex-row items-baseline justify-between px-[2px]">
      <Text accessibilityRole="header" className="font-display text-[22px] text-text">{title}</Text>
      {link ? <Pressable accessibilityRole="link" onPress={onLink}><Text className="font-sans-bold text-sm text-accent">{link}</Text></Pressable> : null}
    </View>
  );
}
