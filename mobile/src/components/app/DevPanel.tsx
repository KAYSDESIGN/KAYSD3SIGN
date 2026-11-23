import { View } from "react-native";
import { Button, Caption } from "@/components/ui";

/** Boutons de simulation du/de la partenaire. Affichés uniquement en mode démo (couche factice). */
export function DevPanel({ actions }: { actions: { label: string; onPress: () => void }[] }) {
  return (
    <View className="gap-2 rounded-md border border-dashed border-border p-3">
      <Caption>Démo · simuler le/la partenaire</Caption>
      <View className="flex-row flex-wrap gap-2">
        {actions.map((a) => <Button key={a.label} size="sm" variant="secondary" onPress={a.onPress}>{a.label}</Button>)}
      </View>
    </View>
  );
}
