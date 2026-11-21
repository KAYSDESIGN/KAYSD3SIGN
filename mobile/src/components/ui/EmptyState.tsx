import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { color } from "@/theme";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon, title, body, action, onAction,
}: { icon: LucideIcon; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View className="items-center gap-3 rounded-lg border border-dashed border-border px-6 py-8">
      <View className="h-[56px] w-[56px] items-center justify-center rounded-pill bg-accent-soft">
        <Icon size={26} color={color["on-accent-soft"]} />
      </View>
      <Text accessibilityRole="header" className="text-center font-display text-xl text-text">{title}</Text>
      <Text className="text-center font-sans text-base text-text-muted">{body}</Text>
      {action ? <Button variant="secondary" onPress={onAction}>{action}</Button> : null}
    </View>
  );
}
