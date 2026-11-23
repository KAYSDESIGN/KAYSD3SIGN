import { Text, View } from "react-native";
import { router } from "expo-router";
import { CircleHelp, Heart, LockKeyhole, Sparkles } from "lucide-react-native";
import { withPartner } from "@/components/app/PairGate";
import { Screen } from "@/components/app/Screen";
import { ArrowLink, PHOTOS, SidePhoto, SoftCard } from "@/components/ui";
import { api, useQuery, type DailyView } from "@/data";
import { color } from "@/theme";
import { untilTomorrow } from "@/lib/day";

type Step = "todo" | "waiting" | "done";
const stepOf = (views?: DailyView[]): Step =>
  !views?.length ? "todo" : views.every((v) => v.mine && v.theirs) ? "done" : views.every((v) => v.mine) ? "waiting" : "todo";
const STATUS: Record<Step, string> = { todo: "", waiting: "En attente de l'autre", done: "Fait à deux" };

/** Petite pastille d'état, discrète, en haut à droite du texte. */
function Status({ step, onWine }: { step: Step; onWine?: boolean }) {
  if (step === "todo") return null;
  return <Text className="font-sans-semibold text-[11px]" style={{ color: onWine ? color["on-wine-muted"] : color["text-muted"] }}>{STATUS[step]}</Text>;
}

// Aujourd'hui : défi, quiz et envie secrète du jour
function Today() {
  const challenges = useQuery(api.getChallenges);
  const quizzes = useQuery(api.getQuizzes);
  const desires = useQuery(api.getDesires);

  const challenge = challenges.data?.[0];
  const qz = quizzes.data ?? [];
  const quizStep: Step = !qz.length ? "todo"
    : qz.every((r) => r.lastSession?.status === "revealed") ? "done"
    : qz.every((r) => r.lastSession && Object.keys(r.lastSession.mine).length >= r.quiz.questions.length) ? "waiting" : "todo";
  const des = desires.data ?? [];
  const desStep: Step = des.length && des.every((r) => r.answer) ? "done" : "todo";

  return (
    <Screen className="gap-6">
      <View className="gap-2">
        <Text className="font-sans-semibold text-[15px] text-text">{"Aujourd'hui"}</Text>
        <Text accessibilityRole="header" className="font-sans-semibold text-[30px] leading-[36px] text-text">Un peu plus nous.</Text>
        <Text className="font-sans text-[14px] text-text-muted">Trois façons de se retrouver, à votre rythme.</Text>
      </View>

      <SoftCard tone="rose" className="min-h-[168px] flex-row" onPress={() => router.push("/challenge")} label="Le défi du jour">
        <View className="flex-1 justify-between gap-3 p-[18px]">
          <View className="gap-2">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="font-sans-semibold text-[12px] text-text">Le défi du jour</Text>
              <Status step={stepOf(challenges.data)} />
            </View>
            <Text numberOfLines={4} className="font-sans-semibold text-[19px] leading-[25px] text-accent">
              {challenge?.assignment.prompt.body ?? "Un petit défi, rien que pour vous deux."}
            </Text>
            {challenges.data && challenges.data.length > 1 ? <Text className="font-sans text-[12px] text-text-muted">{`Et ${challenges.data.length - 1} défi coquin en bonus.`}</Text> : null}
          </View>
          <ArrowLink>Découvrir le défi</ArrowLink>
        </View>
        <SidePhoto photo={PHOTOS.couple} width="34%" />
      </SoftCard>

      <SoftCard tone="sand" className="gap-3 p-[18px]" onPress={() => router.push("/quiz")} label="Le quiz du jour">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <CircleHelp size={18} color={color.accent} strokeWidth={1.8} />
            <Text className="font-sans-semibold text-[12px] text-text">Le quiz du jour</Text>
          </View>
          <Status step={quizStep} />
        </View>
        <Text className="font-sans-semibold text-[19px] leading-[25px] text-accent">{"Qui connaît le mieux l'autre ?"}</Text>
        <Text className="font-sans text-[12.5px] text-text-muted">{`${qz.length > 1 ? `${qz.length} quiz de ` : ""}5 questions, quelques surprises.`}</Text>
        <ArrowLink>Faire le quiz</ArrowLink>
      </SoftCard>

      <SoftCard tone="wine" className="gap-3 p-[18px]" onPress={() => router.push("/desires")} label="Les envies secrètes du jour">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <LockKeyhole size={18} color={color["on-wine"]} strokeWidth={1.8} />
            <Text className="font-sans-semibold text-[12px]" style={{ color: color["on-wine"] }}>Les envies secrètes du jour</Text>
          </View>
          <Status step={desStep} onWine />
        </View>
        <Text className="font-sans-semibold text-[21px] leading-[27px]" style={{ color: color["on-wine"] }}>{"Ce soir, j'aimerais…"}</Text>
        <Text className="font-sans text-[12.5px]" style={{ color: color["on-wine-muted"] }}>
          {des.length ? `Chacun se confie. Vous découvrez ensemble. ${des.filter((r) => r.answer).length}/${des.length} répondues.` : "Chacun se confie. Vous découvrez ensemble."}
        </Text>
        <ArrowLink onWine>Partager une envie</ArrowLink>
      </SoftCard>

      <View className="flex-row items-center justify-center gap-2">
        <Heart size={14} color={color["text-muted"]} strokeWidth={1.8} />
        <Text className="font-sans text-[12px] text-text-muted">À deux, seulement si vous en avez envie.</Text>
      </View>
      <View className="flex-row items-center justify-center gap-2">
        <Sparkles size={13} color={color["text-muted"]} strokeWidth={1.8} />
        <Text className="font-sans text-[12px] text-text-muted">{`Tout se renouvelle dans ${untilTomorrow()}.`}</Text>
      </View>
    </Screen>
  );
}

export default withPartner(Today, { id: "S30", kicker: "Aujourd'hui", title: "Un peu plus nous.", body: "Chaque jour, un défi, un quiz et des envies secrètes à partager.", icon: Heart });
