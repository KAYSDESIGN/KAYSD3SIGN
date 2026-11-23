import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/app/Screen";
import { Body, Button, Caption, Display, Muted, TextField } from "@/components/ui";
import { Glass } from "@/components/ui";
import { api, useMutation, USING_SUPABASE } from "@/data";
import { color, cx } from "@/theme";

// S01 · Bienvenue : créer un compte ou se connecter (email + mot de passe)
export default function Welcome() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = useMutation(api.signInWithPassword);
  const provider = useMutation(api.signInWithProvider);

  const submit = async () => { if (await auth.mutate(email, password, mode)) router.replace("/"); };

  return (
    <Screen back={false} className="flex-1 justify-between">
      <View className="gap-4 pt-10">
        <Caption>HotCouple · 18+</Caption>
        <Display>Rien que vous deux.</Display>
        <Body className="text-text-muted">
          Une question par jour, des envies partagées en secret, des petits mots qui réchauffent. Pas de feed, pas d'inconnus.
        </Body>
      </View>

      <View className="gap-3">
        <Glass float radius={999} accessibilityRole="tablist" className="flex-row p-1">
          {([["signup", "Créer un compte"], ["signin", "Me connecter"]] as const).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} onPress={() => { setMode(k); auth.setError(null); }}
              className="h-[40px] flex-1 items-center justify-center rounded-pill" style={{ backgroundColor: mode === k ? color["accent-soft"] : "transparent" }}>
              <Text className={cx("font-sans-bold text-sm", mode === k ? "text-text" : "text-text-muted")}>{l}</Text>
            </Pressable>
          ))}
        </Glass>
        <TextField label="Email" value={email} onChangeText={(t) => { setEmail(t); auth.setError(null); }}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="toi@exemple.fr" />
        <TextField label="Mot de passe" value={password} onChangeText={(t) => { setPassword(t); auth.setError(null); }}
          secureTextEntry autoCapitalize="none" autoComplete={mode === "signup" ? "new-password" : "current-password"}
          textContentType={mode === "signup" ? "newPassword" : "password"} hint={mode === "signup" ? "8 caractères minimum." : undefined}
          error={auth.error ?? undefined} onSubmitEditing={submit} returnKeyType="go" />
        <Button size="lg" onPress={submit} loading={auth.pending} disabled={!email || !password}>
          {mode === "signup" ? "Créer mon compte" : "Me connecter"}
        </Button>
        {!USING_SUPABASE ? (
          <View className="flex-row gap-2">
            <Button className="flex-1" variant="secondary" onPress={async () => { if (await provider.mutate("apple")) router.replace("/"); }}>Démo Apple</Button>
            <Button className="flex-1" variant="secondary" onPress={async () => { if (await provider.mutate("google")) router.replace("/"); }}>Démo Google</Button>
          </View>
        ) : null}
        <Muted className="text-center">
          En continuant, tu confirmes avoir 18 ans ou plus et acceptes les conditions et la politique de confidentialité.
        </Muted>
      </View>
    </Screen>
  );
}
