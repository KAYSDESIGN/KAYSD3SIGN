import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowUp, Camera, Heart, Sparkles } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
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
    <View className="flex-row items-center gap-3 border-b border-border bg-bg px-4 pb-3 pt-2">
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

/**
 * Bulles façon iMessage / WhatsApp : l'heure dans la bulle, en bas à droite ; dans une suite de messages
 * du même auteur, seule la dernière bulle a son coin « queue » resserré.
 */
function bubbleShape(mine: boolean, last: boolean) {
  return { borderRadius: 20, ...(last ? (mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }) : {}) };
}
function Stamp({ iso, mine, onPhoto }: { iso: string; mine: boolean; onPhoto?: boolean }) {
  return (
    <Text className="font-sans text-[11px]" style={{ color: onPhoto ? "#FFFFFF" : mine ? color["on-wine-muted"] : color["text-muted"] }}>{time(iso)}</Text>
  );
}

function Bubble({ m, mine, last }: { m: Message; mine: boolean; last: boolean }) {
  const body = m.body ?? "";
  if (emojiOnly(body)) {
    // Émojis seuls : en grand, sans bulle (comme sur iOS)
    return (
      <View className={cx("max-w-[80%] items-end gap-1 px-1", mine ? "self-end" : "self-start")}>
        <EmojiText size={40} className="font-sans text-[38px] leading-[46px]">{body}</EmojiText>
        <Stamp iso={m.created_at} mine={false} />
      </View>
    );
  }
  return (
    <View className={cx("max-w-[80%] flex-row flex-wrap items-end gap-x-2 gap-y-[2px] px-[14px] py-[8px]", mine ? "self-end" : "self-start")}
      style={{ backgroundColor: mine ? color.accent : color["card-rose"], ...bubbleShape(mine, last) }}>
      <EmojiText size={19} className="shrink font-sans text-[16px] leading-[22px]" style={{ color: mine ? color.bg : color.text }}>{body}</EmojiText>
      <Stamp iso={m.created_at} mine={mine} />
    </View>
  );
}

/** Mot express (❤ du dock) : une bulle comme les autres, avec le grand émoji. */
function NudgeBubble({ m, mine, last }: { m: Message; mine: boolean; last: boolean }) {
  const [emoji, ...rest] = (m.body ?? "").split(" ");
  const fg = mine ? color.bg : color.text;
  return (
    <View className={cx("max-w-[80%] gap-1 px-[14px] py-[10px]", mine ? "self-end" : "self-start")}
      style={{ backgroundColor: mine ? color.accent : color["card-rose"], ...bubbleShape(mine, last) }}>
      <View className="flex-row items-center gap-[6px]">
        <Heart size={12} color={mine ? color["on-wine-muted"] : HEART} fill={mine ? color["on-wine-muted"] : HEART} />
        <Text className="font-sans-semibold text-[11px] tracking-[0.6px]" style={{ color: mine ? color["on-wine-muted"] : color["text-muted"] }}>MOT EXPRESS</Text>
      </View>
      <View className="flex-row items-end gap-3">
        <Emoji char={emoji} size={30} />
        <Text className="shrink font-sans-semibold text-[17px] leading-[24px]" style={{ color: fg }}>{rest.join(" ")}</Text>
        <Stamp iso={m.created_at} mine={mine} />
      </View>
    </View>
  );
}

/** Photo : coins arrondis, heure posée sur l'image. */
function PhotoBubble({ m, mine, last }: { m: Message; mine: boolean; last: boolean }) {
  const [w, h] = (m.body ?? "3x4").split("x").map(Number);
  const width = 230; const height = Math.max(150, Math.min(320, Math.round((width * (h || 4)) / (w || 3))));
  return (
    <View className={cx("overflow-hidden", mine ? "self-end" : "self-start")}
      style={{ width, height, backgroundColor: color["card-rose"], ...bubbleShape(mine, last) }}>
      {m.photo_url ? <Image source={{ uri: m.photo_url }} resizeMode="cover" style={{ width: "100%", height: "100%" }} accessibilityLabel={mine ? "Ta photo" : "Photo reçue"} /> : null}
      <View className="absolute bottom-[6px] right-[8px] rounded-pill px-2 py-[2px]" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
        <Stamp iso={m.created_at} mine={mine} onPhoto />
      </View>
    </View>
  );
}

