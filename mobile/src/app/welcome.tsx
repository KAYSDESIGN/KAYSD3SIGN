import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import { Screen } from "@/components/app/Screen";
import { Body, Button, Caption, Display, Muted, TextField } from "@/components/ui";
import { api, useMutation } from "@/data";

// S01 · Bienvenue / inscription
export default function Welcome() {
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const emailIn = useMutation(api.signInWithEmail);
  const provider = useMutation(api.signInWithProvider);

  const go = (ok: unknown) => { if (ok) router.replace("/"); };

  return (
    <Screen className="flex-1 justify-between">
      <View className="gap-4 pt-10">
        <Caption>HotCouple · 18+</Caption>
        <Display>Rien que vous deux.</Display>
        <Body className="text-text-muted">
          Une question par jour, des envies partagées en secret, des petits mots qui réchauffent. Pas de feed, pas d'inconnus.
        </Body>
      </View>

      <View className="gap-3">
        <Button size="lg" onPress={async () => go(await provider.mutate("apple"))} loading={provider.pending}>Continuer avec Apple</Button>
        <Button size="lg" variant="secondary" onPress={async () => go(await provider.mutate("google"))} disabled={provider.pending}>Continuer avec Google</Button>
        {showEmail ? (
          <View className="gap-3">
            <TextField
              label="Ton email"
              value={email}
              onChangeText={(t) => { setEmail(t); emailIn.setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="toi@exemple.fr"
              error={emailIn.error ?? undefined}
              hint="On t'envoie un lien de connexion, pas de mot de passe."
              onSubmitEditing={async () => go(await emailIn.mutate(email))}
              returnKeyType="go"
            />
            <Button size="lg" onPress={async () => go(await emailIn.mutate(email))} loading={emailIn.pending} disabled={!email}>
              Recevoir mon lien
            </Button>
          </View>
        ) : (
          <Button size="lg" variant="ghost" icon={Mail} onPress={() => setShowEmail(true)}>Continuer avec un email</Button>
        )}
        {provider.error ? <Text className="font-sans-semibold text-sm text-danger">{provider.error}</Text> : null}
        <Muted className="text-center">
          En continuant, tu confirmes avoir 18 ans ou plus et acceptes les conditions et la politique de confidentialité.
        </Muted>
      </View>
    </Screen>
  );
}
