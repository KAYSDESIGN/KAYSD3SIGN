import { useState } from "react";
import { View } from "react-native";
import { Camera } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, DailyCard, EmptyState, Heading, SpiceBadge, TextField, Toast } from "@/components/ui";
import { api, useMutation, useQuery, type DailyView } from "@/data";


// S06 · Défi du jour, et S23 · défi coquin (passable sans pénalité)
export default function Challenges() {
  const { partner } = useGate();
  const list = useQuery(api.getChallenges);
  const them = partner?.display_name ?? "ton/ta partenaire";

  return (
    <Screen>
      <Caption>Défis du jour</Caption>
      <Heading>À relever avant minuit</Heading>
      <Body className="text-text-muted">{`Chacun relève le défi de son côté. Vous découvrez la réponse de l'autre une fois la vôtre envoyée.`}</Body>
      {list.loading && !list.data ? <Skeleton className="h-[220px]" /> : null}
      {list.error ? <Toast tone="error">Impossible de charger les défis. Réessaie dans un instant.</Toast> : null}
      {list.data?.map((v) => <ChallengeBlock key={v.assignment.id} v={v} them={them} />)}
      {list.data?.length === 1 ? (
        <Body className="text-text-muted">🌶️ Un défi coquin s'ajoutera ici quand vous aurez débloqué le contenu pour adultes.</Body>
      ) : null}
      {api.dev.enabled && list.data?.some((v) => !v.partnerAnswered) ? (
        <DevPanel actions={list.data.filter((v) => !v.partnerAnswered).map((v) => ({
          label: `Sam relève le défi ${v.assignment.slot === "challenge" ? "du jour" : "coquin"}`,
          onPress: () => api.dev.partnerAnswers(v.assignment.id, v.assignment.slot === "challenge" ? "Ton rire, ta patience avec moi lundi, et ton café du matin." : "Tu verras bien… 😏"),
        }))} />
      ) : null}
    </Screen>
  );
}

function ChallengeBlock({ v, them }: { v: DailyView; them: string }) {
  const [text, setText] = useState("");
  const send = useMutation(api.answer);
  const skip = useMutation(api.skip);
  const spicy = v.assignment.slot === "spicy_challenge";
  const kind = v.assignment.prompt.challenge_kind ?? "text";
  const kicker = spicy ? "Défi coquin" : "Défi du jour";

  if (v.mine) {
    return (
      <DailyCard kicker={kicker} spice={spicy ? v.assignment.prompt.spice_level : undefined} prompt={v.assignment.prompt.body}
        state={v.theirs ? "revealed" : "waiting"} partnerName={them}
        mine={v.mine.skipped ? "Passé" : v.mine.body ?? ""} theirs={v.theirs?.skipped ? "Passé" : v.theirs?.body ?? ""} />
    );
  }

  return (
    <View className="gap-4 rounded-lg border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Caption>{kicker}</Caption>
        {spicy ? <SpiceBadge level={v.assignment.prompt.spice_level} /> : null}
      </View>
      <Heading>{v.assignment.prompt.body}</Heading>
      {kind === "photo" ? (
        <EmptyState icon={Camera} title="Défi photo" body="L'envoi de photos arrive avec le stockage sécurisé. En attendant, décris ce que tu aurais photographié." />
      ) : null}
      <TextField label="Ta réponse" value={text} onChangeText={setText} multiline textAlignVertical="top" style={{ height: 120, paddingTop: 12 }}
        hint={`${text.length} / 2000`} error={text.length > 2000 ? "Trop long." : send.error ?? skip.error ?? undefined} />
      <Button onPress={() => send.mutate(v.assignment.id, text)} loading={send.pending} disabled={!text.trim() || text.length > 2000}>Envoyer</Button>
      {spicy ? <Button variant="ghost" onPress={() => skip.mutate(v.assignment.id)} loading={skip.pending}>Passer, sans conséquence</Button> : null}
    </View>
  );
}

