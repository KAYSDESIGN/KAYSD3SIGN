import { Redirect, router, Tabs } from "expo-router";
import { api } from "@/data";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Emoji, Glass, LensGlass } from "@/components/ui";
import { CircleUser, Flame, Gamepad2, Heart, House, X } from "lucide-react-native";
import { View } from "react-native";
import { GATE_HREF, useGate } from "@/components/app/useGate";
import { color, cx, HEART } from "@/theme";

export default function TabsLayout() {
  const { gate } = useGate();
  if (gate === "loading") return <View className="flex-1 bg-bg" />;
  if (gate === "signed_out" || gate === "needs_profile") return <Redirect href={GATE_HREF[gate]} />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}>
      <Tabs.Screen name="home" options={{ title: "Nous" }} />
      <Tabs.Screen name="play" options={{ title: "Jouer" }} />
      <Tabs.Screen name="desires" options={{ title: "Envies" }} />
      <Tabs.Screen name="us" options={{ title: "Profil" }} />
      <Tabs.Screen name="map" options={{ title: "Carte" }} />
    </Tabs>
  );
}

const TAB_ICONS: Record<string, typeof House> = { home: House, play: Gamepad2, desires: Flame, us: CircleUser };
const SHOWN = Object.keys(TAB_ICONS); // la carte reste accessible depuis l'accueil

export const QUICK_NOTES = [
  { emoji: "❤️", label: "Je t'aime" },
  { emoji: "🔥", label: "J'ai envie de toi" },
  { emoji: "😘", label: "Je pense à toi" },
  { emoji: "🥺", label: "Tu me manques" },
] as const;

/** Barre d'onglets façon iOS 26 : capsule de verre avec libellés + bouton ❤ qui ouvre les petits mots express. */
function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { paired, partner } = useGate();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const them = partner?.display_name ?? "ton/ta partenaire";

  const press = () => {
    if (!paired) return router.push("/onboarding/pair");
    Haptics.selectionAsync().catch(() => {});
    setOpen((o) => !o);
  };
  const send = (n: (typeof QUICK_NOTES)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    api.sendNudge(`${n.emoji} ${n.label}`).catch(() => {});
    setOpen(false);
    setSent(n.emoji);
    setTimeout(() => setSent(null), 1800);
  };

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {open ? <Pressable accessibilityLabel="Fermer" onPress={() => setOpen(false)} style={{ position: "absolute", inset: 0 }} /> : null}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(insets.bottom, 10) + 6, alignItems: "center" }}>
        {open ? (
          <View className="w-[92%] max-w-[460px] items-end pb-3">
            <Glass radius={28} className="gap-1 p-2" style={{ width: 236 }}>
              <Text className="px-3 pb-1 pt-2 font-sans-bold text-xs uppercase tracking-wider text-text-muted">{`Envoyer à ${them}`}</Text>
              {QUICK_NOTES.map((n) => (
                <Pressable key={n.label} accessibilityRole="button" accessibilityLabel={`Envoyer : ${n.label}`} onPress={() => send(n)}
                  className="h-[48px] flex-row items-center gap-3 rounded-pill px-3 active:bg-surface-raised">
                  <Emoji char={n.emoji} size={26} />
                  <Text className="font-sans-bold text-[15px] text-text">{n.label}</Text>
                </Pressable>
              ))}
            </Glass>
          </View>
        ) : null}
        <View className="w-[92%] max-w-[460px] flex-row items-center gap-[10px]">
          <Glass radius={999} className="flex-1 flex-row items-center justify-around px-[6px]" style={{ height: 64 }}>
            {state.routes.filter((r) => SHOWN.includes(r.name)).map((route) => {
              const focused = state.routes[state.index]?.key === route.key;
              const { options } = descriptors[route.key];
              const Icon = TAB_ICONS[route.name] ?? House;
              const label = (options.title ?? route.name) as string;
              const press = () => {
                setOpen(false);
                const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              };
              const icon = <Icon size={24} color={color.text} strokeWidth={focused ? 2.4 : 2} />;
              return focused ? (
                <LensGlass key={route.key} tinted radius={999} style={{ width: 72, height: 52 }}>
                  <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }} accessibilityLabel={label} onPress={press}
                    className="flex-1 items-center justify-center"><View>{icon}</View></Pressable>
                </LensGlass>
              ) : (
                <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: false }} accessibilityLabel={label} onPress={press}
                  className="h-[52px] w-[58px] items-center justify-center rounded-pill active:opacity-60" style={{ opacity: 0.72 }}>
                  <View>{icon}</View>
                </Pressable>
              );
            })}
          </Glass>
          <LensGlass radius={999} style={{ width: 64, height: 64 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
              accessibilityLabel={paired ? (sent ? "Envoyé" : "Petits mots express") : "Inviter mon/ma partenaire"}
              onPress={press} className="flex-1 items-center justify-center active:opacity-70">
              <View>
                {sent ? <Emoji char={sent} size={30} />
                  : open ? <X size={24} color={color.text} strokeWidth={2.4} />
                  : <Heart size={25} color={HEART} fill={HEART} />}
              </View>
            </Pressable>
          </LensGlass>
        </View>
      </View>
    </View>
  );
}
