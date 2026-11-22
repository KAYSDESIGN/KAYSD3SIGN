import { Redirect, Tabs } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glass, GradientFill } from "@/components/ui";
import { Flame, Gamepad2, Heart, House, MapPin } from "lucide-react-native";
import { View } from "react-native";
import { GATE_HREF, useGate } from "@/components/app/useGate";
import { color, cx, tokens } from "@/theme";

export default function TabsLayout() {
  const { gate } = useGate();
  if (gate === "loading") return <View className="flex-1 bg-bg" />;
  if (gate === "signed_out" || gate === "needs_profile") return <Redirect href={GATE_HREF[gate]} />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}>
      <Tabs.Screen name="home" options={{ title: "Nous deux" }} />
      <Tabs.Screen name="map" options={{ title: "Carte" }} />
      <Tabs.Screen name="play" options={{ title: "Jouer" }} />
      <Tabs.Screen name="desires" options={{ title: "Envies" }} />
      <Tabs.Screen name="us" options={{ title: "Profil" }} />
    </Tabs>
  );
}

const TAB_ICONS: Record<string, typeof House> = { home: House, map: MapPin, play: Gamepad2, desires: Flame, us: Heart };

/** Barre d'onglets flottante en verre ; l'onglet actif est une pastille en dégradé. */
function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: "center" }}>
      <Glass strong radius={999} className="w-full max-w-[420px] flex-row items-center justify-around px-2" style={{ height: tokens.layout["tab-bar"], marginHorizontal: tokens.layout["tab-bar-inset"], width: "92%" }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const Icon = TAB_ICONS[route.name] ?? House;
          const label = (options.title ?? route.name) as string;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              className={cx("h-[52px] w-[52px] items-center justify-center rounded-pill overflow-hidden", !focused && "active:bg-surface")}
              style={focused ? { boxShadow: "0 6px 16px rgba(207,36,112,0.35)" } : undefined}
            >
              {focused ? <GradientFill /> : null}
              <View>
                <Icon size={23} color={focused ? "#FFFFFF" : color["text-muted"]} strokeWidth={focused ? 2.4 : 2} />
              </View>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}
