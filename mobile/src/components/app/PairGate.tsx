import type { ComponentType, ReactNode } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { HeartHandshake, type LucideIcon } from "lucide-react-native";
import { Body, Button, Caption, Heading, Muted } from "@/components/ui";
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
  const Icon = info.icon ?? HeartHandshake;
  return (
    <Screen edges={tabs ? ["top"] : ["top", "bottom"]}>
      <Caption>{info.kicker}</Caption>
      <Heading>{info.title}</Heading>
      <View className="items-center gap-3 rounded-lg border border-glass-edge bg-surface px-5 py-6">
        <View className="h-[56px] w-[56px] items-center justify-center rounded-pill bg-accent-soft">
          <Icon size={26} color={color["on-accent-soft"]} />
        </View>
        <Body className="text-center">{info.body}</Body>
        {info.example ? (
          <View className="self-stretch rounded-md border border-glass-edge bg-surface-raised p-4">
            <Text className="font-sans-bold text-xs uppercase tracking-wider text-text-muted">Par exemple</Text>
            <Text className="mt-1 font-display-italic text-lg text-text">{info.example}</Text>
          </View>
        ) : null}
      </View>
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
