import { Pressable, Text, View } from "react-native";
import { cx } from "@/theme";

/** Offre du paywall (radio). Le prix vient du store (RevenueCat), jamais codé en dur. */
export function PlanOption({
  title, price, detail, badge, selected, onSelect,
}: { title: string; price: string; detail: string; badge?: string; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price}, ${detail}${badge ? `, ${badge}` : ""}`}
      onPress={onSelect}
      className={cx(
        "min-h-[72px] flex-row items-center gap-3 rounded-md border px-4 py-3",
        selected ? "border-2 border-accent bg-accent-soft" : "border-glass-edge bg-surface active:bg-surface-raised"
      )}
    >
      <View className={cx("h-[22px] w-[22px] items-center justify-center rounded-pill border-2", selected ? "border-accent" : "border-border-input")}>
        {selected ? <View className="h-[10px] w-[10px] rounded-pill bg-accent" /> : null}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-bold text-base text-text">{title}</Text>
          {badge ? (
            <View className="rounded-pill bg-gold px-2 py-[2px]"><Text className="font-sans-bold text-xs text-on-accent">{badge}</Text></View>
          ) : null}
        </View>
        <Text className="font-sans text-sm text-text-muted">{detail}</Text>
      </View>
      <Text className="font-sans-bold text-base text-text">{price}</Text>
    </Pressable>
  );
}
