import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { color, cx } from "@/theme";

export function ChecklistItem({ label, done, onToggle, meta }: { label: string; done: boolean; onToggle: () => void; meta?: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      onPress={onToggle}
      className="min-h-[56px] flex-row items-center gap-3 border-b border-border px-1 py-3 active:bg-surface"
    >
      <View className={cx("h-[24px] w-[24px] items-center justify-center rounded-sm border-2", done ? "border-accent bg-accent" : "border-border-input")}>
        {done ? <Check size={16} color={color["on-accent"]} strokeWidth={3} /> : null}
      </View>
      <View className="flex-1">
        <Text className={cx("font-sans-semibold text-base", done ? "text-text-muted line-through" : "text-text")}>{label}</Text>
        {meta ? <Text className="font-sans text-sm text-text-muted">{meta}</Text> : null}
      </View>
    </Pressable>
  );
}
