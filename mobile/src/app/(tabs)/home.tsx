import { Image, Pressable, Text, View } from "react-native";
import { useAvatars } from "@/components/app/AvatarPicker";
import { router } from "expo-router";
import { CalendarClock, Camera, Heart, ListChecks, MapPin, MessageCircle, Smile, Sparkles, Target } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useGate } from "@/components/app/useGate";
import {
  Button, DailyCard, Glass, GlassList, HeroCard, ListRow, MOODS, SectionTitle, Toast,
  type DailyState,
} from "@/components/ui";
import { api, useQuery, type DailyView } from "@/data";
import { AVATAR_COLORS } from "@/theme";

const moodOf = (k?: string) => MOODS.find((m) => m.key === k);

function stateOf(v: DailyView): DailyState {
  if (!v.mine) return "todo";
  return v.theirs ? "revealed" : "waiting";
}

/** Bouton rond en verre avec les deux initiales (comme le bouton de compte de l'App Store). */
function CoupleButton({ me, them }: { me: string; them?: string }) {
  const photos = useAvatars();
  const bubble = (l: string, c: string, shift = 0, photo?: string | null) => (
    <View className="h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-pill" style={{ backgroundColor: c, marginLeft: shift, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" }}>
      {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
        : <Text className="font-display text-base" style={{ color: "#FFFFFF" }}>{l.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
  return (
    <Glass radius={999} className="flex-row px-[6px] py-[5px]">
      <Pressable accessibilityRole="button" accessibilityLabel="Profil du couple" onPress={() => router.push("/us")} className="flex-row">
        {bubble(me || "?", AVATAR_COLORS[0], 0, photos.mine)}
        {bubble(them || "+", them ? AVATAR_COLORS[1] : "rgba(120,100,130,0.6)", -10, them ? photos.partner : null)}
      </Pressable>
    </Glass>
  );
}

const SHORTCUTS = [
  { icon: Target, tone: "coral", title: "Défi du jour", subtitle: "Un petit défi à relever à deux", action: "Ouvrir", href: "/challenge" },
  { icon: Smile, tone: "violet", title: "Quiz à deux", subtitle: "Votre score de complicité", action: "Jouer", href: "/quiz" },
  { icon: CalendarClock, tone: "rose", title: "Soirée à deux", subtitle: "Proposer un jour, une heure, un thème", action: "Voir", href: "/plan" },
  { icon: MessageCircle, tone: "plum", title: "Petits mots", subtitle: "Rien que pour vous deux", action: "Écrire", href: "/notes" },
  { icon: ListChecks, tone: "amber", title: "Nos envies d'ailleurs", subtitle: "Voyages, sorties, premières fois", action: "Voir", href: "/bucket" },
  { icon: Camera, tone: "coral", title: "Moments", subtitle: "Vos photos à deux", action: "Voir", href: "/moments" },
  { icon: MapPin, tone: "night", title: "Carte à deux", subtitle: "Savoir que l'autre est bien rentré·e", action: "Voir", href: "/map" },
] as const;

function Shortcuts() {
  return (
    <GlassList>
      {SHORTCUTS.map((s, i) => (
        <ListRow key={s.href} first={i === 0} icon={s.icon} tone={s.tone} title={s.title} subtitle={s.subtitle} action={s.action} onPress={() => router.push(s.href as never)} />
      ))}
    </GlassList>
  );
}

/** Deux grands raccourcis en verre, comme sur la maquette. */
function Chips() {
  const chip = (emoji: string, label: string, href: string) => (
    <Glass radius={28} className="flex-1">
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(href as never)}
        className="h-[96px] justify-between px-4 py-[14px] active:opacity-70">
        <Text className="text-[22px]">{emoji}</Text>
        <Text className="font-sans-bold text-[15px] text-text">{label}</Text>
      </Pressable>
    </Glass>
  );
  return <View className="flex-row gap-3">{chip("🔥", "Envies", "/desires")}{chip("🎲", "Jouer", "/play")}</View>;
}

// S04 · Accueil
export default function Home() {
  const { profile, paired, gate } = useGate();
  if (gate !== "loading" && !paired) return <SoloHome name={profile?.display_name ?? ""} />;
  return <PairedHome />;
}

/** Accueil avant l'arrivée du/de la partenaire : on visite, on invite quand on veut. */
function SoloHome({ name }: { name: string }) {
  const couple = useQuery(api.getCouple);
  const code = couple.data?.invite_code ?? null;
  return (
    <Screen edges={["top"]}>
      <ScreenHeader title={`Bienvenue, ${name}`} right={<CoupleButton me={name} />} />

      {code ? (
        <HeroCard kicker="Ton code d'invitation · en attente" title={code.split("").join(" ")}>
          <Button size="lg" onPress={() => router.push("/onboarding/pair")}>Partager le code</Button>
          <Button variant="ghost" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })}>J'ai plutôt reçu un code</Button>
        </HeroCard>
      ) : (
        <HeroCard kicker="Pour commencer" title="Ton espace à deux t'attend">
          <Button size="lg" onPress={() => router.push("/onboarding/pair")}>Inviter</Button>
          <Button variant="ghost" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })}>J'ai reçu un code</Button>
        </HeroCard>
      )}

      <Chips />

      <SectionTitle title="Ce qui vous attend" />
      <Shortcuts />

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
  const partnerMood = moodOf(moods.data?.partner?.mood);
  const myMood = moodOf(moods.data?.mine?.mood);

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title={`Toi & ${them}`} right={<CoupleButton me={me} them={them} />} />

      <Pressable accessibilityRole="button" accessibilityLabel="Partager mon humeur" onPress={() => router.push("/mood")} className="-mt-3 flex-row items-center gap-2 active:opacity-60">
        <Text numberOfLines={1} className="flex-1 font-sans-semibold text-[13px] text-text-muted">
          {`🔥 ${streak} jour${streak > 1 ? "s" : ""}  ·  ${partnerMood ? `${them} : ${partnerMood.emoji} ${partnerMood.label}` : `${them} n'a pas partagé son humeur`}  ·  ${myMood ? `toi : ${myMood.emoji}` : "ton humeur"}`}
        </Text>
      </Pressable>

      {nudge.data ? <Toast tone="nudge">{`${them} : ${nudge.data.body}`}</Toast> : null}

      {today.loading && !today.data ? (
        <Skeleton className="h-[330px]" />
      ) : today.error ? (
        <Toast tone="error">Impossible de charger la question du jour. Réessaie dans un instant.</Toast>
      ) : (
        today.data?.map((v) => (
          <DailyCard
            key={v.assignment.id}
            kicker={v.assignment.slot === "question" ? "Question du jour" : "Question coquine"}
            spice={v.assignment.slot === "question" ? undefined : v.assignment.prompt.spice_level}
            prompt={v.assignment.prompt.body}
            state={stateOf(v)}
            partnerAnswered={v.partnerAnswered}
            mine={v.mine?.skipped ? "Passée" : v.mine?.body ?? undefined}
            theirs={v.theirs?.skipped ? "Passée" : v.theirs?.body ?? undefined}
            partnerName={them}
            onAnswer={() => router.push({ pathname: "/daily/[id]", params: { id: v.assignment.id } })}
          />
        ))
      )}

      {today.data && today.data.length === 1 ? (
        <GlassList>
          <ListRow first icon={Sparkles} tone="rose" title="Questions coquines" subtitle="Confirmez tous les deux votre âge et votre niveau d'audace" action="Débloquer" onPress={() => router.push("/age")} />
        </GlassList>
      ) : null}

      <Chips />

      <SectionTitle title="Pour vous deux" />
      <Shortcuts />

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

