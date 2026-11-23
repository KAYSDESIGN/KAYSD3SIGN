import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CalendarHeart, Camera, ChevronRight, Flame, MapPin, Settings, Smile, Sparkles } from "lucide-react-native";
import { InviteButtons } from "@/components/app/PairGate";
import { Screen } from "@/components/app/Screen";
import { AvatarPicker, useAvatars } from "@/components/app/AvatarPicker";
import { useGate } from "@/components/app/useGate";
import { Caption, Card, CoupleAvatars, Heading, IconButton, Muted, SpiceBadge, StreakBadge } from "@/components/ui";
import { api, useQuery } from "@/data";
import { color } from "@/theme";

// S17 · Profil du couple
export default function Us() {
  const { profile, partner, paired } = useGate();
  const photos = useAvatars();
  const couple = useQuery(api.getCouple);
  const premium = useQuery(api.isPremium);
  const spice = useQuery(api.getSpiceStatus);
  const me = profile?.display_name ?? ""; const them = partner?.display_name ?? "";

  return (
    <Screen edges={["top"]}>
      <View className="flex-row items-center justify-between">
        <Caption>PROFIL</Caption>
        <IconButton icon={Settings} label="Réglages" onPress={() => router.push("/settings")} />
      </View>
      <View className="items-center gap-3">
        {paired ? <CoupleAvatars me={{ name: me || "?", photo: photos.mine }} partner={{ name: them || "?", photo: photos.partner }} size={88} /> : null}
        <AvatarPicker name={me} />
        {!paired ? <Muted className="text-center">Ton/ta partenaire n'a pas encore rejoint ton espace.</Muted> : null}
        <Heading className="text-center">{paired ? `${me} & ${them}` : `${me} & …`}</Heading>
        <View className="flex-row items-center gap-2">
          {paired ? <StreakBadge days={couple.data?.streak_count ?? 0} /> : null}
          {spice.data?.effective ? <SpiceBadge size="md" level={spice.data.effective} /> : null}
        </View>
      </View>

      {!paired ? <InviteButtons /> : null}
      <Card className="gap-0 px-4 py-1">
        <Row icon={Sparkles} label={premium.data ? "Premium actif pour vous deux" : "Passer à Premium"} onPress={() => router.push("/premium")} tint={color.gold} />
        <Row icon={Flame} label="Niveau d'audace et 18+" onPress={() => router.push("/age")} />
        <Row icon={CalendarHeart} label="Nos dates" onPress={() => router.push("/dates")} last />
      </Card>
      {paired ? (
        <Card className="gap-0 px-4 py-1">
          <Row icon={Smile} label="Mon humeur du moment" onPress={() => router.push("/mood")} />
          <Row icon={Camera} label="Nos moments" onPress={() => router.push("/moments")} />
          <Row icon={MapPin} label="Carte à deux" onPress={() => router.push("/map")} last />
        </Card>
      ) : null}
      <Muted className="text-center">{"Tout ce que vous partagez ici reste entre vous deux."}</Muted>
    </Screen>
  );
}

function Row({ icon: Icon, label, onPress, tint, last }: { icon: typeof Flame; label: string; onPress: () => void; tint?: string; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      className={`min-h-[56px] flex-row items-center gap-3 px-1 active:bg-surface-raised ${last ? "" : "border-b border-border"}`}>
      <Icon size={20} color={tint ?? color.accent} />
      <Text className="flex-1 font-sans-semibold text-base text-text">{label}</Text>
      <ChevronRight size={18} color={color["text-muted"]} />
    </Pressable>
  );
}
