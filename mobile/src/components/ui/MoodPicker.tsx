import { Pressable, Text, View } from "react-native";
import { cx } from "@/theme";

// Les clés correspondent à la contrainte check de public.moods
export const MOODS = [
  { key: "amazing", emoji: "✨", label: "Au top" },
  { key: "happy", emoji: "😊", label: "Heureux·se" },
  { key: "calm", emoji: "😌", label: "Zen" },
  { key: "tired", emoji: "😴", label: "Crevé·e" },
  { key: "sad", emoji: "🥺", label: "Triste" },
  { key: "stressed", emoji: "😣", label: "Stressé·e" },
  { key: "need_hug", emoji: "🫂", label: "Besoin de toi" },
  { key: "in_the_mood", emoji: "🔥", label: "Coquin·e" },
] as const;
export type MoodKey = (typeof MOODS)[number]["key"];

/** Grille d'humeurs : groupe radio, 4 colonnes. */
export function MoodPicker({ value, onChange }: { value?: MoodKey; onChange: (k: MoodKey) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Ton humeur" className="flex-row flex-wrap gap-2">
      {MOODS.map((m) => {
        const on = m.key === value;
        return (
          <Pressable
            key={m.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={m.label}
            onPress={() => onChange(m.key)}
            className={cx(
              "w-[23%] items-center gap-1 rounded-md border py-3",
              on ? "border-accent bg-accent-soft" : "border-glass-edge bg-surface active:bg-surface-raised"
            )}
          >
            <Text className="text-xl">{m.emoji}</Text>
            <Text numberOfLines={1} className={cx("font-sans-semibold text-xs", on ? "text-on-accent-soft" : "text-text-muted")}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
