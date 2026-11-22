import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { color, cx } from "@/theme";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      className="min-h-[44px] flex-row items-start gap-3 py-1"
    >
      <View className={cx("mt-[2px] h-[24px] w-[24px] items-center justify-center rounded-sm border-2", checked ? "border-accent bg-accent" : "border-border-input")}>
        {checked ? <Check size={16} color={color["on-accent"]} strokeWidth={3} /> : null}
      </View>
      <Text className="flex-1 font-sans text-sm text-text">{label}</Text>
    </Pressable>
  );
}
