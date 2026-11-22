import { Redirect, Tabs } from "expo-router";
import { Flame, Gamepad2, Heart, House, MapPin } from "lucide-react-native";
import { View } from "react-native";
import { GATE_HREF, useGate } from "@/components/app/useGate";
import { color, tokens } from "@/theme";

export default function TabsLayout() {
  const { gate } = useGate();
  if (gate === "loading") return <View className="flex-1 bg-bg" />;
  if (gate === "signed_out" || gate === "needs_profile") return <Redirect href={GATE_HREF[gate]} />;

  const icon = (I: typeof House) => ({ color: c, focused }: { color: unknown; focused: boolean }) =>
    <I size={22} color={String(c)} strokeWidth={focused ? 2.4 : 2} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color["text-muted"],
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border, height: tokens.layout["tab-bar"] },
        tabBarLabelStyle: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Nous deux", tabBarIcon: icon(House) }} />
      <Tabs.Screen name="map" options={{ title: "Carte", tabBarIcon: icon(MapPin) }} />
      <Tabs.Screen name="play" options={{ title: "Jouer", tabBarIcon: icon(Gamepad2) }} />
      <Tabs.Screen name="desires" options={{ title: "Envies", tabBarIcon: icon(Flame) }} />
      <Tabs.Screen name="us" options={{ title: "Profil", tabBarIcon: icon(Heart) }} />
    </Tabs>
  );
}
