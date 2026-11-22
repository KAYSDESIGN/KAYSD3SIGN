import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Art, type ArtName } from "./Art";
import { Glass } from "./Glass";
import { activeScheme, cx } from "@/theme";

/** Grande carte « Aujourd'hui » façon App Store : illustration pleine, titre blanc, panneaux de verre en bas. */
export function HeroCard({
  art = "rose", kicker, title, badge, children, minHeight = 340,
}: { art?: ArtName; kicker: string; title: string; badge?: ReactNode; children?: ReactNode; minHeight?: number }) {
  const dark = activeScheme() === "dark";
  return (
    <View
      className="overflow-hidden rounded-[30px]"
      style={{ minHeight, boxShadow: dark ? "0 14px 34px rgba(0,0,0,0.5)" : "0 14px 34px rgba(40,10,50,0.18)" }}
    >
      <Art name={art} />
      <View className="gap-2 px-5 pt-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-white/90" style={{ color: "rgba(255,255,255,0.9)" }}>{kicker}</Text>
          {badge}
        </View>
        <Text accessibilityRole="header" className="font-display text-[28px] leading-[32px]" style={{ color: "#FFFFFF" }}>{title}</Text>
      </View>
      <View className="flex-1" />
      {children ? <View className="gap-2 p-[10px]">{children}</View> : null}
    </View>
  );
}

/** Panneau de verre fumé posé sur une illustration (texte blanc). */
export function Plate({ children, className }: { children: ReactNode; className?: string }) {
  return <Glass tone="smoke" radius={22} shadow={false} className={cx("px-4 py-3", className)}>{children}</Glass>;
}

export function PlateText({ title, body }: { title: string; body?: string }) {
  return (
    <View className="flex-1 gap-[2px]">
      <Text className="font-sans-bold text-[15px]" style={{ color: "#FFFFFF" }}>{title}</Text>
      {body ? <Text className="font-sans text-[13px]" style={{ color: "rgba(255,255,255,0.88)" }}>{body}</Text> : null}
    </View>
  );
}

/** Pastille blanche (action principale sur une illustration), texte en couleur de marque. */
export function WhitePill({ label, onPress, icon: Icon }: { label: string; onPress?: () => void; icon?: LucideIcon }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      className="h-[36px] flex-row items-center gap-1 rounded-pill px-4 active:opacity-80" style={{ backgroundColor: "rgba(255,255,255,0.96)" }}>
      {Icon ? <Icon size={15} color="#B0185A" /> : null}
      <Text className="font-sans-bold text-[13px] uppercase tracking-wider" style={{ color: "#B0185A" }}>{label}</Text>
    </Pressable>
  );
}
