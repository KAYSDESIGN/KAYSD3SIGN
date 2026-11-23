import { useState } from "react";
import { withPartner } from "@/components/app/PairGate";
import { Flame as FlameIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Flame, Lock, Sparkles } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Card, DesireCard, EmojiText, EmptyState, Muted, SPICE, SpiceBadge } from "@/components/ui";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { api, useQuery } from "@/data";
import { color, cx } from "@/theme";

// S21 · Envies secrètes : chacun répond en secret, seuls les oui communs apparaissent
function Desires() {
  const { partner } = useGate();
  const status = useQuery(api.getSpiceStatus);
  const rows = useQuery(api.getDesires, [status.data?.effective]);
  const matches = useQuery(api.getMutualDesires);
  const [tab, setTab] = useState<"answer" | "matches">("answer");
  const [extra, setExtra] = useState(0);
  const [showPast, setShowPast] = useState(false);
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (status.loading && !status.data) return <Screen edges={["top"]}><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[200px]" /></Screen>;

  if (!status.data?.effective) {
    return (
      <Screen edges={["top"]}>
        <ScreenHeader kicker="ENVIES SECRÈTES" title="Ce que vous n'osez pas dire" />
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
  const open = list.filter((r) => !r.locked);
  const locked = list.filter((r) => r.locked);

  // Envies du jour : 5 nouvelles chaque jour, dans le même ordre pour vous deux (plus de matchs).
  const today = localDay(new Date());
  const rank = (id: string) => hash(today + id);
  const answeredToday = open.filter((r) => r.answeredAt && localDay(new Date(r.answeredAt)) === today);
  const fresh = open.filter((r) => !r.answer).sort((a, b) => rank(a.desire.id) - rank(b.desire.id));
  const batch = [...answeredToday, ...fresh.slice(0, Math.max(0, DAILY + extra - answeredToday.length))]
    .sort((a, b) => rank(a.desire.id) - rank(b.desire.id));
  const past = open.filter((r) => r.answer && !answeredToday.includes(r));
  const doneToday = batch.every((r) => r.answer);
  const leftAfter = fresh.length - batch.filter((r) => !r.answer).length;
  const card = (r: (typeof list)[number]) => (
    <DesireCard key={r.desire.id} text={r.desire.body} kicker={`${r.desire.category} · ${SPICE[r.desire.spice_level].label}`}
      art={r.desire.spice_level === "hot" ? "night" : r.desire.spice_level === "spicy" ? "ember" : "violet"}
      value={r.answer ?? undefined} onChange={(a) => api.answerDesire(r.desire.id, a)} />
  );

  return (
    <Screen edges={["top"]}>
      <View className="flex-row items-center justify-between">
        <ScreenHeader kicker="ENVIES SECRÈTES" title="Ce que vous n'osez pas dire" right={<SpiceBadge level={status.data.effective} />} />
      </View>
      <Body className="text-text-muted">
        {`Chaque jour, 5 nouvelles envies. Réponds oui, peut-être ou non. ${them} ne verra jamais tes réponses, seulement ce que vous voulez tous les deux.`}
      </Body>

      <View accessibilityRole="tablist" className="flex-row rounded-pill bg-surface p-1">
        {([["answer", `Du jour · ${batch.filter((r) => r.answer).length}/${batch.length}`], ["matches", `Nos matchs · ${matches.data?.length ?? 0}`]] as const).map(([k, l]) => (
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
          {rows.data && doneToday ? (
            <Card className="gap-3">
              <EmojiText size={18} className="font-sans-bold text-base text-text">
                {leftAfter > 0 ? "🔥 C'est tout pour aujourd'hui" : "🔥 Vous avez fait le tour de toutes les envies"}
              </EmojiText>
              <Muted>{leftAfter > 0 ? `${DAILY} nouvelles envies t'attendent demain. Encore ${leftAfter} à découvrir.` : "De nouvelles envies arriveront bientôt."}</Muted>
              {leftAfter > 0 ? <Button variant="secondary" onPress={() => setExtra((n) => n + DAILY)}>{`Voir ${Math.min(DAILY, leftAfter)} envies de plus maintenant`}</Button> : null}
            </Card>
          ) : null}
          {past.length ? (
            <>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPast }} onPress={() => setShowPast((v) => !v)} className="py-2 active:opacity-60">
                <Text className="font-sans-bold text-sm text-text-muted">{`${showPast ? "Masquer" : "Revoir"} mes réponses précédentes (${past.length})`}</Text>
              </Pressable>
              {showPast ? past.map(card) : null}
            </>
          ) : null}
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

const DAILY = 5;
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function hash(str: string) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

/** Montre juste le début, pour donner envie sans tout dévoiler. */
function blur(t: string) { const w = t.split(" "); return w.slice(0, 2).join(" ") + " …"; }

export default withPartner(Desires, { id: "S21", kicker: "Envies secrètes", title: "Ce que vous n'osez pas dire", body: "Chacun répond oui, peut-être ou non, en secret. Seuls vos oui communs apparaissent, jamais un non ni un peut-être.", example: "Un massage aux huiles, sans se presser", icon: FlameIcon }, { tabs: true });
