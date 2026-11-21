import { Link } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Display, Button } from "@/components/ui";

// Écran provisoire : remplacé par l'accueil S04 pendant replica-build.
export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 justify-center gap-4 px-5">
        <Display>HotCouple</Display>
        <Body className="text-text-muted">Rien que vous deux. Un peu plus chaque jour.</Body>
        <Link href="/design" asChild>
          <Button variant="secondary">Voir le design system</Button>
        </Link>
      </View>
    </SafeAreaView>
  );
}
