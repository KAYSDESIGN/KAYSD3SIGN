import { router } from "expo-router";
import { Hammer } from "lucide-react-native";
import { Button, Caption, EmptyState, Heading } from "@/components/ui";
import { Screen } from "./Screen";

/** Écran pas encore construit : route en place, contenu à venir (voir replica/build-log.md). */
export function StubScreen({ id, title, body }: { id: string; title: string; body: string }) {
  return (
    <Screen>
      <Caption>{id}</Caption>
      <Heading>{title}</Heading>
      <EmptyState icon={Hammer} title="Bientôt ici" body={body} />
      <Button variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>Retour</Button>
    </Screen>
  );
}
