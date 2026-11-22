import { Text } from "react-native";
import { Glass } from "./Glass";
import { CircleAlert, Heart, Info } from "lucide-react-native";
import { color, cx } from "@/theme";

type Tone = "info" | "nudge" | "error";
const icons = { info: Info, nudge: Heart, error: CircleAlert };
const tint = (t: Tone) => ({ info: color.text, nudge: color.accent, error: color.danger })[t];

/** Bandeau éphémère (affiché par un provider en haut d'écran). Annoncé aux lecteurs d'écran. */
export function Toast({ tone = "info", children }: { tone?: Tone; children: string }) {
  const Icon = icons[tone];
  return (
    <Glass
      strong
      radius={20}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={cx("flex-row items-center gap-3 px-4 py-3", tone === "error" && "border-danger")}
    >
      <Icon size={18} color={tint(tone)} fill={tone === "nudge" ? color.accent : "transparent"} />
      <Text className="flex-1 font-sans-semibold text-sm text-text">{children}</Text>
    </Glass>
  );
}
