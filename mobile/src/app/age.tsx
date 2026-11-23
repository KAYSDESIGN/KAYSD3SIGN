import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { CircleCheck, Clock } from "lucide-react-native";
import { DateFields, toIso, type DateParts } from "@/components/app/DateFields";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, Card, Checkbox, Heading, Muted, SpiceBadge, SpiceSelector, Title, type Spice } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";
import { color } from "@/theme";

// S20 · 18+ et niveau d'audace
export default function AgeAndSpice() {
  const { partner } = useGate();
  const status = useQuery(api.getSpiceStatus);
  const save = useMutation(api.updateProfile);
  const [date, setDate] = useState<DateParts>({ d: "", m: "", y: "" });
  const [consent, setConsent] = useState(false);
  const [spice, setSpice] = useState<Spice | null>(null);
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (status.loading && !status.data) return <Screen><Skeleton className="h-[34px] w-2/3" /><Skeleton className="h-[240px]" /></Screen>;
  const st = status.data!;

  if (!st.confirmed) {
    const iso = toIso(date);
    return (
      <Screen>
        <Caption>Contenu pour adultes</Caption>
        <Heading>Avant d'aller plus loin</Heading>
        <Body className="text-text-muted">
          Les questions coquines, les défis et les envies secrètes sont réservés aux personnes majeures. Ta date de naissance reste privée : {them} ne la verra pas.
        </Body>
        <DateFields label="Ta date de naissance" value={date} onChange={(v) => { setDate(v); save.setError(null); }} error={save.error ?? undefined} />
        <Checkbox
          checked={consent}
          onChange={setConsent}
          label="J'ai 18 ans ou plus et j'accepte de voir du contenu suggestif entre adultes consentants. Je peux changer d'avis à tout moment dans les réglages."
        />
        <Button size="lg" disabled={!iso || !consent} loading={save.pending} onPress={() => iso && save.mutate({ birthdate: iso })}>Confirmer</Button>
      </Screen>
    );
  }

  const chosen = spice ?? st.mine;
  return (
    <Screen>
      <Caption>Niveau d'audace</Caption>
      <Heading>Jusqu'où avez-vous envie d'aller ?</Heading>
      <SpiceSelector value={chosen} onChange={setSpice} />

      <Card className="gap-3">
        <Title>Pour vous deux</Title>
        <View className="flex-row items-center gap-2">
          {st.partnerConfirmed ? <CircleCheck size={18} color={color.success} /> : <Clock size={18} color={color["text-muted"]} />}
          <Text className="flex-1 font-sans text-sm text-text">
            {st.partnerConfirmed ? `${them} a confirmé son âge et choisi son niveau.` : `${them} doit encore confirmer son âge.`}
          </Text>
        </View>
        {st.effective ? (
          <View className="flex-row items-center gap-2">
            <Muted>Niveau appliqué :</Muted>
            <SpiceBadge level={st.effective} />
          </View>
        ) : (
          <Muted>Le contenu coquin s'ouvrira quand vous aurez confirmé tous les deux.</Muted>
        )}
        <Muted>{"On ne dit jamais à l'autre quel niveau tu as choisi : seul le plus doux des deux s'affiche."}</Muted>
      </Card>

      <Button size="lg" loading={save.pending} onPress={async () => {
        if (spice && spice !== st.mine) await save.mutate({ spice_level: spice });
        router.canGoBack() ? router.back() : router.replace("/home");
      }}>Enregistrer</Button>
    </Screen>
  );
}
