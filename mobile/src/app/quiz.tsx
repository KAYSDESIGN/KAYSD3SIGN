import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Lock } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Body, Caption, Heading, SpiceBadge, Toast } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";
import { color } from "@/theme";

// S10 · Quiz à deux (liste)
export default function Quizzes() {
  const list = useQuery(api.getQuizzes);
  const start = useMutation(api.startQuiz);

  return (
    <Screen>
      <Caption>Quiz à deux</Caption>
      <Heading>Êtes-vous sur la même longueur d'onde ?</Heading>
      <Body className="text-text-muted">Répondez chacun de votre côté. Votre score de complicité s'affiche quand vous avez fini tous les deux.</Body>
      {start.error ? <Toast tone="error">{start.error}</Toast> : null}
      {list.loading && !list.data ? <Skeleton className="h-[200px]" /> : null}
      <View className="gap-3">
        {list.data?.map(({ quiz, locked, lastSession }) => {
          const status = !lastSession ? "Nouveau"
            : lastSession.status === "revealed" ? `${lastSession.match_score} % de complicité`
            : Object.keys(lastSession.mine).length < quiz.questions.length ? "En cours" : "En attente de l'autre";
          return (
            <Pressable
              key={quiz.id}
              accessibilityRole="button"
              accessibilityLabel={`${quiz.title}. ${quiz.blurb} ${locked ? "Réservé à Premium." : status}`}
              onPress={async () => {
                if (locked) return router.push("/premium");
                const id = lastSession && lastSession.status === "open" ? lastSession.id : await start.mutate(quiz.id);
                if (id) router.push({ pathname: "/quiz/[id]", params: { id } });
              }}
              className="flex-row items-center gap-3 rounded-lg border border-border bg-surface p-4 active:bg-surface-raised"
            >
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-sans-bold text-base text-text">{quiz.title}</Text>
                  {quiz.spice_level !== "soft" ? <SpiceBadge level={quiz.spice_level} /> : null}
                </View>
                <Text className="font-sans text-sm text-text-muted">{quiz.blurb}</Text>
                <Text className="font-sans-semibold text-sm text-gold">{locked ? "Premium" : `${quiz.questions.length} questions · ${status}`}</Text>
              </View>
              {locked ? <Lock size={18} color={color.gold} /> : <ChevronRight size={18} color={color["text-muted"]} />}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
