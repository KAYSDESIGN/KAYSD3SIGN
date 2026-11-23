import { Pressable, Text, View } from "react-native";
import { withPartner } from "@/components/app/PairGate";
import { Smile as SmileIcon } from "lucide-react-native";
import { router } from "expo-router";
import { ChevronRight, Lock } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Body, SpiceBadge, Toast } from "@/components/ui";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { api, useMutation, useQuery } from "@/data";
import { useGate } from "@/components/app/useGate";
import { untilTomorrow } from "@/lib/day";
import { color } from "@/theme";

// S10 · Quiz à deux (liste)
function Quizzes() {
  const list = useQuery(api.getQuizzes);
  const start = useMutation(api.startQuiz);
  const { partner } = useGate();
  const them = partner?.display_name ?? "l'autre";

  return (
    <Screen>
      <ScreenHeader kicker="QUIZ DU JOUR" title="Sur la même longueur d'onde ?" />
      <Body className="text-text-muted">{`Chaque jour, 5 nouvelles questions par quiz. Répondez chacun de votre côté : vos réponses sont définitives. Nouvelles questions dans ${untilTomorrow()}.`}</Body>
      {start.error ? <Toast tone="error">{start.error}</Toast> : null}
      {list.loading && !list.data ? <Skeleton className="h-[200px]" /> : null}
      <View className="gap-3">
        {list.data?.map(({ quiz, locked, lastSession }) => {
          const mineCount = lastSession ? Object.keys(lastSession.mine).length : 0;
          const status = !lastSession || mineCount === 0 ? "À faire"
            : lastSession.status === "revealed" ? `${lastSession.match_score} % de complicité · terminé`
            : mineCount < quiz.questions.length ? `En cours · ${mineCount}/${quiz.questions.length}` : `En attente de ${them}`;
          return (
            <Pressable
              key={quiz.id}
              accessibilityRole="button"
              accessibilityLabel={`${quiz.title}. ${quiz.blurb} ${locked ? "Réservé à Premium." : status}`}
              onPress={async () => {
                if (locked) return router.push("/premium");
                // la partie du jour (une seule par jour) : questions, attente ou résultat verrouillé
                const id = lastSession ? lastSession.id : await start.mutate(quiz.id);
                if (id) router.push({ pathname: "/quiz/[id]", params: { id } });
              }}
              className="lg flex-row items-center gap-3 rounded-[26px] bg-surface p-4 active:bg-surface-raised"
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

export default withPartner(Quizzes, { id: "S10", kicker: "Quiz à deux", title: "Êtes-vous sur la même longueur d'onde ?", body: "Vous répondez chacun de votre côté. À la fin, votre score de complicité et vos réponses côte à côte.", example: "Le dimanche idéal commence par… une grasse matinée ou un brunch dehors ?", icon: SmileIcon });
