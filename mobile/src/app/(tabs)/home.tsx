import { useState } from "react";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useAvatars } from "@/components/app/AvatarPicker";
import { router } from "expo-router";
import { Bell, Heart, Mail, Send, Wine } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import {
  Button, ExploreTile, PHOTOS, PhotoCard, PillButton, SidePhoto, SoftCard, Toast,
} from "@/components/ui";
import { api, useQuery, type DailyView } from "@/data";
import { AVATAR_COLORS, color, cx, HEART } from "@/theme";

/** Les deux avatars qui se chevauchent : ouvre le profil du couple. */
function CoupleButton({ me, them }: { me: string; them?: string }) {
  const photos = useAvatars();
  const bubble = (l: string, c: string, shift = 0, photo?: string | null) => (
    <View className="h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-pill" style={{ backgroundColor: c, marginLeft: shift, borderWidth: 2, borderColor: color.bg }}>
      {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
        : <Text className="font-sans-bold text-[13px]" style={{ color: "#FFFFFF" }}>{l.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Profil du couple" onPress={() => router.push("/us")} className="flex-row active:opacity-70">
      {bubble(me || "?", AVATAR_COLORS[0], 0, photos.mine)}
      {bubble(them || "+", them ? AVATAR_COLORS[1] : "rgba(120,100,110,0.6)", -9, them ? photos.partner : null)}
    </Pressable>
  );
}

/** En-tête : nom de l'app, avatars, cloche (nouveau mot du partenaire → point rouge). */
function TopBar({ me, them, unread }: { me: string; them?: string; unread?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans-bold text-[15px] text-accent">HotCouple</Text>
      <View className="flex-row items-center gap-4">
        <CoupleButton me={me} them={them} />
        <Pressable accessibilityRole="button" accessibilityLabel={unread ? "Nouveau message" : "Messages"} onPress={() => router.push("/chat")} className="active:opacity-60">
          <Bell size={22} color={color.accent} strokeWidth={1.8} />
          {unread ? <View className="absolute right-[1px] top-0 h-[8px] w-[8px] rounded-pill" style={{ backgroundColor: HEART }} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

function Greeting() {
  return (
    <View className="flex-row items-center gap-2">
      <Text accessibilityRole="header" className="font-sans-semibold text-[26px] leading-[32px] text-text">Bonjour, mon amour</Text>
      {/* léger décalage : l'icône s'aligne sur les lettres, pas sur la hauteur de ligne */}
      <Heart size={22} color={color.text} strokeWidth={1.8} style={{ marginTop: 5 }} />
    </View>
  );
}

/** Le bouton d'une carte du jour selon où vous en êtes. */
function actionOf(v: DailyView, them: string) {
  if (!v.mine) return "Répondre à deux";
  return v.theirs ? "Voir vos réponses" : `En attente de ${them}`;
}

/** Carrousel horizontal : question du jour, puis question coquine. */
function DailyCarousel({ today, them }: { today?: DailyView[]; them: string }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 560) - 40 - 28; // la carte suivante dépasse un peu, comme une invitation à glisser
  const [page, setPage] = useState(0);
  const open = (v: DailyView) => router.push({ pathname: "/daily/[id]", params: { id: v.assignment.id } });
  const question = today?.find((v) => v.assignment.slot === "question");
  const spicy = today?.find((v) => v.assignment.slot === "spicy_question");
  const cards = [
    question
      ? <PhotoCard key="q" width={cardW} photo={PHOTOS.question} chip="Question du jour" title={question.assignment.prompt.body} action={actionOf(question, them)} onPress={() => open(question)} />
      : null,
    spicy
      ? <PhotoCard key="s" width={cardW} photo={PHOTOS.spicy} chip="Question coquine" title={spicy.assignment.prompt.body} action={actionOf(spicy, them)} onPress={() => open(spicy)} />
      : <PhotoCard key="s" width={cardW} photo={PHOTOS.spicy} chip="Question coquine" title="Confirmez tous les deux votre âge pour pimenter vos journées." action="Débloquer" onPress={() => router.push("/age")} />,
  ].filter(Boolean);
  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + 12} decelerationRate="fast"
        className="-mx-5" contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + 12)))} scrollEventThrottle={32}>
        {cards}
      </ScrollView>
      <View className="flex-row items-center justify-center gap-[6px]" accessibilityLabel={`Carte ${page + 1} sur ${cards.length}`}>
        {cards.map((_, i) => (
          <View key={i} className="h-[4px] rounded-pill" style={{ width: i === page ? 18 : 6, backgroundColor: i === page ? color.accent : color["accent-soft"] }} />
        ))}
      </View>
    </View>
  );
}

