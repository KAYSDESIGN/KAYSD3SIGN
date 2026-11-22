import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CalendarClock, Camera, Heart, Lock, ListChecks, MessageCircle, Smile, Sparkles, Target } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { InviteButtons } from "@/components/app/PairGate";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import {
  Body, Button, Caption, Card, CoupleAvatars, Glass, DailyCard, Heading, Muted, MOODS, NudgeButton, StreakBadge, Title, Toast, type DailyState,
} from "@/components/ui";
import { api, useQuery, type DailyView } from "@/data";
import { color } from "@/theme";

const moodEmoji = (k?: string) => MOODS.find((m) => m.key === k)?.emoji;

function stateOf(v: DailyView): DailyState {
  if (!v.mine) return "todo";
  return v.theirs ? "revealed" : "waiting";
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Encore debout" : h < 12 ? "Bonjour" : h < 18 ? "Bel après-midi" : "Bonsoir";
}

// S04 · Accueil
export default function Home() {
  const { profile, partner, paired, gate } = useGate();
  if (gate !== "loading" && !paired) return <SoloHome name={profile?.display_name ?? ""} />;
  return <PairedHome />;
}

/** Accueil avant l'arrivée du/de la partenaire : on visite, on invite quand on veut. */
function SoloHome({ name }: { name: string }) {
  const couple = useQuery(api.getCouple);
  const code = couple.data?.invite_code ?? null;
  return (
    <Screen edges={["top"]}>
      <View className="gap-1">
        <Caption>{greeting()}, {name}</Caption>
        <Heading>Ton espace à deux t'attend</Heading>
      </View>

      {code ? (
        <Card raised className="items-center gap-3 py-5">
          <Caption>Ton code d'invitation</Caption>
          <Text accessibilityLabel={`Ton code : ${code.split("").join(" ")}`} className="font-sans-bold text-display tracking-[8px] text-text">{code}</Text>
          <Muted className="text-center">En attente de ton/ta partenaire. Dès qu'il ou elle l'a saisi, tout s'ouvre.</Muted>
          <Button variant="secondary" onPress={() => router.push("/onboarding/pair")}>Partager le code</Button>
          <Button variant="ghost" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })}>J'ai plutôt reçu un code</Button>
        </Card>
      ) : (
        <Card raised className="gap-3">
          <Title>Invite ton/ta partenaire</Title>
          <Body className="text-text-muted">Tu peux tout visiter avant. Les questions, les jeux et les envies s'ouvrent dès que vous êtes deux.</Body>
          <InviteButtons />
        </Card>
      )}

      <View className="gap-3 rounded-lg border border-dashed border-border p-5">
        <View className="flex-row items-center justify-between">
          <Caption>Aperçu · question du jour</Caption>
          <Lock size={16} color={color["text-muted"]} />
        </View>
        <Text className="font-display text-xl text-text">Quel moment de cette semaine aimerais-tu revivre avec moi ?</Text>
        <Muted>Chaque jour une nouvelle question. Vous répondez chacun de votre côté, puis vous découvrez la réponse de l'autre.</Muted>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push("/age")} className="rounded-md border border-glass-edge bg-surface p-4 active:bg-surface-raised">
        <Text className="font-sans-semibold text-sm text-text">🌶️ Choisir mon niveau d'audace</Text>
        <Muted>Confirme ton âge dès maintenant. Le contenu coquin s'ouvrira quand vous l'aurez fait tous les deux.</Muted>
      </Pressable>

      <View className="gap-3">
        <Caption>Ce qui vous attend</Caption>
        <View className="flex-row flex-wrap gap-2">
          <Shortcut icon={Target} label="Défi du jour" href="/challenge" />
          <Shortcut icon={Camera} label="Moments" href="/moments" />
          <Shortcut icon={Smile} label="Quiz" href="/quiz" />
          <Shortcut icon={CalendarClock} label="Soirée à deux" href="/plan" />
          <Shortcut icon={ListChecks} label="Nos envies d'ailleurs" href="/bucket" />
          <Shortcut icon={MessageCircle} label="Petits mots" href="/notes" />
        </View>
      </View>

      {api.dev.enabled && code ? <DevPanel actions={[{ label: "Sam rejoint avec le code", onPress: () => api.dev.partnerJoins() }]} /> : null}
    </Screen>
  );
}

