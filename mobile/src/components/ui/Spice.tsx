import { EmojiText } from "./Emoji";
import { Pressable, Text, View } from "react-native";
import { cx } from "@/theme";

export type Spice = "soft" | "spicy" | "hot";
export const SPICE: Record<Spice, { label: string; peppers: string; hint: string; bg: string }> = {
  soft: { label: "Doux", peppers: "🌶️", hint: "Complicité, tendresse, sous-entendus", bg: "bg-spice-soft" },
  spicy: { label: "Épicé", peppers: "🌶️🌶️", hint: "Séduction, jeux, envies", bg: "bg-spice-spicy" },
  hot: { label: "Brûlant", peppers: "🌶️🌶️🌶️", hint: "Sans filtre, entre adultes consentants", bg: "bg-spice-hot" },
};

export function SpiceBadge({ level, size = "sm" }: { level: Spice; size?: "sm" | "md" }) {
  const s = SPICE[level];
  // « md » : même hauteur et même texte que la pastille de série (flamme), pour les aligner côte à côte
  return (
    <View accessible accessibilityLabel={`Niveau ${s.label}`} className={cx("flex-row items-center rounded-pill px-3", size === "md" ? "h-[34px] self-center" : "h-[26px] self-start", s.bg)}>
      <Text className={cx("font-sans-bold text-on-spice", size === "md" ? "text-sm" : "text-xs")}>{s.label}</Text>
    </View>
  );
}

/** Choix du niveau d'audace. Rappel : c'est le plus bas des deux partenaires qui s'applique. */
export function SpiceSelector({ value, onChange }: { value: Spice; onChange: (s: Spice) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Ton niveau d'audace" className="gap-2">
      {(Object.keys(SPICE) as Spice[]).map((k) => {
        const s = SPICE[k];
        const on = k === value;
        return (
          <Pressable
            key={k}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${s.label}. ${s.hint}`}
            onPress={() => onChange(k)}
            className={cx(
              "min-h-[64px] flex-row items-center gap-3 rounded-md border px-4 py-3",
              on ? "border-accent bg-accent-soft" : "border-glass-edge bg-surface active:bg-surface-raised"
            )}
          >
            <View className={cx("h-[22px] w-[22px] items-center justify-center rounded-pill border-2", on ? "border-accent" : "border-border-input")}>
              {on ? <View className="h-[10px] w-[10px] rounded-pill bg-accent" /> : null}
            </View>
            <View className="flex-1">
              <EmojiText size={16} className="font-sans-bold text-base text-text">{`${s.label}  ${s.peppers}`}</EmojiText>
              <Text className="font-sans text-sm text-text-muted">{s.hint}</Text>
            </View>
          </Pressable>
        );
      })}
      <Text className="font-sans text-sm text-text-muted">Vous verrez le contenu du niveau le plus doux choisi par vous deux.</Text>
    </View>
  );
}
