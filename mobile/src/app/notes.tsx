import type React from "react";
import { withPartner } from "@/components/app/PairGate";
import { MessageCircle as MessageCircleIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, MessageCircle, Send } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Skeleton } from "@/components/app/Screen";
import { BackButton, EdgeSwipeBack } from "@/components/app/BackNav";
import { useGate } from "@/components/app/useGate";
import { Caption, EmojiText, EmptyState, GlassBackground, Heading, IconButton } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";
import { color, cx } from "@/theme";

const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// S14 · Petits mots
function Notes() {
  const { profile, partner } = useGate();
  const msgs = useQuery(api.getMessages);
  const send = useMutation(api.sendNote);
  const [text, setText] = useState("");
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const them = partner?.display_name ?? "ton/ta partenaire";

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [msgs.data?.length]);
  const submit = async () => { const t = text; if (!t.trim()) return; setText(""); await send.mutate(t); };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-bg">
      <GlassBackground />
      <EdgeSwipeBack />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="w-full max-w-[560px] flex-1 self-center">
          <View className="gap-1 px-5 pb-3 pt-4">
            <View className="mb-2 flex-row"><BackButton /></View>
            <Caption>Petits mots</Caption>
            <Heading>{`Toi et ${them}`}</Heading>
          </View>
          <ScrollView ref={scroll} className="flex-1" contentContainerClassName="gap-2 px-5 pb-4">
            {msgs.loading && !msgs.data ? <Skeleton className="h-[120px]" /> : null}
            {msgs.data && msgs.data.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Écris-lui quelque chose de doux" body="Un merci, un souvenir, une promesse pour ce soir. Rien que pour vous deux." />
            ) : null}
            {msgs.data?.map((m) => {
              const mine = m.sender_id === profile?.id;
              if (m.kind !== "text") {
                return (
                  <View key={m.id} className="flex-row items-center justify-center gap-2 py-1">
                    <Heart size={14} color={color.accent} fill={color.accent} />
                    <EmojiText size={15} className="font-sans text-xs text-text-muted">{`${mine ? "Toi" : them} : ${m.body} · ${time(m.created_at)}`}</EmojiText>
                  </View>
                );
              }
              return (
                <View key={m.id} className={cx("max-w-[80%] gap-1 rounded-lg px-4 py-3", mine ? "self-end bg-accent-soft" : "self-start bg-surface-raised")}>
                  <EmojiText size={19} className="font-sans text-base text-text">{m.body ?? ""}</EmojiText>
                  <Text className={cx("font-sans text-xs", mine ? "text-on-accent-soft" : "text-text-muted")}>{time(m.created_at)}</Text>
                </View>
              );
            })}
            {api.dev.enabled ? <DevPanel actions={[{ label: "Sam écrit un mot", onPress: () => api.dev.partnerNote() }]} /> : null}
          </ScrollView>
          <View className="flex-row items-end gap-2 border-t border-glass-edge bg-surface px-4 py-3">
            <TextInput
              accessibilityLabel={`Message pour ${them}`}
              value={text}
              onChangeText={setText}
              placeholder="Un petit mot…"
              placeholderTextColor={color["text-subtle"]}
              multiline
              maxLength={2000}
              onSubmitEditing={submit}
              blurOnSubmit={false}
              className="max-h-[120px] min-h-[44px] flex-1 rounded-lg border border-border-input bg-surface-raised px-4 py-3 font-sans text-base text-text"
            />
            <IconButton icon={Send} label="Envoyer" tone="accent" onPress={submit} />
          </View>
          {send.error ? <Text className="px-5 pb-2 font-sans-semibold text-sm text-danger">{send.error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default withPartner(Notes, { id: "S14", kicker: "Petits mots", title: "Des messages rien que pour vous deux", body: "Un merci, un souvenir, une promesse pour ce soir. Les « tu me manques » s'y retrouvent aussi.", example: "Hâte de te retrouver ce soir.", icon: MessageCircleIcon });
