import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { setPalettePref, setThemePref, usePalettePref, useThemePref } from "@/theme/preference";
import { router } from "expo-router";
import { Screen } from "@/components/app/Screen";
import { AvatarPicker } from "@/components/app/AvatarPicker";
import { useGate } from "@/components/app/useGate";
import { Body, Button, Caption, Card, Heading, Muted, TextField, Title, Toast } from "@/components/ui";
import { api, useMutation } from "@/data";
import { color } from "@/theme";

// S18 · Réglages (et S26 · mode discret)
export default function SettingsScreen() {
  const { profile, partner, paired } = useGate();
  const [name, setName] = useState<string | null>(null);
  const save = useMutation(api.updateProfile);
  const unpair = useMutation(api.unpair);
  const del = useMutation(api.deleteAccount);
  const [confirm, setConfirm] = useState<null | "unpair" | "delete" | "delete2">(null);
  const [saved, setSaved] = useState(false);
  const pref = useThemePref();
  const palettePref = usePalettePref();
  const them = partner?.display_name ?? "ton/ta partenaire";
  const value = name ?? profile?.display_name ?? "";

  return (
    <Screen>
      <Caption>Réglages</Caption>
      <Heading>Ton compte</Heading>

      <Card className="items-center gap-3">
        <AvatarPicker name={profile?.display_name ?? ""} />
      </Card>

      <Card className="gap-3">
        <TextField label="Ton prénom" value={value} onChangeText={setName} maxLength={60}
          error={value.trim().length > 40 ? "40 caractères maximum." : save.error ?? undefined} />
        <Button variant="secondary" disabled={!value.trim() || value.trim().length > 40 || value === profile?.display_name}
          loading={save.pending} onPress={async () => { if (await save.mutate({ display_name: value.trim() })) { setSaved(true); setTimeout(() => setSaved(false), 2000); } }}>
          Enregistrer
        </Button>
        {saved ? <Toast>Prénom enregistré.</Toast> : null}
      </Card>

      <Card className="gap-3">
        <Title>Apparence</Title>
        <View accessibilityRole="radiogroup" accessibilityLabel="Apparence" className="flex-row rounded-pill border border-glass-edge bg-surface p-1">
          {([["auto", "Automatique"], ["light", "Jour"], ["dark", "Nuit"]] as const).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: pref === k }} onPress={() => setThemePref(k)}
              className={pref === k ? "h-[40px] flex-1 items-center justify-center rounded-pill border border-glass-edge bg-surface-raised" : "h-[40px] flex-1 items-center justify-center rounded-pill"}>
              <Text className={pref === k ? "font-sans-bold text-sm text-text" : "font-sans-semibold text-sm text-text-muted"}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Muted>Automatique suit le réglage jour/nuit de ton téléphone.</Muted>
        <Title>Couleurs</Title>
        <View accessibilityRole="radiogroup" accessibilityLabel="Couleurs" className="flex-row rounded-pill border border-glass-edge bg-surface p-1">
          {([["bordeaux", "Bordeaux"], ["lilas", "Lilas"], ["neon", "Néon"], ["coral", "Corail"]] as const).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: palettePref === k }} onPress={() => setPalettePref(k)}
              className={palettePref === k ? "h-[40px] flex-1 items-center justify-center rounded-pill border border-glass-edge bg-surface-raised" : "h-[40px] flex-1 items-center justify-center rounded-pill"}>
              <Text className={palettePref === k ? "font-sans-bold text-sm text-text" : "font-sans-semibold text-sm text-text-muted"}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Title>Mode discret</Title>
            <Muted>{"Notifications neutres (« Nouveau message »), sans prénom ni contenu. Bientôt : icône neutre et code à l'ouverture."}</Muted>
          </View>
          <Switch
            accessibilityLabel="Mode discret"
            value={!!profile?.discreet_mode}
            onValueChange={(v) => { save.mutate({ discreet_mode: v }); }}
            trackColor={{ false: color["border-input"], true: color.accent }}
            thumbColor={color.text}
          />
        </View>
      </Card>

      <Card className="gap-3">
        <Title>Notifications</Title>
        <Muted>{`Réponse de ${them}, petits mots, rappel du soir à 20 h. Réglables dès que les notifications seront branchées.`}</Muted>
      </Card>

      <View className="gap-3">
        <Caption>Zone sensible</Caption>
        <Button variant="secondary" onPress={async () => { await api.signOut(); router.replace("/welcome"); }}>Se déconnecter</Button>

        {!paired ? null : confirm === "unpair" ? (
          <Card className="gap-3 border-danger">
            <Title>{`Se séparer de ${them} ?`}</Title>
            <Body className="text-text-muted">Toutes vos réponses, envies, listes et petits mots seront effacés, pour vous deux. Impossible de revenir en arrière.</Body>
            <Button variant="danger" loading={unpair.pending} onPress={async () => { await unpair.mutate(); router.replace("/"); }}>Oui, tout effacer</Button>
            <Button variant="ghost" onPress={() => setConfirm(null)}>Annuler</Button>
          </Card>
        ) : (
          <Button variant="danger" onPress={() => setConfirm("unpair")}>Se désappairer</Button>
        )}

        {confirm === "delete" || confirm === "delete2" ? (
          <Card className="gap-3 border-danger">
            <Title>Supprimer ton compte ?</Title>
            <Body className="text-text-muted">{`Ton compte, ton profil et tout ce que vous avez partagé seront supprimés. ${them} sera délié·e.`}</Body>
            {confirm === "delete" ? (
              <Button variant="danger" onPress={() => setConfirm("delete2")}>Supprimer</Button>
            ) : (
              <Button variant="danger" loading={del.pending} onPress={async () => { await del.mutate(); router.replace("/welcome"); }}>Supprimer définitivement</Button>
            )}
            <Button variant="ghost" onPress={() => setConfirm(null)}>Annuler</Button>
          </Card>
        ) : (
          <Button variant="ghost" onPress={() => setConfirm("delete")}>Supprimer mon compte</Button>
        )}
        {unpair.error || del.error ? <Text className="font-sans-semibold text-sm text-danger">{unpair.error ?? del.error}</Text> : null}
      </View>
    </Screen>
  );
}
