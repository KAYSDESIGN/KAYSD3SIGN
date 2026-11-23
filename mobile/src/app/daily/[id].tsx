import { useState } from "react";
import { withPartner } from "@/components/app/PairGate";
import { MessageCircleHeart as MessageCircleHeartIcon } from "lucide-react-native";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Button, Caption, DailyCard, EmptyState, Heading, SpiceBadge, TextField, Toast } from "@/components/ui";
import { useGate } from "@/components/app/useGate";
import { api, useMutation, useQuery } from "@/data";
import { SearchX } from "lucide-react-native";

const MAX = 2000;

// S08 · Question du jour (et S22, question coquine) : répondre, attendre, découvrir
function Daily() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { partner } = useGate();
  const daily = useQuery(() => api.getDaily(id), [id]);
  const send = useMutation(api.answer);
  const skipM = useMutation(api.skip);
  const [text, setText] = useState("");

  if (daily.loading && !daily.data) return <Screen><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[220px]" /></Screen>;
  const v = daily.data;
  if (!v) {
    return (
      <Screen>
        <EmptyState icon={SearchX} title="Question introuvable" body="Elle a peut-être expiré à minuit. Celle d'aujourd'hui t'attend à l'accueil." action="Retour à l'accueil" onAction={() => router.replace("/home")} />
      </Screen>
    );
  }
  const spicy = v.assignment.slot !== "question";
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (v.mine) {
    return (
      <Screen>
        <DailyCard
          kicker={spicy ? "Question coquine" : "Question du jour"}
          spice={spicy ? v.assignment.prompt.spice_level : undefined}
          prompt={v.assignment.prompt.body}
          state={v.theirs ? "revealed" : "waiting"}
          mine={v.mine.skipped ? "Passée" : v.mine.body ?? ""}
          theirs={v.theirs?.skipped ? "Passée" : v.theirs?.body ?? ""}
          partnerName={them}
        />
        {!v.theirs ? <Toast>{`On te prévient dès que ${them} a répondu.`}</Toast> : null}
        <Button variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}>Retour à l'accueil</Button>
      </Screen>
    );
  }

  const tooLong = text.length > MAX;
  const submit = async () => {
    if (!text.trim() || tooLong) return;
    await send.mutate(v.assignment.id, text);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Caption>{spicy ? "Question coquine" : "Question du jour"}</Caption>
        {spicy ? <SpiceBadge level={v.assignment.prompt.spice_level} /> : null}
      </View>
      <Heading>{v.assignment.prompt.body}</Heading>
      <TextField
        label="Ta réponse"
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        style={{ height: 160, paddingTop: 12 }}
        placeholder={`${them} la découvrira après avoir répondu à son tour.`}
        hint={`${text.length} / ${MAX}`}
        error={tooLong ? `Trop long de ${text.length - MAX} caractères.` : send.error ?? skipM.error ?? undefined}
      />
      <Button size="lg" onPress={submit} loading={send.pending} disabled={!text.trim() || tooLong}>Envoyer ma réponse</Button>
      {spicy ? (
        <Button variant="ghost" onPress={() => skipM.mutate(v.assignment.id)} loading={skipM.pending}>Passer celle-ci, sans conséquence</Button>
      ) : null}
    </Screen>
  );
}

export default withPartner(Daily, { id: "S08", kicker: "Question du jour", title: "Une question par jour, pour vous deux", body: "Tu réponds, puis tu découvres la réponse de l'autre. Pas avant.", icon: MessageCircleHeartIcon });
