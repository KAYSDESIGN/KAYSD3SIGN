import { Pressable, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { cx } from "@/theme";
import { color as brandColor } from "@/theme";
import { Glass } from "./Glass";
import { HeroCard } from "./Hero";
import { artInk, type ArtName } from "./Art";

export type DesireAnswer = "yes" | "maybe" | "no";
const OPTIONS: { key: DesireAnswer; label: string }[] = [
  { key: "no", label: "Non" }, { key: "maybe", label: "Peut-être" }, { key: "yes", label: "Oui" },
];

/** Carte d'envie secrète façon App Store : choix en pastilles de verre, la réponse choisie devient blanche. */
export function DesireCard({
  text, value, onChange, kicker = "Envie secrète", art = "violet",
}: { text: string; value?: DesireAnswer; onChange: (a: DesireAnswer) => void; kicker?: string; art?: ArtName }) {
  const ink = artInk();
  return (
    <HeroCard kicker={kicker} title={text}>
      <View className="flex-row items-center gap-2 px-2 pb-1">
        <Lock size={13} color={ink.title} />
        <Text className="font-sans text-xs" style={{ color: ink.body }}>Secret : seuls vos « oui » communs sont révélés.</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Ta réponse, gardée secrète" className="flex-row gap-2">
        {OPTIONS.map((o) => {
          const on = value === o.key;
          const label = (
            <Text className="font-sans-bold text-[15px]" style={{ color: on ? brandColor.bg : ink.title }}>{o.label}</Text>
          );
          return on ? (
            <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ checked: true }} onPress={() => onChange(o.key)}
              className="h-[48px] flex-1 items-center justify-center rounded-pill" style={{ backgroundColor: brandColor.text, boxShadow: "0 6px 16px rgba(29,27,32,0.22)" }}>
              {label}
            </Pressable>
          ) : (
            <Glass key={o.key} tone="bright" radius={999} shadow={false} className="h-[48px] flex-1">
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: false }} onPress={() => onChange(o.key)}
                className={cx("flex-1 items-center justify-center active:opacity-70")}>
                {label}
              </Pressable>
            </Glass>
          );
        })}
      </View>
    </HeroCard>
  );
}
