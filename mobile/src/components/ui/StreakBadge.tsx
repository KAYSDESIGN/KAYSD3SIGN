import { Text, View } from "react-native";
import { BADGE_TEXT } from "./Spice";
import { Flame } from "lucide-react-native";
import { color, cx, FLAME } from "@/theme";

export function StreakBadge({ days, broken }: { days: number; broken?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={broken ? "Série interrompue" : `Série de ${days} jour${days > 1 ? "s" : ""}`}
      className={cx("h-[34px] flex-row items-center gap-1 self-center rounded-pill border border-glass-edge px-3", broken ? "bg-surface" : "bg-surface-raised")}
    >
      <Flame size={16} color={broken ? color["text-subtle"] : FLAME.stroke} fill={broken ? "transparent" : FLAME.fill} strokeWidth={1.8} />
      <Text className={cx("font-sans-bold text-sm", broken ? "text-text-muted" : "text-text")} style={BADGE_TEXT}>{broken ? "0" : days}</Text>
    </View>
  );
}
