import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowUp, Heart, Sparkles } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Skeleton } from "@/components/app/Screen";
import { BackButton, EdgeSwipeBack } from "@/components/app/BackNav";
import { useAvatars } from "@/components/app/AvatarPicker";
import { useGate } from "@/components/app/useGate";
import { Emoji, EmojiText, GlassBackground, MOODS } from "@/components/ui";
import { api, useMutation, useQuery, type Message } from "@/data";
import { AVATAR_COLORS, color, cx, HEART } from "@/theme";

/** Place laissée sous le champ de saisie pour le dock flottant. */
const DOCK_SPACE = 92;

const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso); const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "AUJOURD'HUI";
  if (d.toDateString() === y.toDateString()) return "HIER";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) }).toUpperCase();
}
/** Message fait uniquement d'émojis (1 à 3) : affiché en grand. */
const emojiOnly = (t: string) => /^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s){1,12}$/u.test(t.trim()) && !/[0-9#*]/.test(t);

/** En-tête : photo, prénom et petites pastilles (humeur, série). */
function Header({ tab, name, photo, mood, streak }: { tab?: boolean; name: string; photo?: string | null; mood?: { emoji: string; label: string }; streak: number }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-border px-4 pb-3 pt-2">
      {tab ? null : <BackButton />}
      <View className="h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-pill" style={{ backgroundColor: AVATAR_COLORS[1] }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
          : <Text className="font-sans-bold text-[19px]" style={{ color: "#FFFFFF" }}>{name.slice(0, 1).toUpperCase()}</Text>}
      </View>
      <View className="flex-1 gap-[6px]">
        <Text accessibilityRole="header" numberOfLines={1} className="font-sans-semibold text-[20px] text-text">{name}</Text>
        <View className="flex-row flex-wrap gap-[6px]">
          {mood ? <Chip><Emoji char={mood.emoji} size={14} /><Text className="font-sans-semibold text-[12px] text-text">{mood.label}</Text></Chip> : null}
          <Chip><Emoji char="🔥" size={13} /><Text className="font-sans-semibold text-[12px] text-text">{`${streak} jour${streak > 1 ? "s" : ""}`}</Text></Chip>
        </View>
      </View>
    </View>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <View className="h-[26px] flex-row items-center gap-[5px] rounded-pill border border-border px-[10px]" style={{ backgroundColor: color["card-rose"] }}>{children}</View>;
}

/** Mot express (❤ du dock) : petite carte avec liseré, comme une pièce jointe. */
function NudgeCard({ m, mine }: { m: Message; mine: boolean }) {
  const [emoji, ...rest] = (m.body ?? "").split(" ");
  return (
    <View className={cx("max-w-[78%] rounded-[22px] p-[6px]", mine ? "self-end" : "self-start")} style={{ backgroundColor: color["card-rose"] }}>
      <View className="flex-row overflow-hidden rounded-[16px]" style={{ backgroundColor: color.bg }}>
        <View style={{ width: 4, backgroundColor: HEART }} />
        <View className="flex-1 gap-2 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <Heart size={15} color={HEART} fill={HEART} />
            <Text className="font-sans-semibold text-[13px] text-text">Mot express</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Emoji char={emoji} size={34} />
            <Text className="flex-1 font-sans-semibold text-[17px] text-accent">{rest.join(" ")}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const body = m.body ?? "";
  const big = emojiOnly(body);
  return (
    <View className={cx("max-w-[80%] px-[18px] py-[11px]", mine ? "self-end" : "self-start")}
      style={{
        backgroundColor: mine ? color.accent : color["card-rose"],
        borderRadius: 22, ...(mine ? { borderBottomRightRadius: 8 } : { borderBottomLeftRadius: 8 }),
      }}>
      <EmojiText size={big ? 30 : 19} className={cx("font-sans", big ? "text-[28px] leading-[36px]" : "text-[16px] leading-[22px]")} style={{ color: mine ? color.bg : color.text }}>{body}</EmojiText>
    </View>
  );
}

/** Conversation privée du couple. `tab` : affichée dans le dock (onglet Chat), sans bouton retour. */
export function Conversation({ tab }: { tab?: boolean }) {
  const { profile, partner } = useGate();
  const msgs = useQuery(api.getMessages);
  const moods = useQuery(api.getMoods);
  const couple = useQuery(api.getCouple);
  const photos = useAvatars();
  const send = useMutation(api.sendNote);
  const [text, setText] = useState("");
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const them = partner?.display_name ?? "ton/ta partenaire";
  const mood = MOODS.find((x) => x.key === moods.data?.partner?.mood);

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [msgs.data?.length]);
  const submit = async () => { const t = text; if (!t.trim()) return; setText(""); await send.mutate(t); };

  const list = msgs.data ?? [];
  return (
    <SafeAreaView edges={tab ? ["top"] : ["top", "bottom"]} className="flex-1 bg-bg">
      <GlassBackground />
      {tab ? null : <EdgeSwipeBack />}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="w-full max-w-[560px] flex-1 self-center">
          <Header tab={tab} name={them} photo={photos.partner} mood={mood} streak={couple.data?.streak_count ?? 0} />

          <ScrollView ref={scroll} className="flex-1" contentContainerClassName="gap-[6px] px-4 pb-4 pt-2">
            {msgs.loading && !msgs.data ? <Skeleton className="h-[120px]" /> : null}
            {msgs.data && list.length === 0 ? (
              <View className="items-center gap-3 px-8 py-16">
                <Emoji char="💌" size={56} />
                <Text className="text-center font-sans-semibold text-[18px] text-text">{`Écris à ${them}`}</Text>
                <Text className="text-center font-sans text-[14px] text-text-muted">Un merci, un souvenir, une promesse pour ce soir. Rien que pour vous deux.</Text>
              </View>
            ) : null}
            {list.map((m, i) => {
              const mine = m.sender_id === profile?.id;
              const prev = list[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              const newGroup = newDay || prev.sender_id !== m.sender_id || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 10 * 60000;
              return (
                <View key={m.id} className="gap-[6px]">
                  {newDay ? <Text className="py-4 text-center font-sans-semibold text-[12px] tracking-[1.4px] text-text-muted">{dayLabel(m.created_at)}</Text> : null}
                  {newGroup ? (
                    <Text className={cx("mt-2 px-2 font-sans text-[12px] text-text-muted", mine ? "self-end" : "self-start")}>{`${mine ? "Toi" : them} · ${time(m.created_at)}`}</Text>
                  ) : null}
                  {m.kind === "text" ? <Bubble m={m} mine={mine} /> : <NudgeCard m={m} mine={mine} />}
                </View>
              );
            })}
            {api.dev.enabled ? <DevPanel actions={[{ label: "Sam écrit un mot", onPress: () => api.dev.partnerNote() }]} /> : null}
          </ScrollView>

          <View className="flex-row items-end gap-2 border-t border-border bg-bg px-3 py-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Petits mots tout prêts" onPress={() => router.push("/notes")}
              className="h-[46px] w-[42px] items-center justify-center active:opacity-60">
              <Sparkles size={22} color={color.accent} strokeWidth={1.8} />
            </Pressable>
            <TextInput
              accessibilityLabel={`Message pour ${them}`}
              value={text}
              onChangeText={setText}
              placeholder="Message…"
              placeholderTextColor={color["text-muted"]}
              multiline
              maxLength={2000}
              onSubmitEditing={submit}
              blurOnSubmit={false}
              className="max-h-[120px] min-h-[46px] flex-1 rounded-[23px] px-[18px] py-[12px] font-sans text-[16px] text-text"
              style={{ backgroundColor: color["card-rose"] }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Envoyer" accessibilityState={{ disabled: !text.trim() }} onPress={submit}
              className="h-[46px] w-[46px] items-center justify-center rounded-pill active:opacity-80"
              style={{ backgroundColor: color.accent, opacity: text.trim() ? 1 : 0.45 }}>
              <ArrowUp size={22} color={color.bg} strokeWidth={2.4} />
            </Pressable>
          </View>
          {send.error ? <Text className="px-5 pb-2 font-sans-semibold text-sm text-danger">{send.error}</Text> : null}
          {tab ? <View style={{ height: DOCK_SPACE }} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
