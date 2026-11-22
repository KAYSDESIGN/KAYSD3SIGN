import { Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { color } from "@/theme";
import { Button } from "./Button";
import { Glass } from "./Glass";
import { Caption } from "./Text";
import { SpiceBadge, type Spice } from "./Spice";

export type DailyState = "todo" | "waiting" | "revealed";

/** Carte « question du jour » : à faire, en attente du partenaire, révélée. */
export function DailyCard({
  kicker, prompt, state, spice, mine, theirs, partnerName, onAnswer,
}: {
  kicker: string; prompt: string; state: DailyState; spice?: Spice;
  mine?: string; theirs?: string; partnerName: string; onAnswer?: () => void;
}) {
  return (
    <Glass className="gap-4 p-5">
      <View className="flex-row items-center justify-between">
        <Caption>{kicker}</Caption>
        {spice ? <SpiceBadge level={spice} /> : null}
      </View>
      <Text accessibilityRole="header" className="font-display text-xl text-text">{prompt}</Text>

      {state === "todo" ? <Button onPress={onAnswer}>Répondre</Button> : null}

      {state === "waiting" ? (
        <View className="gap-3">
          <Answer who="Toi" text={mine} />
          <View className="flex-row items-center gap-2 rounded-md border border-glass-edge bg-surface-raised p-3">
            <Lock size={16} color={color["text-muted"]} />
            <Text className="flex-1 font-sans text-sm text-text-muted">
              La réponse de {partnerName} s'affichera quand vous aurez répondu tous les deux.
            </Text>
          </View>
        </View>
      ) : null}

      {state === "revealed" ? (
        <View className="gap-3">
          <Answer who="Toi" text={mine} />
          <Answer who={partnerName} text={theirs} accent />
        </View>
      ) : null}
    </Glass>
  );
}

function Answer({ who, text, accent }: { who: string; text?: string; accent?: boolean }) {
  return (
    <View className={accent ? "gap-1 rounded-md bg-accent-soft p-3" : "gap-1 rounded-md bg-surface-raised p-3"}>
      <Text className={accent ? "font-sans-bold text-xs text-on-accent-soft" : "font-sans-bold text-xs text-text-muted"}>{who}</Text>
      <Text className="font-sans text-base text-text">{text}</Text>
    </View>
  );
}
