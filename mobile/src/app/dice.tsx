import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Dices, Lock, Timer } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Body, Button, Caption, EmptyState, Heading, Muted, SpiceBadge } from "@/components/ui";
import { api, useQuery } from "@/data";
import { DICE } from "@/data/seed";
import { color } from "@/theme";

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

// S24 · Dés coquins : une action, une zone, une durée
export default function DiceScreen() {
  const status = useQuery(api.getSpiceStatus);
  const [roll, setRoll] = useState<{ action: string; zone: string; secs: number } | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => { if (left === 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, [left]);

  if (status.loading && !status.data) return <Screen><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[240px]" /></Screen>;
  const level = status.data?.effective;
  if (!level) {
    return (
      <Screen>
        <Caption>Dés coquins</Caption>
        <EmptyState icon={Lock} title="À débloquer à deux" body="Confirmez tous les deux votre âge et votre niveau d'audace." action="Confirmer mon âge" onAction={() => router.push("/age")} />
      </Screen>
    );
  }

  const set = DICE[level];
  const throwDice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setRoll({ action: pick(set.actions), zone: pick(set.zones), secs: pick(DICE.timers) });
    setLeft(null);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Caption>Dés coquins</Caption>
        <SpiceBadge level={level} />
      </View>
      <Heading>Lancez, puis laissez-vous faire</Heading>
      <Body className="text-text-muted">{"À tour de rôle. Un « stop » de l'un·e ou de l'autre arrête le jeu, sans discussion."}</Body>

      <View accessibilityLiveRegion="polite" className="min-h-[200px] items-center justify-center gap-3 rounded-lg border border-border bg-surface p-6">
        {roll ? (
          <>
            <Text className="text-center font-display text-display text-text">{roll.action}</Text>
            <Text className="text-center font-display-italic text-xl text-accent">{roll.zone}</Text>
            <View className="flex-row items-center gap-2">
              <Timer size={18} color={color.gold} />
              <Text className="font-sans-bold text-base text-gold">{left === null ? `${roll.secs} secondes` : left > 0 ? `${left} s` : "Temps écoulé !"}</Text>
            </View>
          </>
        ) : (
          <>
            <Dices size={48} color={color.accent} />
            <Muted className="text-center">Lancez les dés pour commencer.</Muted>
          </>
        )}
      </View>

      <Button size="lg" icon={Dices} onPress={throwDice}>{roll ? "Relancer" : "Lancer les dés"}</Button>
      {roll ? (
        <Button variant="secondary" icon={Timer} onPress={() => setLeft(roll.secs)} disabled={left !== null && left > 0}>Lancer le chrono</Button>
      ) : null}
    </Screen>
  );
}
