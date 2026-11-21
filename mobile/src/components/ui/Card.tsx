import { View, type ViewProps } from "react-native";
import { cx } from "@/theme";

export function Card({ className, raised, ...p }: ViewProps & { className?: string; raised?: boolean }) {
  return (
    <View
      className={cx("rounded-lg border border-border p-4", raised ? "bg-surface-raised" : "bg-surface", className)}
      {...p}
    />
  );
}
