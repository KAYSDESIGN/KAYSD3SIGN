import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SearchX } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, Card, Display, EmptyState, Heading, Muted, Toast } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";
import { cx } from "@/theme";

function verdict(score: number) {
  if (score >= 80) return "Âmes sœurs, ou presque.";
  if (score >= 50) return "Bien accordés, avec de jolies surprises.";
  return "Vous avez encore plein de choses à vous apprendre.";
}

// S10 · Partie de quiz : une question à la fois, puis le résultat
export default function QuizPlay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { partner } = useGate();
  const data = useQuery(() => api.getQuizSession(id), [id]);
  const answer = useMutation(api.answerQuiz);
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (data.loading && !data.data) return <Screen><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[260px]" /></Screen>;
  if (!data.data) return <Screen><EmptyState icon={SearchX} title="Quiz introuvable" body="Il a peut-être été effacé." action="Retour" onAction={() => router.replace("/quiz")} /></Screen>;

  const { quiz, session } = data.data;
  const next = quiz.questions.find((q) => session.mine[q.id] === undefined);
  const done = quiz.questions.filter((q) => session.mine[q.id] !== undefined).length;

  if (next) {
    return (
      <Screen>
        <Caption>{`${quiz.title} · ${done + 1} sur ${quiz.questions.length}`}</Caption>
        <View className="h-[6px] overflow-hidden rounded-pill bg-surface">
          <View className="h-full rounded-pill bg-accent" style={{ width: `${(done / quiz.questions.length) * 100}%` }} />
        </View>
        <Heading>{next.body}</Heading>
        <View accessibilityRole="radiogroup" accessibilityLabel={next.body} className="gap-2">
          {next.choices.map((c, i) => (
            <Pressable key={c} accessibilityRole="radio" accessibilityState={{ checked: false, disabled: answer.pending }} disabled={answer.pending}
              onPress={() => answer.mutate(session.id, next.id, i)}
              className="min-h-[56px] justify-center rounded-md border border-border bg-surface px-4 active:border-accent active:bg-accent-soft">
              <Text className="font-sans-semibold text-base text-text">{c}</Text>
            </Pressable>
          ))}
        </View>
        {answer.error ? <Toast tone="error">{answer.error}</Toast> : null}
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
          const a = session.mine[q.id]; const b = session.theirs?.[q.id];
          const same = a === b;
          return (
            <Card key={q.id} className={cx("gap-2", same && "border-accent")}>
              <Text className="font-sans-bold text-sm text-text">{q.body}</Text>
              <View className="flex-row gap-2">
                <Answer who="Toi" text={q.choices[a]} />
                <Answer who={them} text={b !== undefined ? q.choices[b] : "-"} accent />
              </View>
              {same ? <Text className="font-sans-semibold text-xs text-on-accent-soft">♥ Pareil</Text> : null}
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
