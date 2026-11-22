import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CalendarClock, Camera, Heart, ListChecks, MapPin, MessageCircle, Smile, Sparkles, Target } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useGate } from "@/components/app/useGate";
import {
  DailyCard, Glass, GlassList, HeroCard, ListRow, MOODS, NudgeButton, Plate, PlateText, SectionTitle, StreakBadge, Toast, WhitePill,
  type DailyState,
} from "@/components/ui";
import { api, useQuery, type DailyView } from "@/data";
import { gradient } from "@/theme";

const moodOf = (k?: string) => MOODS.find((m) => m.key === k);

function stateOf(v: DailyView): DailyState {
  if (!v.mine) return "todo";
  return v.theirs ? "revealed" : "waiting";
}

/** Bouton rond en verre avec les deux initiales (comme le bouton de compte de l'App Store). */
function CoupleButton({ me, them }: { me: string; them?: string }) {
  const bubble = (l: string, c: string, shift = 0) => (
    <View className="h-[34px] w-[34px] items-center justify-center rounded-pill" style={{ backgroundColor: c, marginLeft: shift, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" }}>
      <Text className="font-display text-base" style={{ color: "#FFFFFF" }}>{l.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
  return (
    <Glass radius={999} className="flex-row px-[6px] py-[5px]">
      <Pressable accessibilityRole="button" accessibilityLabel="Profil du couple" onPress={() => router.push("/us")} className="flex-row">
        {bubble(me || "?", gradient[0])}
        {bubble(them || "+", them ? gradient[2] : "rgba(120,100,130,0.6)", -10)}
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
        <HeroCard art="violet" kicker="Ton code d'invitation" title={code.split("").join(" ")} minHeight={250}>
          <Plate className="flex-row items-center gap-3">
            <PlateText title="En attente de ton/ta partenaire" body="Dès que le code est saisi, tout s'ouvre." />
            <WhitePill label="Partager" onPress={() => router.push("/onboarding/pair")} />
          </Plate>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })} className="items-center py-1">
            <Text className="font-sans-bold text-sm" style={{ color: "#FFFFFF" }}>J'ai plutôt reçu un code</Text>
          </Pressable>
        </HeroCard>
      ) : (
        <HeroCard art="rose" kicker="Pour commencer" title="Ton espace à deux t'attend" minHeight={300}>
          <Plate className="flex-row items-center gap-3">
            <PlateText title="Invite ton/ta partenaire" body="Tu peux tout visiter avant." />
            <WhitePill label="Inviter" onPress={() => router.push("/onboarding/pair")} />
          </Plate>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })} className="items-center py-1">
            <Text className="font-sans-bold text-sm" style={{ color: "#FFFFFF" }}>J'ai reçu un code</Text>
          </Pressable>
        </HeroCard>
      )}

      <SectionTitle title="Aperçu" />
      <HeroCard art="ember" kicker="Question du jour" title="Quel moment de cette semaine aimerais-tu revivre avec moi ?" minHeight={230}>
        <Plate><PlateText title="Chaque jour une nouvelle question" body="Vous répondez chacun de votre côté, puis vous découvrez la réponse de l'autre." /></Plate>
      </HeroCard>

      <GlassList>
        <ListRow first icon={Sparkles} tone="rose" title="Mon niveau d'audace" subtitle="Confirme ton âge dès maintenant" action="Choisir" onPress={() => router.push("/age")} />
      </GlassList>

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

      <View className="flex-row items-center gap-2">
        <StreakBadge days={streak} />
        <Glass radius={999} shadow={false} className="flex-1">
          <Pressable accessibilityRole="button" accessibilityLabel="Partager mon humeur" onPress={() => router.push("/mood")} className="h-[34px] flex-row items-center gap-2 px-3">
            <Text className="text-sm">{partnerMood?.emoji ?? "💭"}</Text>
            <Text numberOfLines={1} className="flex-1 font-sans-semibold text-[13px] text-text">
              {partnerMood ? `${them} : ${partnerMood.label}` : `${them} n'a pas partagé son humeur`}
            </Text>
            <Text className="font-sans-bold text-[12px] text-accent">{myMood ? myMood.emoji : "Mon humeur"}</Text>
          </Pressable>
        </Glass>
      </View>

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

      <View className="flex-row flex-wrap gap-2">
        <NudgeButton icon={Heart} label="Tu me manques" onSend={() => api.sendNudge("Tu me manques")} />
        <NudgeButton icon={Sparkles} label="Je pense à toi" onSend={() => api.sendNudge("Je pense à toi")} />
      </View>

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

