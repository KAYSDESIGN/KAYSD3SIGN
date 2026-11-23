import { Redirect } from "expo-router";
import { View } from "react-native";
import { GATE_HREF, useGate } from "@/components/app/useGate";

/** Aiguillage : connexion → profil → appairage → accueil. */
export default function Index() {
  const { gate } = useGate();
  if (gate === "loading") return <View className="flex-1 bg-bg" />;
  return <Redirect href={GATE_HREF[gate]} />;
}