function Explore() {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-sans-semibold text-[22px] text-text">À explorer</Text>
      <View className="flex-row gap-3">
        <ExploreTile icon={Wine} tone="rose" label="Soirée à deux" onPress={() => router.push("/plan")} />
        <ExploreTile icon={Send} tone="sand" label="Nos envies d'ailleurs" onPress={() => router.push("/bucket")} />
        <ExploreTile icon={Mail} tone="rose" label="Petits mots" onPress={() => router.push("/notes")} />
      </View>
    </View>
  );
}

/** La carte « Aujourd'hui » : le rituel à deux (défi, quiz, envie secrète). */
function TodayCard() {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text accessibilityRole="header" className="font-sans-semibold text-[22px] text-text">{"Aujourd'hui"}</Text>
        <Text className="font-sans text-[13px] text-text-muted">À votre rythme</Text>
      </View>
      <SoftCard tone="rose" className="min-h-[142px] flex-row">
        <View className="flex-1 justify-between gap-3 p-[18px]">
          <View className="gap-1">
            <Text className="font-sans-semibold text-[10.5px] tracking-[1.2px] text-text-muted">VOTRE RITUEL À DEUX</Text>
            <Text className="font-sans-semibold text-[19px] leading-[24px] text-accent">{"Trois rendez-vous rien qu'à nous"}</Text>
          </View>
          <PillButton onPress={() => router.push("/today")} label="On joue : défi, quiz et envie du jour">On joue</PillButton>
        </View>
        <SidePhoto photo={PHOTOS.ritual} width="40%" />
      </SoftCard>
    </View>
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
      <TopBar me={name} />
      <Text accessibilityRole="header" className="font-sans-semibold text-[26px] leading-[32px] text-text">{`Bienvenue, ${name}`}</Text>
      <SoftCard tone="wine" className="gap-4 p-5">
        <Text className="font-sans-semibold text-[12px] tracking-[1.2px]" style={{ color: color["on-wine-muted"] }}>{code ? "TON CODE D'INVITATION · EN ATTENTE" : "POUR COMMENCER"}</Text>
        <Text className="font-sans-semibold text-[22px] leading-[28px]" style={{ color: color["on-wine"] }}>{code ? code.split("").join(" ") : "Ton espace à deux t'attend"}</Text>
        <Button size="lg" variant="secondary" onPress={() => router.push("/onboarding/pair")}>{code ? "Partager le code" : "Inviter"}</Button>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/onboarding/pair", params: { mode: "join" } })} className="items-center py-1 active:opacity-60">
          <Text className="font-sans-semibold text-[14px]" style={{ color: color["on-wine"] }}>{code ? "J'ai plutôt reçu un code" : "J'ai reçu un code"}</Text>
        </Pressable>
      </SoftCard>
      <Explore />
      <View className="gap-3">
        <Text accessibilityRole="header" className="font-sans-semibold text-[22px] text-text">Chaque jour, à deux</Text>
        <SoftCard tone="sand" onPress={() => router.push("/challenge")} label="Défi du jour" className="p-4"><Text className="font-sans-semibold text-[15px] text-text">Défi du jour</Text><Text className="font-sans text-[13px] text-text-muted">Deux défis nouveaux chaque jour</Text></SoftCard>
        <SoftCard tone="rose" onPress={() => router.push("/quiz")} label="Quiz à deux" className="p-4"><Text className="font-sans-semibold text-[15px] text-text">Quiz à deux</Text><Text className="font-sans text-[13px] text-text-muted">5 nouvelles questions chaque jour</Text></SoftCard>
        <SoftCard tone="sand" onPress={() => router.push("/desires")} label="Envies secrètes" className="p-4"><Text className="font-sans-semibold text-[15px] text-text">Envies secrètes</Text><Text className="font-sans text-[13px] text-text-muted">5 envies épicées par jour, vos matchs du jour</Text></SoftCard>
      </View>
      {api.dev.enabled && code ? <DevPanel actions={[{ label: "Sam rejoint avec le code", onPress: () => api.dev.partnerJoins() }]} /> : null}
    </Screen>
  );
}

function PairedHome() {
  const { profile, partner } = useGate();
  const today = useQuery(api.getToday);
  const nudge = useQuery(api.getLastNudgeFromPartner);
  const me = profile?.display_name ?? "";
  const them = partner?.display_name ?? "";

  return (
    <Screen edges={["top"]} className="gap-7">
      <View className="gap-4">
        <TopBar me={me} them={them} unread={!!nudge.data} />
        <Greeting />
      </View>

      {nudge.data ? <Toast tone="nudge">{`${them} : ${nudge.data.body}`}</Toast> : null}

      {today.loading && !today.data ? (
        <Skeleton className="h-[208px] rounded-[24px]" />
      ) : today.error ? (
        <Toast tone="error">Impossible de charger la question du jour. Réessaie dans un instant.</Toast>
      ) : (
        <DailyCarousel today={today.data} them={them} />
      )}

      <Explore />
      <TodayCard />
      <Text className={cx("text-center font-sans text-[12px] text-text-muted")}>Profil, moments et carte : touchez vos avatars en haut.</Text>

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
