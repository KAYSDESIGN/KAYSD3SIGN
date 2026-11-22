import { Text, View } from "react-native";
import { Flame } from "lucide-react-native";
import { color, cx } from "@/theme";

export function StreakBadge({ days, broken }: { days: number; broken?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={broken ? "Série interrompue" : `Série de ${days} jour${days > 1 ? "s" : ""}`}
      className={cx("h-[34px] flex-row items-center gap-1 self-start rounded-pill border border-glass-edge px-3", broken ? "bg-surface" : "bg-surface-raised")}
    >
      <Flame size={16} color={broken ? color["text-subtle"] : color.gold} fill={broken ? "transparent" : color.gold} />
      <Text className={cx("font-sans-bold text-sm", broken ? "text-text-muted" : "text-gold")}>{broken ? "0" : days}</Text>
    </View>
  );
}