function PairedHome() {
  const { profile, partner } = useGate();
  const couple = useQuery(api.getCouple);
  const today = useQuery(api.getToday);
  const moods = useQuery(api.getMoods);
  const nudge = useQuery(api.getLastNudgeFromPartner);

  const me = profile?.display_name ?? "";
  const them = partner?.display_name ?? "";
  const streak = couple.data?.streak_count ?? 0;
  const broken = !!couple.data?.streak_last_day && streak > 0 && isOlderThanYesterday(couple.data.streak_last_day);

  return (
    <Screen edges={["top"]}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1 pr-3">
          <Caption>{greeting()}, {me}</Caption>
          <Heading numberOfLines={2}>Toi et {them}</Heading>
        </View>
        <StreakBadge days={broken ? 0 : streak} broken={broken} />
      </View>

      <View className="flex-row items-center gap-4">
        <CoupleAvatars me={{ name: me || "?", mood: moodEmoji(moods.data?.mine?.mood) }} partner={{ name: them || "?", mood: moodEmoji(moods.data?.partner?.mood) }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Partager mon humeur" onPress={() => router.push("/mood")} className="flex-1 rounded-md border border-glass-edge bg-surface px-4 py-3 active:bg-surface-raised">
          <Text className="font-sans-semibold text-sm text-text">{moods.data?.mine ? "Changer mon humeur" : "Comment tu te sens ?"}</Text>
          <Text numberOfLines={1} className="font-sans text-sm text-text-muted">
            {moods.data?.partner ? `${them} : ${MOODS.find((m) => m.key === moods.data?.partner?.mood)?.label}` : `${them} n'a pas encore partagé son humeur`}
          </Text>
        </Pressable>
      </View>

      {nudge.data ? <Toast tone="nudge">{`${them} : ${nudge.data.body}`}</Toast> : null}

      <View className="flex-row flex-wrap gap-2">
        <NudgeButton icon={Heart} label="Tu me manques" onSend={() => api.sendNudge("Tu me manques")} />
        <NudgeButton icon={Sparkles} label="Je pense à toi" onSend={() => api.sendNudge("Je pense à toi")} />
      </View>

      <View className="gap-3">
        {today.loading && !today.data ? (
          <Skeleton className="h-[200px]" />
        ) : today.error ? (
          <Toast tone="error">Impossible de charger la question du jour. Tire vers le bas pour réessayer.</Toast>
        ) : (
          today.data?.map((v) => (
            <DailyCard
              key={v.assignment.id}
              kicker={v.assignment.slot === "question" ? "Question du jour" : "Question coquine"}
              spice={v.assignment.slot === "question" ? undefined : v.assignment.prompt.spice_level}
              prompt={v.assignment.prompt.body}
              state={stateOf(v)}
              mine={v.mine?.skipped ? "Passée" : v.mine?.body ?? undefined}
              theirs={v.theirs?.skipped ? "Passée" : v.theirs?.body ?? undefined}
              partnerName={them}
              onAnswer={() => router.push({ pathname: "/daily/[id]", params: { id: v.assignment.id } })}
            />
          ))
        )}
        {today.data && today.data.length === 1 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/age")} className="rounded-md border border-dashed border-border p-4 active:bg-surface">
            <Text className="font-sans-semibold text-sm text-text">🌶️ Débloquer les questions coquines</Text>
            <Muted>Confirmez tous les deux votre âge et choisissez votre niveau d'audace.</Muted>
          </Pressable>
        ) : null}
      </View>

      <View className="gap-3">
        <Caption>Pour vous deux</Caption>
        <View className="flex-row flex-wrap gap-2">
          <Shortcut icon={Target} label="Défi du jour" href="/challenge" />
          <Shortcut icon={Camera} label="Moments" href="/moments" />
          <Shortcut icon={Smile} label="Quiz" href="/quiz" />
          <Shortcut icon={CalendarClock} label="Soirée à deux" href="/plan" />
          <Shortcut icon={ListChecks} label="Nos envies d'ailleurs" href="/bucket" />
          <Shortcut icon={MessageCircle} label="Petits mots" href="/notes" />
        </View>
      </View>

      {api.dev.enabled && today.data?.length ? (
        <DevPanel actions={[
          ...today.data.filter((v) => !v.partnerAnswered).map((v) => ({
            label: `Sam répond (${v.assignment.slot === "question" ? "question" : "coquine"})`,
            onPress: () => api.dev.partnerAnswers(v.assignment.id, v.assignment.slot === "question" ? undefined : "Doucement, dans le cou."),
          })),
          { label: "Sam : humeur 🔥", onPress: () => api.dev.partnerMood("in_the_mood") },
          { label: "Sam envoie un nudge", onPress: () => api.dev.partnerNudge() },
        ]} />
      ) : null}
    </Screen>
  );
}

function Shortcut({ icon: Icon, label, href }: { icon: typeof Heart; label: string; href: string }) {
  return (
    <Glass radius={22} className="grow basis-[30%]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => router.push(href as never)}
        className="min-h-[92px] items-start justify-between p-3 active:bg-surface"
      >
        <View className="h-[34px] w-[34px] items-center justify-center rounded-pill bg-accent-soft">
          <Icon size={18} color={color.accent} />
        </View>
        <Text numberOfLines={2} className="font-sans-semibold text-sm text-text">{label}</Text>
      </Pressable>
    </Glass>
  );
}

function isOlderThanYesterday(day: string) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return day < y.toISOString().slice(0, 10);
}
