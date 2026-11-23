import type { ViewProps } from "react-native";
import { cx } from "@/theme";
import { Glass } from "./Glass";

export function Card({ className, raised, ...p }: ViewProps & { className?: string; raised?: boolean }) {
  return <Glass strong={raised} className={cx("p-4", className)} {...p} />;
}
