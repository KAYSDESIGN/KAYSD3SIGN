import type { ReactNode } from "react";
import { Image, type ImageSourcePropType, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, type LucideIcon } from "lucide-react-native";
import { color, cx } from "@/theme";
import { Glass } from "./Glass";

/**
 * Briques du design « éditorial » (palette Bordeaux) : cartes pleines et douces, photos d'ambiance,
 * liens fléchés. Le verre reste réservé au dock et aux boutons flottants.
 */

export type SoftTone = "rose" | "sand" | "wine";
const BG: Record<SoftTone, string> = { rose: "card-rose", sand: "card-sand", wine: "card-wine" };

/** Carte pleine, coins arrondis, sans ombre. */
export function SoftCard({ tone = "rose", children, className, onPress, label }: {
  tone?: SoftTone; children: ReactNode; className?: string; onPress?: () => void; label?: string;
}) {
  const style = { backgroundColor: color[BG[tone] as "card-rose"] };
  const cls = cx("overflow-hidden rounded-[22px]", className);
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className={cx(cls, "active:opacity-90")} style={style}>{children}</Pressable>
  ) : (
    <View className={cls} style={style}>{children}</View>
  );
}

/** Texte suivi d'une flèche : « Découvrir le défi → ». */
export function ArrowLink({ children, onWine }: { children: string; onWine?: boolean }) {
  const c = onWine ? color["on-wine"] : color.text;
  return (
    <View className="flex-row items-center gap-2">
      <Text className="font-sans-semibold text-[13px]" style={{ color: c }}>{children}</Text>
      <ArrowRight size={15} color={c} strokeWidth={2.2} />
    </View>
  );
}

/** Bouton pilule : blanc sur photo, bordeaux sur carte claire. */
export function PillButton({ children, onPress, tone = "wine", label }: { children: string; onPress?: () => void; tone?: "wine" | "light"; label?: string }) {
  // Verre teinté bordeaux (action principale) ou verre clair sur photo
  const fg = tone === "wine" ? color["on-wine"] : "#FFFFFF";
  return (
    <Glass float interactive radius={14} className="self-start" prominent={tone === "wine" ? color["card-wine"] : undefined} variant={tone === "light" ? "clear" : undefined}>
      <Pressable accessibilityRole="button" accessibilityLabel={label ?? children} onPress={onPress}
        className="h-[40px] flex-row items-center gap-2 px-4">
        <Text className="font-sans-semibold text-[14px]" style={{ color: fg }}>{children}</Text>
        <ArrowRight size={16} color={fg} strokeWidth={2.2} />
      </Pressable>
    </Glass>
  );
}

/** Grande carte photo du carrousel : photo d'ambiance, voile sombre, étiquette, question, bouton. */
export function PhotoCard({ photo, chip, title, action, onPress, width, height = 208 }: {
  photo: ImageSourcePropType; chip: string; title: string; action: string; onPress: () => void; width: number; height?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${chip}. ${title}. ${action}`} onPress={onPress}
      className="overflow-hidden rounded-[24px] active:opacity-95" style={{ width, height }}>
      <Image source={photo} resizeMode="cover" style={{ position: "absolute", width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
      <LinearGradient colors={["rgba(30,10,18,0.15)", "rgba(30,10,18,0.35)", "rgba(30,10,18,0.78)"]} locations={[0, 0.4, 1]} style={{ position: "absolute", inset: 0 }} />
      <View className="flex-1 justify-between p-5">
        <Glass float variant="clear" radius={999} className="self-start">
          <View className="px-3 py-[6px]"><Text className="font-sans-semibold text-[12px]" style={{ color: "#FFFFFF" }}>{chip}</Text></View>
        </Glass>
        <View className="gap-3">
          <Text numberOfLines={3} className="font-sans-semibold text-[21px] leading-[27px]" style={{ color: "#FFFFFF" }}>{title}</Text>
          {/* Bouton en verre liquide posé sur la photo (comme le dock) */}
          <View pointerEvents="none" className="self-start">
            <Glass float interactive variant="clear" radius={14}>
              <View className="h-[40px] flex-row items-center gap-2 px-4">
                <Text className="font-sans-semibold text-[14px]" style={{ color: "#FFFFFF" }}>{action}</Text>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </Glass>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Petite tuile d'exploration : icône fine + libellé centré. */
export function ExploreTile({ icon: Icon, label, tone, onPress }: { icon: LucideIcon; label: string; tone: SoftTone; onPress: () => void }) {
  return (
    <SoftCard tone={tone} onPress={onPress} label={label} className="h-[88px] flex-1 items-center justify-center gap-2 rounded-[18px] px-2">
      <Icon size={22} color={color.accent} strokeWidth={1.6} />
      <Text numberOfLines={2} className="text-center font-sans-semibold text-[12.5px] leading-[16px] text-text">{label}</Text>
    </SoftCard>
  );
}

/** Photo encastrée à droite d'une carte (défi du jour, rituel). */
export function SidePhoto({ photo, width = "36%" }: { photo: ImageSourcePropType; width?: `${number}%` }) {
  // La photo suit la hauteur du texte de la carte (elle ne l'impose pas).
  return (
    <View style={{ width, alignSelf: "stretch" }}>
      <Image source={photo} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
    </View>
  );
}

export const PHOTOS = {
  question: require("../../../assets/photos/mood-question.jpg"),
  spicy: require("../../../assets/photos/mood-spicy.jpg"),
  couple: require("../../../assets/photos/couple-defi.jpg"),
  ritual: require("../../../assets/photos/couple-today.jpg"),
};
