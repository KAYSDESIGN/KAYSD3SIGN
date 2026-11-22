import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ArtName } from "./Art";
import { Glass } from "./Glass";
import { color, cx } from "@/theme";

/** Carte principale : verre quasi incolore, petite ligne d'info, grande phrase, actions en bas. */
export function HeroCard({
  kicker, title, badge, children, dot,
}: { art?: ArtName; kicker: string; title: string; badge?: ReactNode; children?: ReactNode; minHeight?: number; dot?: boolean }) {
  return (
    <Glass radius={32} className="gap-4 p-[22px]">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          {dot ? <View className="h-[8px] w-[8px] rounded-pill" style={{ backgroundColor: "#EE4058" }} /> : null}
          <Text numberOfLines={1} className="flex-1 font-sans-semibold text-[13px] text-text-muted">{kicker}</Text>
        </View>
        {badge}
      </View>
      <Text accessibilityRole="header" className="font-display text-[25px] leading-[30px] tracking-tight text-text">{title}</Text>
      {children ? <View className="gap-3">{children}</View> : null}
    </Glass>
  );
}

/** Zone d'information dans une carte (verre un peu plus visible). */
export function Plate({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cx("rounded-[20px] border border-glass-edge bg-surface-raised px-4 py-3", className)}>{children}</View>;
}

export function PlateText({ title, body }: { title: string; body?: string }) {
  return (
    <View className="flex-1 gap-[2px]">
      <Text className="font-sans-bold text-[15px] text-text">{title}</Text>
      {body ? <Text className="font-sans text-[13px] text-text-muted">{body}</Text> : null}
    </View>
  );
}

/** Bouton pilule à l'encre (anthracite le jour, blanc la nuit). */
export function WhitePill({ label, onPress, icon: Icon }: { label: string; onPress?: () => void; icon?: LucideIcon }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      className="h-[40px] flex-row items-center gap-1 rounded-pill px-5 active:opacity-80" style={{ backgroundColor: color.text }}>
      {Icon ? <Icon size={15} color={color.bg} /> : null}
      <Text className="font-sans-bold text-[14px]" style={{ color: color.bg }}>{label}</Text>
    </Pressable>
  );
}
