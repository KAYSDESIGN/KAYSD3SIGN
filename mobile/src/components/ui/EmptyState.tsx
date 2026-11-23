import { cx, displayFont } from "@/theme";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { color } from "@/theme";
import { Button } from "./Button";
import { Glass } from "./Glass";

export function EmptyState({
  icon: Icon, title, body, action, onAction,
}: { icon: LucideIcon; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <Glass className="items-center gap-3 px-6 py-8">
      <View className="h-[56px] w-[56px] items-center justify-center rounded-pill bg-accent-soft">
        <Icon size={26} color={color["on-accent-soft"]} />
      </View>
      <Text accessibilityRole="header" className={cx(displayFont(), "text-center text-xl text-text")}>{title}</Text>
      <Text className="text-center font-sans text-base text-text-muted">{body}</Text>
      {action ? <Button variant="secondary" onPress={onAction}>{action}</Button> : null}
    </Glass>
  );
}
