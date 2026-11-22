import type { ReactNode } from "react";
import { Text, View } from "react-native";

const today = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

/** En-tête façon App Store : petite date (ou rubrique) en capitales, grand titre, bouton de verre à droite. */
export function ScreenHeader({ kicker, title, right }: { kicker?: string; title: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between gap-3 pt-2">
      <View className="flex-1 gap-1" style={{ minWidth: 0, flexShrink: 1 }}>
        <Text className="font-sans-bold text-xs tracking-wider text-text-muted">{kicker ?? today()}</Text>
        <Text accessibilityRole="header" className="font-display text-[34px] leading-[38px] text-text">{title}</Text>
      </View>
      {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}
