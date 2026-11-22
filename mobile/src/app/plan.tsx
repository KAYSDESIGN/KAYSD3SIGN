import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CalendarClock } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Button, Caption, Card, EmptyState, Heading, Muted, TextField, Title, Toast } from "@/components/ui";
import { api, useMutation, useQuery, type DatePlan } from "@/data";
import { cx } from "@/theme";

const DAYS = [
  { key: "tonight", label: "Ce soir", offset: () => 0 },
  { key: "tomorrow", label: "Demain", offset: () => 1 },
  { key: "saturday", label: "Samedi", offset: () => { const d = new Date().getDay(); return ((6 - d + 7) % 7) || 7; } },
] as const;
const HOURS = [19, 20, 21, 22];
const STATUS: Record<DatePlan["status"], string> = { proposed: "En attente", accepted: "C'est noté ❤️", declined: "Refusée", done: "Passée", cancelled: "Annulée" };

function when(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

// S27 · Proposer une soirée
export default function Plan() {
  const { profile, partner } = useGate();
  const plans = useQuery(api.getDatePlans);
  const propose = useMutation(api.proposeDate);
  const respond = useMutation(api.respondToDate);
  const [day, setDay] = useState<(typeof DAYS)[number]["key"]>("saturday");
  const [hour, setHour] = useState(20);
  const [theme, setTheme] = useState("");
  const them = partner?.display_name ?? "l'autre";

  const startsAt = () => { const d = new Date(); d.setDate(d.getDate() + DAYS.find((x) => x.key === day)!.offset()); d.setHours(hour, 0, 0, 0); return d; };
  const past = startsAt() <= new Date();
  const upcoming = (plans.data ?? []).filter((p) => ["proposed", "accepted"].includes(p.status) && new Date(p.starts_at) > new Date());

  return (
    <Screen>
      <Caption>Soirée à deux</Caption>
      <Heading>On se réserve une soirée ?</Heading>

      {plans.loading && !plans.data ? <Skeleton className="h-[100px]" /> : upcoming.length ? (
        <View className="gap-2">
          {upcoming.map((p) => {
            const mine = p.proposed_by === profile?.id;
            return (
              <Card key={p.id} className={cx("gap-2", p.status === "accepted" && "border-accent")}>
                <Text className="font-sans-bold text-base text-text">{when(p.starts_at)}</Text>
                {p.theme ? <Text className="font-sans text-base text-text">{p.theme}</Text> : null}
                <Muted>{`${mine ? "Proposée par toi" : `Proposée par ${them}`} · ${STATUS[p.status]}`}</Muted>
                {!mine && p.status === "proposed" ? (
                  <View className="flex-row gap-2">
                    <Button className="flex-1" onPress={() => respond.mutate(p.id, "accepted")}>Avec plaisir</Button>
                    <Button className="flex-1" variant="secondary" onPress={() => respond.mutate(p.id, "declined")}>Pas cette fois</Button>
                  </View>
                ) : mine ? (
                  <Button variant="ghost" onPress={() => respond.mutate(p.id, "cancelled")}>Annuler</Button>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState icon={CalendarClock} title="Rien de prévu" body={`Proposez une date à ${them}. Un rappel vous attendra le jour J.`} />
      )}
      {respond.error ? <Toast tone="error">{respond.error}</Toast> : null}

      <Card className="gap-3">
        <Title>Nouvelle proposition</Title>
        <Chips label="Quel jour ?" options={DAYS.map((d) => ({ key: d.key, label: d.label }))} value={day} onChange={(k) => setDay(k as typeof day)} />
        <Chips label="À quelle heure ?" options={HOURS.map((h) => ({ key: String(h), label: `${h} h` }))} value={String(hour)} onChange={(k) => setHour(Number(k))} />
        <TextField label="Le thème (facultatif)" value={theme} onChangeText={setTheme} placeholder="Ex. Dîner aux chandelles, tenue chic" maxLength={200}
          error={past ? "Cette heure est déjà passée." : propose.error ?? undefined} />
        <Button disabled={past} loading={propose.pending} onPress={async () => { await propose.mutate(startsAt().toISOString(), theme); setTheme(""); }}>{`Proposer à ${them}`}</Button>
      </Card>

      {api.dev.enabled ? (
        <DevPanel actions={[
          { label: "Sam propose une soirée", onPress: () => api.dev.partnerProposesDate() },
          ...upcoming.filter((p) => p.proposed_by === profile?.id && p.status === "proposed").map((p) => ({ label: "Sam accepte", onPress: () => api.dev.partnerAnswersDate(p.id) })),
        ]} />
      ) : null}
    </Screen>
  );
}

function Chips({ label, options, value, onChange }: { label: string; options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <View className="gap-2">
      <Text className="font-sans-semibold text-sm text-text">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ checked: o.key === value }} onPress={() => onChange(o.key)}
            className={cx("h-[40px] justify-center rounded-pill border px-4", o.key === value ? "border-accent bg-accent-soft" : "border-border bg-bg")}>
            <Text className={cx("font-sans-semibold text-sm", o.key === value ? "text-on-accent-soft" : "text-text-muted")}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
