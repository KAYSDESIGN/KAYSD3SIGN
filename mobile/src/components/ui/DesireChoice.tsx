import { Pressable, Text, View } from "react-native";
import { cx } from "@/theme";

export type DesireAnswer = "yes" | "maybe" | "no";
const OPTIONS: { key: DesireAnswer; label: string; on: string; text: string }[] = [
  { key: "no", label: "Non", on: "bg-surface-raised border-border-input", text: "text-text" },
  { key: "maybe", label: "Peut-être", on: "bg-surface-raised border-gold", text: "text-gold" },
  { key: "yes", label: "Oui", on: "bg-accent border-accent", text: "text-on-accent" },
];

/** Carte d'envie secrète : la réponse n'est jamais montrée au partenaire, seuls les oui communs. */
export function DesireCard({
  text, value, onChange,
}: { text: string; value?: DesireAnswer; onChange: (a: DesireAnswer) => void }) {
  return (
    <View className="gap-4 rounded-lg border border-border bg-surface p-5">
      <Text className="font-display text-xl text-text">{text}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Ta réponse, gardée secrète" className="flex-row gap-2">
        {OPTIONS.map((o) => {
          const on = value === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.key)}
              className={cx("h-[44px] flex-1 items-center justify-center rounded-pill border", on ? o.on : "border-border bg-bg active:bg-surface-raised")}
            >
              <Text className={cx("font-sans-bold text-sm", on ? o.text : "text-text-muted")}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="font-sans text-xs text-text-muted">🔒 Secret. Seuls vos « oui » communs seront révélés.</Text>
    </View>
  );
}
