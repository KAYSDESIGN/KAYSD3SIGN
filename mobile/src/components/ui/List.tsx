import { displayFont } from "@/theme";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Glass } from "./Glass";
import { color, cx } from "@/theme";

const TILE: Record<string, [string, string]> = {
  coral: ["#FF8A5B", "#D63A45"], rose: ["#FF6FA5", "#CF2470"], violet: ["#B57BFF", "#8338EC"],
  amber: ["#FFB36B", "#E8562A"], plum: ["#C04BD6", "#6D28D9"], night: ["#6366F1", "#3B0764"],
};
export type TileColor = keyof typeof TILE;

/** Icône d'app : petit carré de verre, icône à l'encre (épuré). */
export function AppTile({ icon: Icon, size = 46 }: { icon: LucideIcon; tone?: TileColor; size?: number }) {
  return (
    <Glass radius={size * 0.32} shadow={false} tone="bright" style={{ width: size, height: size }} className="items-center justify-center">
      <View><Icon size={size * 0.46} color={color.text} strokeWidth={2} /></View>
    </Glass>
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
      <Text accessibilityRole="header" className={cx(displayFont(), "text-[22px] text-text")}>{title}</Text>
      {link ? <Pressable accessibilityRole="link" onPress={onLink}><Text className="font-sans-bold text-sm text-accent">{link}</Text></Pressable> : null}
    </View>
  );
}
