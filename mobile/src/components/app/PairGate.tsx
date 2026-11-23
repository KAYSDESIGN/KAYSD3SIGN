import type { ComponentType, ReactNode } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { HeartHandshake, type LucideIcon } from "lucide-react-native";
import { Button, HeroCard, Muted, Plate, PlateText } from "@/components/ui";
import { ScreenHeader } from "./ScreenHeader";
import { color } from "@/theme";
import { Screen, Skeleton } from "./Screen";
import { useGate } from "./useGate";

export type PairGateInfo = {
  id: string;           // identifiant d'écran (S10…)
  kicker: string;       // petite étiquette
  title: string;        // ce que fait l'écran
  body: string;         // comment ça marche à deux
  example?: string;     // un exemple concret
  icon?: LucideIcon;
};

/** Écran de présentation tant que le/la partenaire n'a pas rejoint : on voit ce que fait la fonction, et on peut inviter. */
export function PairGateScreen({ info, tabs }: { info: PairGateInfo; tabs?: boolean }) {
  return (
    <Screen edges={tabs ? ["top"] : ["top", "bottom"]}>
      <ScreenHeader kicker={info.kicker.toUpperCase()} title={info.title} />
      <HeroCard art="violet" kicker={info.example ? "Par exemple" : info.kicker} title={info.example ?? info.title} minHeight={260}>
        <Plate><PlateText title="Comment ça marche" body={info.body} /></Plate>
      </HeroCard>
      <InviteButtons />
      <Muted className="text-center">Cette partie s'ouvre dès que vous êtes deux.</Muted>
    </Screen>
  );
}

export function InviteButtons() {
  return (
    <View className="gap-2">
      <Button size="lg" onPress={() => router.push("/onboarding/pair")}>Inviter mon/ma partenaire</Button>
      <Button variant="ghost" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })}>J'ai reçu un code</Button>
    </View>
  );
}

/** Enveloppe un écran qui n'a de sens qu'à deux. */
export function withPartner<P extends object>(Screen_: ComponentType<P>, info: PairGateInfo, opts: { tabs?: boolean } = {}) {
  function Gated(props: P): ReactNode {
    const { gate, paired } = useGate();
    if (gate === "loading") return <Screen><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[200px]" /></Screen>;
    if (!paired) return <PairGateScreen info={info} tabs={opts.tabs} />;
    return <Screen_ {...props} />;
  }
  Gated.displayName = `withPartner(${Screen_.displayName ?? Screen_.name ?? "Screen"})`;
  return Gated;
}