/** Choisit une photo dans la galerie, la réduit (1280 px max) et la renvoie en JPEG base64. */
async function pickPhoto(): Promise<{ b64: string; w: number; h: number } | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const scale = Math.min(1, 1280 / Math.max(a.width || 1280, a.height || 1280));
  const w = Math.round((a.width || 1280) * scale), h = Math.round((a.height || 960) * scale);
  const img = await ImageManipulator.manipulate(a.uri).resize({ width: w, height: h }).renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return out.base64 ? { b64: out.base64, w, h } : null;
}

/** Conversation privée du couple. `tab` : affichée dans le dock (onglet Chat), sans bouton retour. */
export function Conversation({ tab }: { tab?: boolean }) {
  const { profile, partner } = useGate();
  const msgs = useQuery(api.getMessages);
  const moods = useQuery(api.getMoods);
  const couple = useQuery(api.getCouple);
  const photos = useAvatars();
  const send = useMutation(api.sendNote);
  const sendPhoto = useMutation(async () => { const p = await pickPhoto(); if (p) await api.sendPhoto(p.b64, p.w, p.h); });
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

          <ScrollView ref={scroll} className="flex-1" contentContainerClassName="px-4 pb-4 pt-2">
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
              const prev = list[i - 1]; const next = list[i + 1];
              const gap = (x: Message, y: Message) => Math.abs(new Date(y.created_at).getTime() - new Date(x.created_at).getTime()) > 3 * 60000;
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              const first = newDay || prev.sender_id !== m.sender_id || gap(prev, m);
              const last = !next || next.sender_id !== m.sender_id || gap(m, next) || dayKey(next.created_at) !== dayKey(m.created_at);
              return (
                <View key={m.id} style={{ marginTop: newDay ? 0 : first ? 10 : 2 }}>
                  {newDay ? <Text className="py-4 text-center font-sans-semibold text-[12px] tracking-[1.4px] text-text-muted">{dayLabel(m.created_at)}</Text> : null}
                  {m.kind === "text" ? <Bubble m={m} mine={mine} last={last} />
                    : m.kind === "photo" ? <PhotoBubble m={m} mine={mine} last={last} />
                    : <NudgeBubble m={m} mine={mine} last={last} />}
                </View>
              );
            })}
            {api.dev.enabled ? <DevPanel actions={[{ label: "Sam écrit un mot", onPress: () => api.dev.partnerNote() }]} /> : null}
          </ScrollView>

          <View className="flex-row items-end gap-2 border-t border-border bg-bg px-3 py-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Envoyer une photo" disabled={sendPhoto.pending} onPress={() => sendPhoto.mutate()}
              className="h-[44px] w-[36px] items-center justify-center active:opacity-60" style={{ opacity: sendPhoto.pending ? 0.4 : 1 }}>
              <Camera size={23} color={color.accent} strokeWidth={1.8} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Petits mots tout prêts" onPress={() => router.push("/notes")}
              className="h-[44px] w-[32px] items-center justify-center active:opacity-60">
              <Sparkles size={22} color={color.accent} strokeWidth={1.8} />
            </Pressable>
            <TextInput
              accessibilityLabel={`Message pour ${them}`}
              value={text}
              onChangeText={setText}
              placeholder="Message…"
              placeholderTextColor={color["text-muted"]}
              multiline
              numberOfLines={1}
              maxLength={2000}
              onSubmitEditing={submit}
              blurOnSubmit={false}
              className="flex-1 rounded-[22px] px-[16px] font-sans text-[16px] text-text"
              style={{ backgroundColor: color["card-rose"], minHeight: 44, maxHeight: 120, paddingTop: 11, paddingBottom: 11, lineHeight: 22 }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Envoyer" accessibilityState={{ disabled: !text.trim() }} onPress={submit}
              className="h-[44px] w-[44px] items-center justify-center rounded-pill active:opacity-80"
              style={{ backgroundColor: color.accent, opacity: text.trim() ? 1 : 0.45 }}>
              <ArrowUp size={22} color={color.bg} strokeWidth={2.4} />
            </Pressable>
          </View>
          {sendPhoto.error ? <Text className="px-5 pb-2 font-sans-semibold text-sm text-danger">{sendPhoto.error}</Text> : null}
          {send.error ? <Text className="px-5 pb-2 font-sans-semibold text-sm text-danger">{send.error}</Text> : null}
          {tab ? <View style={{ height: DOCK_SPACE }} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
