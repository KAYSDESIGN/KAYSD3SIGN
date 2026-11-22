import { useState } from "react";
import { Text, View } from "react-native";
import { CalendarHeart, Trash2 } from "lucide-react-native";
import { DateFields, toIso, type DateParts } from "@/components/app/DateFields";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Button, Caption, Card, Checkbox, EmptyState, Heading, IconButton, TextField } from "@/components/ui";
import { api, useMutation, useQuery, type SpecialDate } from "@/data";

/** Prochaine occurrence (aujourd'hui compris) et nombre de jours restants. */
function nextOccurrence(d: SpecialDate, today = new Date()) {
  const t = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const [y, m, day] = d.date.split("-").map(Number);
  let next = new Date(Date.UTC(d.repeats_yearly ? t.getUTCFullYear() : y, m - 1, day));
  if (d.repeats_yearly && next < t) next = new Date(Date.UTC(t.getUTCFullYear() + 1, m - 1, day));
  return { next, days: Math.round((next.getTime() - t.getTime()) / 864e5) };
}

function countdown(days: number) {
  if (days < 0) return "Passé";
  if (days === 0) return "Aujourd'hui !";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}

// S15 · Nos dates : anniversaires et comptes à rebours
export default function Dates() {
  const list = useQuery(api.getSpecialDates);
  const add = useMutation(api.addSpecialDate);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<DateParts>({ d: "", m: "", y: "" });
  const [yearly, setYearly] = useState(true);
  const iso = toIso(date);

  const sorted = (list.data ?? []).map((d) => ({ d, ...nextOccurrence(d) })).sort((a, b) => (a.days < 0 ? 1e6 : a.days) - (b.days < 0 ? 1e6 : b.days));
  const submit = async () => {
    if (!title.trim() || !iso) return;
    await add.mutate(title, iso, yearly);
    setTitle(""); setDate({ d: "", m: "", y: "" });
  };

  return (
    <Screen>
      <Caption>Nos dates</Caption>
      <Heading>Ce qu'on attend avec impatience</Heading>

      {list.loading && !list.data ? <Skeleton className="h-[120px]" /> : sorted.length ? (
        <View className="gap-2">
          {sorted.map(({ d, next, days }, i) => (
            <View key={d.id} className={`flex-row items-center gap-3 rounded-md border p-4 ${i === 0 && days >= 0 ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}>
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-text">{d.title}</Text>
                <Text className="font-sans text-sm text-text-muted">
                  {next.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{d.repeats_yearly ? " · chaque année" : ""}
                </Text>
              </View>
              <Text className={`font-sans-bold text-sm ${days === 0 ? "text-gold" : "text-text"}`}>{countdown(days)}</Text>
              <IconButton icon={Trash2} label={`Supprimer ${d.title}`} onPress={() => api.deleteSpecialDate(d.id)} />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState icon={CalendarHeart} title="Aucune date pour l'instant" body="Votre rencontre, votre premier baiser, vos retrouvailles : ajoutez ce qui compte." />
      )}

      <Card className="gap-3">
        <TextField label="Quoi ?" value={title} onChangeText={setTitle} placeholder="Ex. Notre rencontre" maxLength={100} />
        <DateFields label="Quand ?" value={date} onChange={setDate} error={add.error ?? undefined} />
        <Checkbox checked={yearly} onChange={setYearly} label="Revient chaque année" />
        <Button onPress={submit} loading={add.pending} disabled={!title.trim() || !iso}>Ajouter la date</Button>
      </Card>
    </Screen>
  );
}
