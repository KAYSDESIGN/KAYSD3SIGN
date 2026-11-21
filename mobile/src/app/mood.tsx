import { useState } from "react";
import { router } from "expo-router";
import { Screen } from "@/components/app/Screen";
import { Body, Button, Caption, Heading, MoodPicker, TextField, type MoodKey } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";

// S05 · Humeur
export default function MoodScreen() {
  const current = useQuery(api.getMoods);
  const [mood, setMood] = useState<MoodKey | undefined>();
  const [note, setNote] = useState("");
  const save = useMutation(api.setMood);
  const selected = mood ?? current.data?.mine?.mood;

  return (
    <Screen>
      <Caption>Humeur</Caption>
      <Heading>Comment tu te sens ?</Heading>
      <Body className="text-text-muted">Ton/ta partenaire la verra sur son accueil.</Body>
      <MoodPicker value={selected} onChange={setMood} />
      <TextField label="Un mot pour accompagner (facultatif)" value={note} onChangeText={setNote} maxLength={140} hint={`${note.length} / 140`} error={save.error ?? undefined} />
      <Button size="lg" disabled={!selected} loading={save.pending} onPress={async () => {
        if (!selected) return;
        await save.mutate(selected, note.trim() || undefined);
        router.canGoBack() ? router.back() : router.replace("/home");
      }}>Partager</Button>
    </Screen>
  );
}
