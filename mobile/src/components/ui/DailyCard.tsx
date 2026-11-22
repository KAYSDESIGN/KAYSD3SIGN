import { Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { artInk, type ArtName } from "./Art";
import { HeroCard, Plate, PlateText, WhitePill } from "./Hero";
import { SpiceBadge, type Spice } from "./Spice";

export type DailyState = "todo" | "waiting" | "revealed";

/** Carte du jour façon App Store : illustration, question en grand, panneaux de verre pour l'état. */
export function DailyCard({
  kicker, prompt, state, spice, mine, theirs, partnerName, onAnswer, partnerAnswered, art,
}: {
  kicker: string; prompt: string; state: DailyState; spice?: Spice;
  mine?: string; theirs?: string; partnerName: string; onAnswer?: () => void; partnerAnswered?: boolean; art?: ArtName;
}) {
  return (
    <HeroCard art={art ?? (spice ? "ember" : "rose")} kicker={kicker} title={prompt} badge={spice ? <SpiceBadge level={spice} /> : undefined}
      minHeight={state === "todo" ? 330 : 260}>
      {state === "todo" ? (
        <Plate className="flex-row items-center gap-3">
          <PlateText
            title={partnerAnswered ? `${partnerName} a déjà répondu` : "À toi de commencer"}
            body={partnerAnswered ? "Réponds pour découvrir sa réponse" : `${partnerName} découvrira ta réponse après la sienne`}
          />
          <WhitePill label="Répondre" onPress={onAnswer} />
        </Plate>
      ) : null}

      {state !== "todo" ? <Answer who="Toi" text={mine} /> : null}
      {state === "waiting" ? (
        <Plate className="flex-row items-center gap-3">
          <Lock size={16} color={artInk().title} />
          <Text className="flex-1 font-sans text-[13px]" style={{ color: artInk().body }}>
            La réponse de {partnerName} s'affichera quand vous aurez répondu tous les deux.
          </Text>
        </Plate>
      ) : null}
      {state === "revealed" ? <Answer who={partnerName} text={theirs} /> : null}
    </HeroCard>
  );
}

function Answer({ who, text }: { who: string; text?: string }) {
  return (
    <Plate>
      <View className="gap-1">
        <Text className="font-sans-bold text-xs uppercase tracking-wider" style={{ color: artInk().soft }}>{who}</Text>
        <Text className="font-sans text-base" style={{ color: artInk().title }}>{text}</Text>
      </View>
    </Plate>
  );
}
