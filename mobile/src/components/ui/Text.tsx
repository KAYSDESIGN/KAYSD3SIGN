import { displayFont } from "@/theme";
import { Text as RNText, type TextProps } from "react-native";
import { cx } from "@/theme";

type Props = TextProps & { className?: string };

/** Grand titre (Plus Jakarta Sans ExtraBold). Rôle d'en-tête pour les lecteurs d'écran. */
export function Display({ className, ...p }: Props) {
  return <RNText accessibilityRole="header" className={cx(displayFont(), "text-display text-text", className)} {...p} />;
}

export function Heading({ className, ...p }: Props) {
  return <RNText accessibilityRole="header" className={cx(displayFont(), "text-xl text-text", className)} {...p} />;
}

export function Title({ className, ...p }: Props) {
  return <RNText className={cx("font-sans-bold text-lg text-text", className)} {...p} />;
}

export function Body({ className, ...p }: Props) {
  return <RNText className={cx("font-sans text-base text-text", className)} {...p} />;
}

export function Muted({ className, ...p }: Props) {
  return <RNText className={cx("font-sans text-sm text-text-muted", className)} {...p} />;
}

export function Caption({ className, ...p }: Props) {
  return <RNText className={cx("font-sans-semibold text-xs uppercase tracking-wider text-text-muted", className)} {...p} />;
}
