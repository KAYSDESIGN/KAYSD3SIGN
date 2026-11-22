import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { color, cx } from "@/theme";
import { glassLight, GradientFill } from "./Glass";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const box: Record<Variant, string> = {
  primary: "overflow-hidden active:opacity-90",
  secondary: "bg-surface-raised border border-glass-edge active:bg-surface",
  ghost: "bg-transparent active:bg-surface",
  danger: "bg-transparent border border-danger active:bg-surface",
};
const label: Record<Variant, string> = {
  primary: "text-on-accent",
  secondary: "text-text",
  ghost: "text-accent",
  danger: "text-danger",
};
const iconColor = (v: Variant) => ({ primary: color["on-accent"], secondary: color.text, ghost: color.accent, danger: color.danger })[v];
const height: Record<Size, string> = { sm: "h-[36px] px-3", md: "h-[44px] px-4", lg: "h-[52px] px-5" };
const text: Record<Size, string> = { sm: "text-sm", md: "text-base", lg: "text-base" };

export type ButtonProps = Omit<PressableProps, "children"> & {
  children: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  block?: boolean;
  className?: string;
};

/** Bouton. Le libellé reste lu par les lecteurs d'écran pendant le chargement. */
export function Button({
  children, variant = "primary", size = "md", loading, disabled, icon: Icon, block, className, ...p
}: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      hitSlop={size === "sm" ? 4 : 0}
      className={cx(
        "flex-row items-center justify-center rounded-pill",
        box[variant], height[size], block && "self-stretch", off && "opacity-50", className
      )}
      style={variant === "primary" ? glassLight({ lift: false, glow: true }) : variant === "secondary" ? glassLight({ lift: false }) : undefined}
      {...p}
    >
      {variant === "primary" ? <GradientFill /> : null}
      {loading ? (
        <ActivityIndicator color={iconColor(variant)} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon ? <Icon size={size === "sm" ? 16 : 18} color={iconColor(variant)} strokeWidth={2.2} /> : null}
          <Text className={cx("font-sans-bold", text[size], label[variant])}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Bouton icône seul : un libellé accessible est obligatoire. Cible tactile 44 px. */
export function IconButton({
  icon: Icon, label: a11y, onPress, tone = "default", className,
}: { icon: LucideIcon; label: string; onPress?: () => void; tone?: "default" | "accent"; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      className={cx(
        "h-[44px] w-[44px] items-center justify-center rounded-pill",
        "border border-glass-edge",
        tone === "accent" ? "bg-accent-soft active:bg-surface" : "bg-surface-raised active:bg-surface",
        className
      )}
    >
      <Icon size={20} color={tone === "accent" ? color["on-accent-soft"] : color.text} strokeWidth={2} />
    </Pressable>
  );
}
