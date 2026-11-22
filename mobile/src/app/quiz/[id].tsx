import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { withPartner } from "@/components/app/PairGate";
import { Smile as SmileIcon } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, SearchX } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, Card, Display, EmptyState, GradientFill, Heading, Muted, Toast } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";
import { cx } from "@/theme";

function verdict(score: number) {
  if (score >= 80) return "Âmes sœurs, ou presque.";
  if (score >= 50) return "Bien accordés, avec de jolies surprises.";
  return "Vous avez encore plein de choses à vous apprendre.";
}

// S10 · Partie de quiz : une question à la fois, puis le résultat
function QuizPlay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { partner } = useGate();
  const data = useQuery(() => api.getQuizSession(id), [id]);
  const answer = useMutation(api.answerQuiz);
  const [picked, setPicked] = useState<number[]>([]);
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (data.loading && !data.data) return <Screen><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[260px]" /></Screen>;
  if (!data.data) return <Screen><EmptyState icon={SearchX} title="Quiz introuvable" body="Il a peut-être été effacé." action="Retour" onAction={() => router.replace("/quiz")} /></Screen>;

  const { quiz, session } = data.data;
  const next = quiz.questions.find((q) => session.mine[q.id] === undefined);
  const done = quiz.questions.filter((q) => session.mine[q.id] !== undefined).length;

  if (next) {
    const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    const submit = async () => {
      if (!picked.length) return;
      await answer.mutate(session.id, next.id, picked);
      setPicked([]);
    };
    return (
      <Screen>
        <Caption>{`${quiz.title} · ${done + 1} sur ${quiz.questions.length}`}</Caption>
        <View className="h-[6px] overflow-hidden rounded-pill bg-surface">
          <View className="h-full overflow-hidden rounded-pill" style={{ width: `${((done + 1) / quiz.questions.length) * 100}%` }}><GradientFill sheen={false} /></View>
        </View>
        <Heading>{next.body}</Heading>
        <Muted>Plusieurs réponses possibles.</Muted>
        <View accessibilityLabel={next.body} className="gap-2">
          {next.choices.map((c, i) => {
            const on = picked.includes(i);
            return (
              <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: answer.pending }} disabled={answer.pending}
                onPress={() => toggle(i)}
                className={cx("lg min-h-[56px] flex-row items-center gap-3 rounded-[20px] px-4", on ? "bg-accent-soft" : "bg-surface")}>
                <View className={cx("h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[8px] border-2", on ? "border-transparent" : "border-border-input")}>
                  {on ? <><GradientFill sheen={false} /><View><Check size={15} color="#FFFFFF" strokeWidth={3} /></View></> : null}
                </View>
                <Text className="flex-1 font-sans-semibold text-base text-text">{c}</Text>
              </Pressable>
            );
          })}
        </View>
        {answer.error ? <Toast tone="error">{answer.error}</Toast> : null}
        <Button size="lg" onPress={submit} loading={answer.pending} disabled={!picked.length}>
          {done + 1 === quiz.questions.length ? "Valider et terminer" : "Valider"}
        </Button>
        <Muted>{`${them} ne verra tes réponses qu'à la fin, et toi les siennes.`}</Muted>
      </Screen>
    );
  }

  if (session.status !== "revealed") {
    return (
      <Screen>
        <Caption>{quiz.title}</Caption>
        <Heading>{"C'est envoyé !"}</Heading>
        <Body className="text-text-muted">{`Votre score s'affichera dès que ${them} aura répondu à son tour.`}</Body>
        <Button variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/quiz"))}>Retour aux quiz</Button>
        {api.dev.enabled ? <DevPanel actions={[{ label: "Sam répond au quiz", onPress: () => api.dev.partnerAnswersQuiz(session.id) }]} /> : null}
      </Screen>
    );
  }

  const score = session.match_score ?? 0;
  return (
    <Screen>
      <Caption>{quiz.title}</Caption>
      <View accessible accessibilityLabel={`${score} pour cent de complicité`} className="items-center gap-1 py-2">
        <Display className="text-accent">{score} %</Display>
        <Body className="text-center">{verdict(score)}</Body>
      </View>
      <View className="gap-2">
        {quiz.questions.map((q) => {
          const a = session.mine[q.id] ?? []; const b = session.theirs?.[q.id] ?? [];
          const common = a.filter((x) => b.includes(x));
          const same = common.length > 0;
          return (
            <Card key={q.id} className={cx("gap-2", same && "border-accent")}>
              <Text className="font-sans-bold text-sm text-text">{q.body}</Text>
              <View className="flex-row gap-2">
                <Answer who="Toi" text={a.map((i) => q.choices[i]).join(", ")} />
                <Answer who={them} text={b.length ? b.map((i) => q.choices[i]).join(", ") : "-"} accent />
              </View>
              {same ? <Text className="font-sans-bold text-xs text-accent">{`♥ En commun : ${common.map((i) => q.choices[i]).join(", ")}`}</Text> : null}
            </Card>
          );
        })}
      </View>
      <Button variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/quiz"))}>Retour aux quiz</Button>
    </Screen>
  );
}

function Answer({ who, text, accent }: { who: string; text: string; accent?: boolean }) {
  return (
    <View className={cx("flex-1 gap-1 rounded-md p-3", accent ? "bg-accent-soft" : "bg-surface-raised")}>
      <Text className={cx("font-sans-bold text-xs", accent ? "text-on-accent-soft" : "text-text-muted")}>{who}</Text>
      <Text className="font-sans text-sm text-text">{text}</Text>
    </View>
  );
}

export default withPartner(QuizPlay, { id: "S10", kicker: "Quiz à deux", title: "Un quiz se joue à deux", body: "Les réponses de l'autre restent cachées jusqu'à ce que vous ayez fini tous les deux.", icon: SmileIcon });
