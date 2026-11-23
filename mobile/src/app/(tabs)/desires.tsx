import { useState } from "react";
import { withPartner } from "@/components/app/PairGate";
import { Flame as FlameIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Flame, Lock, Sparkles } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Card, DesireCard, EmojiText, EmptyState, Muted, SPICE, Toast } from "@/components/ui";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { BackButton } from "@/components/app/BackNav";
import { api, useMutation, useQuery } from "@/data";
import { untilTomorrow } from "@/lib/day";
import { color, cx } from "@/theme";

// S21 · Envies secrètes : chacun répond en secret, seuls les oui communs apparaissent
function Desires() {
  const { partner } = useGate();
  const status = useQuery(api.getSpiceStatus);
  const rows = useQuery(api.getDesires, [status.data?.effective]);
  const matches = useQuery(api.getMutualDesires);
  const [tab, setTab] = useState<"answer" | "matches">("answer");
  const answer = useMutation(api.answerDesire);
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (status.loading && !status.data) return <Screen edges={["top"]}><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[200px]" /></Screen>;

  if (!status.data?.effective) {
    return (
      <Screen edges={["top"]}>
        <View className="-mb-2 flex-row"><BackButton /></View>
        <ScreenHeader kicker="PIMENT · ENVIES SECRÈTES" title="Ce que vous n'osez pas…" />
        <EmptyState
          icon={Lock}
          title="À débloquer à deux"
          body={status.data?.confirmed
            ? `Il manque la confirmation de ${them}. Dès que c'est fait, vos envies s'ouvrent.`
            : "Confirmez tous les deux votre âge et votre niveau d'audace pour commencer."}
          action={status.data?.confirmed ? undefined : "Confirmer mon âge"}
          onAction={() => router.push("/age")}
        />
      </Screen>
    );
  }

  // Les 5 envies du jour (tirées côté serveur, les mêmes pour vous deux) ; tout repart à zéro à minuit.
  const batch = rows.data ?? [];
  const doneToday = batch.length > 0 && batch.every((r) => r.answer);
  const card = (r: (typeof batch)[number]) => (
    <DesireCard key={r.desire.id} text={r.desire.body} kicker={`${r.desire.category} · ${SPICE[r.desire.spice_level].label}`}
      art={r.desire.spice_level === "hot" ? "night" : r.desire.spice_level === "spicy" ? "ember" : "violet"}
      value={r.answer ?? undefined} onChange={(a) => answer.mutate(r.desire.id, a)} />
  );

  return (
    <Screen edges={["top"]}>
      <View className="flex-row items-center justify-between">
        <View className="-mb-2 flex-row"><BackButton /></View>
        <ScreenHeader kicker="PIMENT · ENVIES SECRÈTES" title="Ce que vous n'osez pas…" />
      </View>
      <Body className="text-text-muted">
        {`Chaque jour, 5 nouvelles envies épicées et brûlantes. Réponds oui, peut-être ou non. ${them} ne verra jamais tes réponses, seulement ce que vous voulez tous les deux.`}
      </Body>

      <View accessibilityRole="tablist" className="flex-row rounded-pill bg-surface p-1">
        {([["answer", `Du jour · ${batch.filter((r) => r.answer).length}/${batch.length}`], ["matches", `Matchs du jour · ${matches.data?.length ?? 0}`]] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
            className={cx("h-[40px] flex-1 items-center justify-center rounded-pill", tab === k ? "bg-surface-raised" : "")}>
            <Text className={cx("font-sans-bold text-sm", tab === k ? "text-text" : "text-text-muted")}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "answer" ? (
        <View className="gap-3">
          {rows.loading && !rows.data ? <Skeleton className="h-[180px]" /> : null}
          {batch.map(card)}
          {answer.error ? <Toast tone="error">{answer.error}</Toast> : null}
          {doneToday ? (
            <Card className="gap-2">
              <EmojiText size={18} className="font-sans-bold text-base text-text">{"🔥 C'est tout pour aujourd'hui"}</EmojiText>
              <Muted>{`Allez voir vos matchs du jour. 5 nouvelles envies dans ${untilTomorrow()}.`}</Muted>
            </Card>
          ) : null}
        </View>
      ) : (
        <View className="gap-3">
          {matches.data?.length ? matches.data.map((d) => (
            <View key={d.id} className="flex-row items-center gap-3 rounded-md border border-accent bg-accent-soft p-4">
              <Flame size={20} color={color.accent} fill={color.accent} />
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-text">{d.body}</Text>
                <Text className="font-sans text-sm text-on-accent-soft">{`${d.category} · oui tous les deux aujourd'hui`}</Text>
              </View>
            </View>
          )) : (
            <EmptyState icon={Flame} title="Pas encore de match aujourd'hui" body={`Dès que ${them} et toi dites oui à la même envie du jour, elle apparaît ici. Les matchs repartent à zéro à minuit.`} />
          )}
          <Muted className="text-center">Les « peut-être » et les « non » restent toujours secrets.</Muted>
        </View>
      )}

      {api.dev.enabled ? <DevPanel actions={[{ label: "Sam répond aux envies", onPress: () => api.dev.partnerDesires() }]} /> : null}
    </Screen>
  );
}

/** Montre juste le début, pour donner envie sans tout dévoiler. */
function blur(t: string) { const w = t.split(" "); return w.slice(0, 2).join(" ") + " …"; }

export default withPartner(Desires, { id: "S21", kicker: "Envies secrètes", title: "Ce que vous n'osez pas dire", body: "Chacun répond oui, peut-être ou non, en secret. Seuls vos oui communs apparaissent, jamais un non ni un peut-être.", example: "Un massage aux huiles, sans se presser", icon: FlameIcon }, { tabs: true });
