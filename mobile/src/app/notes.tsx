import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Mail, Send } from "lucide-react-native";
import { withPartner } from "@/components/app/PairGate";
import { Screen } from "@/components/app/Screen";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Card, Caption, EmojiText, Toast } from "@/components/ui";
import { api, useMutation } from "@/data";
import { color, cx } from "@/theme";

// Petits mots : des attentions toutes prêtes, envoyées dans votre chat en un geste.
const NOTES: { title: string; items: string[] }[] = [
  { title: "Tendres", items: [
    "Je pense à toi, tout simplement.",
    "Merci d'être toi. Vraiment.",
    "J'ai hâte de m'endormir contre toi ce soir.",
    "Tu es ma personne préférée, tu le sais ?",
    "Ton sourire de ce matin me suit toute la journée.",
  ] },
  { title: "Complices", items: [
    "Ce soir, c'est moi qui m'occupe de tout.",
    "Rendez-vous à 20 h, tenue correcte exigée… ou pas.",
    "Je te réserve une surprise. Sois patient·e.",
    "On s'échappe ce week-end, rien que nous deux ?",
  ] },
  { title: "Coquins", items: [
    "J'ai très envie de toi. Juste pour info.",
    "Je repense à hier soir… et je souris bêtement.",
    "Ce soir, je veux prendre mon temps avec toi.",
    "Devine ce que je porte sous mes vêtements.",
    "Rentre vite. Je t'attends.",
  ] },
];

function PetitsMots() {
  const { partner } = useGate();
  const them = partner?.display_name ?? "ton/ta partenaire";
  const send = useMutation(async (t: string) => { await api.sendNote(t); return true; });
  const [sent, setSent] = useState<string | null>(null);

  const pick = async (t: string) => {
    setSent(null);
    if (await send.mutate(t)) setSent(t);
  };

  return (
    <Screen>
      <ScreenHeader kicker="PETITS MOTS" title="Une attention, en un geste" />
      <Body className="text-text-muted">{`Choisis un mot, il part tout de suite dans votre chat. ${them} le verra en ouvrant l'app.`}</Body>
      {sent ? <Toast tone="nudge">{`Envoyé à ${them} : « ${sent} »`}</Toast> : null}
      {send.error ? <Toast tone="error">{send.error}</Toast> : null}
      {NOTES.map((g) => (
        <View key={g.title} className="gap-2">
          <Caption>{g.title}</Caption>
          <Card className="gap-0 px-4 py-1">
            {g.items.map((t, i) => (
              <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Envoyer : ${t}`} disabled={send.pending} onPress={() => pick(t)}
                className={cx("min-h-[56px] flex-row items-center gap-3 py-3 active:opacity-60", i > 0 && "border-t border-border")}>
                <EmojiText size={17} className="flex-1 font-sans text-base text-text">{t}</EmojiText>
                <Send size={18} color={sent === t ? color.accent : color["text-muted"]} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
      <Button variant="secondary" icon={Mail} onPress={() => router.push("/chat")}>Écrire mon propre mot</Button>
      <Text className="text-center font-sans text-sm text-text-muted">Vos messages restent entre vous deux.</Text>
    </Screen>
  );
}

export default withPartner(PetitsMots, { id: "S14", kicker: "Petits mots", title: "Une attention, en un geste", body: "Des mots tendres, complices ou coquins, prêts à envoyer. Ils arrivent dans votre chat.", example: "Je pense à toi, tout simplement.", icon: Mail });
