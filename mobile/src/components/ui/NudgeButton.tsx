import { useState } from "react";
import { Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { Check } from "lucide-react-native";
import { color, cx } from "@/theme";

/** Envoi en un tap. Passe en « envoyé » 2 s, retour haptique, annonce pour lecteur d'écran. */
export function NudgeButton({ icon: Icon, label, onSend }: { icon: LucideIcon; label: string; onSend?: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sent ? `${label}, envoyé` : `Envoyer : ${label}`}
      accessibilityLiveRegion="polite"
      disabled={sent}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onSend?.();
        setSent(true);
        setTimeout(() => setSent(false), 2000);
      }}
      className={cx(
        "h-[44px] flex-row items-center gap-2 rounded-pill border px-4",
        sent ? "border-success bg-surface" : "border-border bg-surface-raised active:bg-accent-soft"
      )}
    >
      {sent ? <Check size={18} color={color.success} /> : <Icon size={18} color={color.accent} />}
      <Text className={cx("font-sans-semibold text-sm", sent ? "text-success" : "text-text")}>{sent ? "Envoyé" : label}</Text>
    </Pressable>
  );
}
