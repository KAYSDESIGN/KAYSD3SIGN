import { Pressable, Text, View } from "react-native";
import { cx } from "@/theme";

export type Spice = "soft" | "spicy" | "hot";
export const SPICE: Record<Spice, { label: string; peppers: string; hint: string; bg: string }> = {
  soft: { label: "Doux", peppers: "🌶️", hint: "Complicité, tendresse, sous-entendus", bg: "bg-spice-soft" },
  spicy: { label: "Épicé", peppers: "🌶️🌶️", hint: "Séduction, jeux, envies", bg: "bg-spice-spicy" },
  hot: { label: "Brûlant", peppers: "🌶️🌶️🌶️", hint: "Sans filtre, entre adultes consentants", bg: "bg-spice-hot" },
};

export function SpiceBadge({ level }: { level: Spice }) {
  const s = SPICE[level];
  return (
    <View accessible accessibilityLabel={`Niveau ${s.label}`} className={cx("h-[26px] flex-row items-center self-start rounded-pill px-3", s.bg)}>
      <Text className="font-sans-bold text-xs text-on-spice">{s.label}</Text>
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
              <Text className="font-sans-bold text-base text-text">{s.label} <Text className="text-sm">{s.peppers}</Text></Text>
              <Text className="font-sans text-sm text-text-muted">{s.hint}</Text>
            </View>
          </Pressable>
        );
      })}
      <Text className="font-sans text-sm text-text-muted">Vous verrez le contenu du niveau le plus doux choisi par vous deux.</Text>
    </View>
  );
}
