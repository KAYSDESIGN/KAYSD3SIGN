import "../../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Fraunces_600SemiBold, Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces";
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { color } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold, Fraunces_600SemiBold_Italic, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    </>
  );
}
