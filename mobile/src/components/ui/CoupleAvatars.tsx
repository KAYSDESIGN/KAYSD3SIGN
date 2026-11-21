import { Text, View } from "react-native";
import { cx } from "@/theme";

type Person = { name: string; mood?: string };

/** Deux pastilles qui se chevauchent, avec l'humeur en petit badge. */
export function CoupleAvatars({ me, partner, size = 64 }: { me: Person; partner: Person; size?: number }) {
  const label = `${me.name} et ${partner.name}` + (partner.mood ? `, humeur de ${partner.name} : ${partner.mood}` : "");
  return (
    <View accessible accessibilityLabel={label} className="flex-row items-center">
      <Bubble person={me} size={size} tone="bg-surface-raised" />
      <View style={{ marginLeft: -size * 0.28 }}>
        <Bubble person={partner} size={size} tone="bg-accent-soft" />
      </View>
    </View>
  );
}

function Bubble({ person, size, tone }: { person: Person; size: number; tone: string }) {
  return (
    <View style={{ width: size, height: size }} className={cx("items-center justify-center rounded-pill border-2 border-bg", tone)}>
      <Text className="font-display text-xl text-text">{person.name.slice(0, 1).toUpperCase()}</Text>
      {person.mood ? (
        <View className="absolute -bottom-1 -right-1 h-[26px] w-[26px] items-center justify-center rounded-pill border-2 border-bg bg-surface">
          <Text className="text-xs">{person.mood}</Text>
        </View>
      ) : null}
    </View>
  );
}
