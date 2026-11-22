import { useState } from "react";
import { withPartner } from "@/components/app/PairGate";
import { Flame as FlameIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Flame, Lock, Sparkles } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, Card, DesireCard, EmptyState, Heading, Muted, SpiceBadge } from "@/components/ui";
import { api, useQuery } from "@/data";
import { color, cx } from "@/theme";

// S21 · Envies secrètes : chacun répond en secret, seuls les oui communs apparaissent
function Desires() {
  const { partner } = useGate();
  const status = useQuery(api.getSpiceStatus);
  const rows = useQuery(api.getDesires);
  const matches = useQuery(api.getMutualDesires);
  const [tab, setTab] = useState<"answer" | "matches">("answer");
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (status.loading && !status.data) return <Screen edges={["top"]}><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[200px]" /></Screen>;

  if (!status.data?.effective) {
    return (
      <Screen edges={["top"]}>
        <Caption>Envies secrètes</Caption>
        <Heading>Ce que vous n'osez pas dire</Heading>
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

  const list = rows.data ?? [];
  const answered = list.filter((r) => r.answer).length;
  const open = list.filter((r) => !r.locked);
  const locked = list.filter((r) => r.locked);

  return (
    <Screen edges={["top"]}>
      <View className="flex-row items-center justify-between">
        <Caption>Envies secrètes</Caption>
        <SpiceBadge level={status.data.effective} />
      </View>
      <Heading>Ce que vous n'osez pas dire</Heading>
      <Body className="text-text-muted">
        {`Réponds oui, peut-être ou non. ${them} ne verra jamais tes réponses, seulement ce que vous voulez tous les deux.`}
      </Body>

      <View accessibilityRole="tablist" className="flex-row rounded-pill bg-surface p-1">
        {([["answer", `À répondre · ${answered}/${list.length}`], ["matches", `Nos matchs · ${matches.data?.length ?? 0}`]] as const).map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
            className={cx("h-[40px] flex-1 items-center justify-center rounded-pill", tab === k ? "bg-surface-raised" : "")}>
            <Text className={cx("font-sans-bold text-sm", tab === k ? "text-text" : "text-text-muted")}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "answer" ? (
        <View className="gap-3">
          {rows.loading && !rows.data ? <Skeleton className="h-[180px]" /> : null}
          {open.map((r) => (
            <DesireCard key={r.desire.id} text={r.desire.body} value={r.answer ?? undefined} onChange={(a) => api.answerDesire(r.desire.id, a)} />
          ))}
          {locked.length ? (
            <Card className="gap-3">
              <View className="flex-row items-center gap-2">
                <Lock size={18} color={color.gold} />
                <Text className="flex-1 font-sans-bold text-base text-text">{locked.length} envies de plus avec Premium</Text>
              </View>
              {locked.slice(0, 2).map((r) => (
                <Text key={r.desire.id} className="font-sans text-sm text-text-muted">{"• " + blur(r.desire.body)}</Text>
              ))}
              <Button variant="secondary" icon={Sparkles} onPress={() => router.push("/premium")}>Découvrir Premium</Button>
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
                <Text className="font-sans text-sm text-on-accent-soft">{d.category} · vous avez dit oui tous les deux</Text>
              </View>
            </View>
          )) : (
            <EmptyState icon={Flame} title="Pas encore de match" body={`Continuez à répondre. Dès que ${them} et toi dites oui à la même envie, elle apparaît ici.`} />
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
