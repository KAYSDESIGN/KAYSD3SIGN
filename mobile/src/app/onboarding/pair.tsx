import { useState } from "react";
import { Share, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Copy, Share2 } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Body, Button, Caption, Card, CodeInput, Heading, Muted, Toast } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";

// S03 · Appairage : inviter (créer un code) ou rejoindre (saisir le code reçu)
export default function Pair() {
  const [mode, setMode] = useState<"choose" | "invite" | "join">("choose");
  const couple = useQuery(api.getCouple);
  const partner = useQuery(api.getPartner);
  const create = useMutation(api.createCouple);
  const joinM = useMutation(api.joinCouple);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);


  // Appairé : on file à l'accueil
  if (partner.data) return <Redirect href="/" />;

  const pendingCode = couple.data?.invite_code ?? null;
  const showInvite = mode === "invite" || !!pendingCode;

  if (couple.loading && !couple.data) {
    return <Screen><Skeleton className="h-[34px] w-2/3" /><Skeleton className="h-[160px]" /></Screen>;
  }

  if (showInvite) {
    const expires = couple.data?.invite_expires_at ? new Date(couple.data.invite_expires_at) : null;
    return (
      <Screen>
        <Caption>Étape 2 sur 2</Caption>
        <Heading>Invite ton/ta partenaire</Heading>
        <Body className="text-text-muted">Envoie-lui ce code. Dès qu'il ou elle l'aura saisi dans HotCouple, votre espace s'ouvre.</Body>
        <Card raised className="items-center gap-3 py-6">
          {pendingCode ? (
            <Text accessibilityLabel={`Ton code : ${pendingCode.split("").join(" ")}`} className="font-sans-bold text-display tracking-[8px] text-text">{pendingCode}</Text>
          ) : (
            <Skeleton className="h-[44px] w-[220px]" />
          )}
          {expires ? <Muted>Valable jusqu'au {expires.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {expires.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Muted> : null}
        </Card>
        {!pendingCode ? (
          <Button size="lg" loading={create.pending} onPress={() => create.mutate()}>Générer mon code</Button>
        ) : (
          <View className="flex-row gap-2">
            <Button className="flex-1" icon={Share2} onPress={() => Share.share({ message: `Rejoins-moi sur HotCouple avec le code ${pendingCode}` }).catch(() => {})}>Partager</Button>
            <Button className="flex-1" variant="secondary" icon={Copy} onPress={async () => { await Clipboard.setStringAsync(pendingCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? "Copié" : "Copier"}
            </Button>
          </View>
        )}
        {create.error ? <Toast tone="error">{create.error}</Toast> : null}
        {pendingCode ? <Muted className="text-center">En attente de ton/ta partenaire…</Muted> : null}
        {pendingCode ? <DevPanel actions={[{ label: "Sam rejoint avec le code", onPress: () => api.dev.partnerJoins() }]} /> : null}
        {!pendingCode ? <Button variant="ghost" onPress={() => setMode("choose")}>Retour</Button> : null}
      </Screen>
    );
  }

  if (mode === "join") {
    const submit = async () => { if (code.length === 6) await joinM.mutate(code); };
    return (
      <Screen>
        <Caption>Étape 2 sur 2</Caption>
        <Heading>Entre le code reçu</Heading>
        <Body className="text-text-muted">6 caractères, sans 0 ni O, sans 1 ni I.</Body>
        <CodeInput value={code} onChange={(v) => { setCode(v); joinM.setError(null); }} error={joinM.error ?? undefined} />
        <Button size="lg" onPress={submit} loading={joinM.pending} disabled={code.length !== 6}>Nous relier</Button>
        <Button variant="ghost" onPress={() => setMode("choose")}>Retour</Button>
        <DevPanel actions={[{ label: "Sam m'invite (code K7PM4Q)", onPress: async () => setCode(await api.dev.partnerInvites()) }]} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Caption>Étape 2 sur 2</Caption>
      <Heading>Retrouvez-vous ici</Heading>
      <Body className="text-text-muted">L'un·e de vous crée un code, l'autre le saisit. C'est tout.</Body>
      <Button size="lg" onPress={() => setMode("invite")}>J'invite mon/ma partenaire</Button>
      <Button size="lg" variant="secondary" onPress={() => setMode("join")}>J'ai reçu un code</Button>
    </Screen>
  );
}
