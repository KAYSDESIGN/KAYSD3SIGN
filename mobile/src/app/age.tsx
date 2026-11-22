import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { CircleCheck, Clock } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, Card, Checkbox, Heading, Muted, SpiceBadge, SpiceSelector, Title, type Spice } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";
import { color, cx } from "@/theme";

// S20 · 18+ et niveau d'audace
export default function AgeAndSpice() {
  const { partner } = useGate();
  const status = useQuery(api.getSpiceStatus);
  const save = useMutation(api.updateProfile);
  const [d, setD] = useState(""); const [m, setM] = useState(""); const [y, setY] = useState("");
  const [consent, setConsent] = useState(false);
  const [spice, setSpice] = useState<Spice | null>(null);
  const them = partner?.display_name ?? "ton/ta partenaire";

  if (status.loading && !status.data) return <Screen><Skeleton className="h-[34px] w-2/3" /><Skeleton className="h-[240px]" /></Screen>;
  const st = status.data!;

  if (!st.confirmed) {
    const complete = d.length >= 1 && m.length >= 1 && y.length === 4;
    const iso = complete ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
    const valid = complete && !isNaN(new Date(iso + "T00:00:00Z").getTime()) && new Date(iso + "T00:00:00Z").getUTCDate() === Number(d);
    return (
      <Screen>
        <Caption>Contenu pour adultes</Caption>
        <Heading>Avant d'aller plus loin</Heading>
        <Body className="text-text-muted">
          Les questions coquines, les défis et les envies secrètes sont réservés aux personnes majeures. Ta date de naissance reste privée : {them} ne la verra pas.
        </Body>
        <View className="gap-2">
          <Text className="font-sans-semibold text-sm text-text">Ta date de naissance</Text>
          <View className="flex-row gap-2">
            <DateBox label="Jour" placeholder="JJ" value={d} onChange={setD} max={2} />
            <DateBox label="Mois" placeholder="MM" value={m} onChange={setM} max={2} />
            <DateBox label="Année" placeholder="AAAA" value={y} onChange={setY} max={4} wide />
          </View>
          {complete && !valid ? <Text accessibilityLiveRegion="polite" className="font-sans-semibold text-sm text-danger">Cette date n'existe pas.</Text> : null}
          {save.error ? <Text accessibilityLiveRegion="polite" className="font-sans-semibold text-sm text-danger">{save.error}</Text> : null}
        </View>
        <Checkbox
          checked={consent}
          onChange={setConsent}
          label="J'ai 18 ans ou plus et j'accepte de voir du contenu suggestif entre adultes consentants. Je peux changer d'avis à tout moment dans les réglages."
        />
        <Button size="lg" disabled={!valid || !consent} loading={save.pending} onPress={() => save.mutate({ birthdate: iso })}>Confirmer</Button>
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

function DateBox({ label, placeholder, value, onChange, max, wide }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; max: number; wide?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, max))}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={color["text-subtle"]}
      maxLength={max}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ minWidth: 0, width: 0 }}
      className={cx("h-[52px] rounded-md bg-bg text-center font-sans-bold text-lg text-text", wide ? "flex-[1.6]" : "flex-1", focus ? "border-2 border-focus" : "border border-border-input")}
    />
  );
}
