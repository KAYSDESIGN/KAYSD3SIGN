import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/app/Screen";
import { Body, Button, Caption, Heading, Muted, TextField } from "@/components/ui";
import { api, useMutation } from "@/data";

// S02 · Profil de base
export default function ProfileSetup() {
  const [name, setName] = useState("");
  const save = useMutation(api.updateProfile);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tooLong = name.trim().length > 40;

  const submit = async () => {
    if (!name.trim() || tooLong) return;
    if (await save.mutate({ display_name: name.trim(), timezone: tz })) router.replace("/");
  };

  return (
    <Screen>
      <Caption>Bienvenue</Caption>
      <Heading>Comment veux-tu qu'on t'appelle ?</Heading>
      <Body className="text-text-muted">Seul·e ton/ta partenaire verra ce prénom.</Body>
      <TextField
        label="Prénom ou surnom"
        value={name}
        onChangeText={setName}
        placeholder="Ex. Kay, Mon cœur…"
        autoFocus
        autoComplete="given-name"
        maxLength={60}
        returnKeyType="next"
        onSubmitEditing={submit}
        error={tooLong ? "40 caractères maximum." : save.error ?? undefined}
      />
      <View className="gap-1">
        <Muted>Fuseau horaire : {tz}</Muted>
        <Muted>La question du jour change à minuit dans ce fuseau.</Muted>
      </View>
      <Button size="lg" onPress={submit} loading={save.pending} disabled={!name.trim() || tooLong}>Continuer</Button>
    </Screen>
  );
}
