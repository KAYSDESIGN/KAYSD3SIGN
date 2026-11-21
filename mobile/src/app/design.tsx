import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Heart, Inbox, Sparkles, Settings, Plus } from "lucide-react-native";
import {
  Body, Button, Caption, Card, ChecklistItem, CodeInput, CoupleAvatars, DailyCard, DesireCard, Display,
  EmptyState, Heading, IconButton, MoodPicker, Muted, NudgeButton, PlanOption, SpiceBadge, SpiceSelector,
  StreakBadge, TextField, Title, Toast, type DesireAnswer, type MoodKey, type Spice,
} from "@/components/ui";
import { tokens } from "@/theme";

/** Galerie du design system : chaque primitive, chaque état. Route de dev, retirée des builds de prod. */
export default function DesignSystem() {
  const [mood, setMood] = useState<MoodKey>("in_the_mood");
  const [spice, setSpice] = useState<Spice>("spicy");
  const [code, setCode] = useState("K7P");
  const [desire, setDesire] = useState<DesireAnswer>();
  const [plan, setPlan] = useState("yearly");
  const [items, setItems] = useState([true, false]);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <View className="gap-2">
          <Caption>HotCouple · design system</Caption>
          <Display>Rien que vous deux.</Display>
          <Muted>Thème sombre, Fraunces pour les titres, Manrope pour le texte, icônes Lucide.</Muted>
        </View>

        <Section title="Couleurs">
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(tokens.color).map(([k, v]) => (
              <View key={k} className="w-[31%] gap-1">
                <View style={{ backgroundColor: v }} className="h-[44px] rounded-sm border border-border" />
                <Text className="font-sans-semibold text-xs text-text">{k}</Text>
                <Text className="font-sans text-xs text-text-muted">{v}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Typographie">
          <Display>Display 40</Display>
          <Heading>Titre 28 en Fraunces</Heading>
          <Title>Sous-titre 20 Manrope gras</Title>
          <Body>Texte 16 : c'est ici que se racontent les petites choses du quotidien.</Body>
          <Muted>Texte secondaire 14</Muted>
          <Caption>Légende 12</Caption>
        </Section>

        <Section title="Boutons">
          <Button icon={Sparkles}>Commencer</Button>
          <Button variant="secondary">Plus tard</Button>
          <Button variant="ghost">Passer</Button>
          <Button variant="danger">Se désappairer</Button>
          <View className="flex-row flex-wrap items-center gap-2">
            <Button size="sm">Petit</Button>
            <Button loading>Envoi</Button>
            <Button disabled>Désactivé</Button>
          </View>
          <View className="flex-row gap-2">
            <IconButton icon={Settings} label="Réglages" />
            <IconButton icon={Bell} label="Notifications" />
            <IconButton icon={Plus} label="Ajouter" tone="accent" />
          </View>
        </Section>

        <Section title="Accueil">
          <View className="flex-row items-center justify-between">
            <CoupleAvatars me={{ name: "Kay" }} partner={{ name: "Sam", mood: "🔥" }} />
            <StreakBadge days={12} />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <NudgeButton icon={Heart} label="Tu me manques" />
            <NudgeButton icon={Sparkles} label="Je pense à toi" />
          </View>
          <StreakBadge days={0} broken />
        </Section>

        <Section title="Question du jour">
          <DailyCard kicker="Question du jour" prompt="Quel moment de cette semaine aimerais-tu revivre avec moi ?" state="todo" partnerName="Sam" />
          <DailyCard kicker="Question coquine" spice="spicy" prompt="Où aimerais-tu que je t'embrasse en premier ce soir ?" state="waiting" mine="Dans le cou, lentement." partnerName="Sam" />
          <DailyCard kicker="Question du jour" prompt="Ton plus beau souvenir de nous ?" state="revealed" mine="Notre premier week-end à Lisbonne." theirs="Le fou rire sous la pluie à Lisbonne." partnerName="Sam" />
        </Section>

        <Section title="Humeur">
          <MoodPicker value={mood} onChange={setMood} />
        </Section>

        <Section title="Niveau d'audace">
          <View className="flex-row gap-2">
            <SpiceBadge level="soft" /><SpiceBadge level="spicy" /><SpiceBadge level="hot" />
          </View>
          <SpiceSelector value={spice} onChange={setSpice} />
        </Section>

        <Section title="Envies secrètes">
          <DesireCard text="Un massage aux huiles, sans se presser" value={desire} onChange={setDesire} />
        </Section>

        <Section title="Formulaires">
          <TextField label="Ton prénom" placeholder="Comment Sam t'appelle ?" hint="Visible uniquement par ton/ta partenaire." />
          <TextField label="Email" value="kay@" error="Cet email n'a pas l'air complet." />
          <View className="gap-2">
            <Title>Code d'appairage</Title>
            <CodeInput value={code} onChange={setCode} />
          </View>
          <CodeInput value="ABCDEF" onChange={() => {}} error="Ce code a expiré. Demande-en un nouveau." />
        </Section>

        <Section title="Bucket list">
          <Card className="py-1">
            {["Week-end surprise à la mer", "Dîner aux chandelles à la maison"].map((l, i) => (
              <ChecklistItem key={l} label={l} meta={i ? "Ajouté par Sam" : "Fait le 2 novembre"} done={items[i]} onToggle={() => setItems((s) => s.map((v, j) => (j === i ? !v : v)))} />
            ))}
          </Card>
        </Section>

        <Section title="Premium">
          <PlanOption title="Annuel" price="24,99 €" detail="Pour vous deux, 2,08 € par mois" badge="-79 %" selected={plan === "yearly"} onSelect={() => setPlan("yearly")} />
          <PlanOption title="Mensuel" price="9,99 €" detail="Pour vous deux, sans engagement" selected={plan === "monthly"} onSelect={() => setPlan("monthly")} />
          <PlanOption title="À vie" price="39,99 €" detail="Un seul paiement" selected={plan === "lifetime"} onSelect={() => setPlan("lifetime")} />
        </Section>

        <Section title="Retours et états vides">
          <Toast tone="nudge">Sam pense à toi 💭</Toast>
          <Toast>Réponse enregistrée.</Toast>
          <Toast tone="error">Pas de connexion. On réessaie dès que possible.</Toast>
          <EmptyState icon={Inbox} title="Pas encore de moments" body="Ajoutez votre première photo à deux, elle s'épinglera sur votre carte." action="Ajouter une photo" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Title>{title}</Title>
      {children}
    </View>
  );
}
