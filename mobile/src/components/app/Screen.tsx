import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cx } from "@/theme";

/** Conteneur d'écran : zone sûre, défilement, colonne centrée (max 560) pour tablette et web 1440. */
export function Screen({
  children, scroll = true, className, edges = ["top", "bottom"], ...p
}: ScrollViewProps & { scroll?: boolean; className?: string; edges?: ("top" | "bottom")[] }) {
  const inner = <View className={cx("w-full max-w-[560px] self-center gap-6 px-5 py-6", className)}>{children}</View>;
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow" {...p}>{inner}</ScrollView>
      ) : (
        <View className="flex-1">{inner}</View>
      )}
    </SafeAreaView>
  );
}

/** Squelette de chargement (pas de spinner plein écran). */
export function Skeleton({ className }: { className?: string }) {
  return <View accessibilityLabel="Chargement" className={cx("rounded-md bg-surface", className)} />;
}
