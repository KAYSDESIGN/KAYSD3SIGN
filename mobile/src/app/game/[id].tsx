import type React from "react";
import { useState } from "react";
import { withPartner } from "@/components/app/PairGate";
import { Gamepad2 as Gamepad2Icon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Flame, Heart, SearchX } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Button, Caption, EmojiText, EmptyState, Heading, Toast } from "@/components/ui";
import { api, useMutation, useQuery, type Game } from "@/data";
import { color, cx, FLAME, HEART } from "@/theme";
import { GAME_NAMES } from "@/components/app/games";

// S12 · Partie (morpion et quatre d'affilée). Les coups sont validés côté données (Edge Function game-move en vrai).
function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, partner } = useGate();
  const game = useQuery(() => api.getGame(id), [id]);
  const move = useMutation(api.playMove);
  const again = useMutation(api.createGame);
  const quit = useMutation(api.abandonGame);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const them = partner?.display_name ?? "l'autre";

  if (game.loading && !game.data) return <Screen><Skeleton className="h-[34px] w-1/2" /><Skeleton className="h-[320px]" /></Screen>;
  const g = game.data;
  if (!g) return <Screen><EmptyState icon={SearchX} title="Partie introuvable" body="Elle a peut-être été effacée." action="Retour" onAction={() => router.replace("/play")} /></Screen>;

  const myTurn = g.status === "active" && g.turn_user_id === profile?.id;
  const headline = g.status === "abandoned"
    ? g.winner_id === profile?.id ? `${them} a abandonné, tu gagnes` : "Tu as abandonné"
    : g.status === "finished"
    ? g.draw ? "Égalité !" : g.winner_id === profile?.id ? "Tu as gagné 🎉" : `${them} a gagné`
    : myTurn ? "À toi de jouer" : `Au tour de ${them}`;
  const play = (i: number) => { if (myTurn && !move.pending) move.mutate(g.id, i, g.version); };

  return (
    <Screen>
      <Caption>{GAME_NAMES[g.game_type]}</Caption>
      <Heading accessibilityLiveRegion="polite"><EmojiText size={28}>{headline}</EmojiText></Heading>
      <View className="flex-row items-center gap-4">
        <Legend icon={<Heart size={16} color={HEART} fill={HEART} />} label="Toi" />
        <Legend icon={<Flame size={16} color={FLAME.stroke} fill={FLAME.fill} strokeWidth={1.8} />} label={them} />
      </View>
      {g.game_type === "tic_tac_toe" ? <TicTacToe g={g} me={profile?.id} onPlay={play} enabled={myTurn} /> : <FourInRow g={g} me={profile?.id} onPlay={play} enabled={myTurn} />}
      {move.error ? <Toast tone="error">{move.error}</Toast> : null}
      {quit.error ? <Toast tone="error">{quit.error}</Toast> : null}
      {g.status === "active" ? (
        <Button variant="ghost" loading={quit.pending} onPress={async () => {
          if (!confirmQuit) return setConfirmQuit(true);
          await quit.mutate(g.id); setConfirmQuit(false);
        }}>{confirmQuit ? `Confirmer : ${them} gagne la partie` : "Abandonner la partie"}</Button>
      ) : null}
      {g.status !== "active" ? (
        <Button size="lg" loading={again.pending} onPress={async () => { const nid = await again.mutate(g.game_type); if (nid) router.replace({ pathname: "/game/[id]", params: { id: nid } }); }}>Revanche</Button>
      ) : null}
      {api.dev.enabled && g.status === "active" && !myTurn ? <DevPanel actions={[{ label: "Sam joue", onPress: () => api.dev.partnerPlays(g.id) }]} /> : null}
    </Screen>
  );
}

function Legend({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <View className="flex-row items-center gap-2">{icon}<Text className="font-sans-semibold text-sm text-text">{label}</Text></View>;
}

function Piece({ owner, me, size }: { owner: string | null; me?: string; size: number }) {
  if (!owner) return null;
  return owner === me ? <Heart size={size} color={HEART} fill={HEART} /> : <Flame size={size} color={FLAME.stroke} fill={FLAME.fill} strokeWidth={1.8} />;
}

type BoardProps = { g: Game; me?: string; onPlay: (i: number) => void; enabled: boolean };

function TicTacToe({ g, me, onPlay, enabled }: BoardProps) {
  return (
    <View accessibilityLabel="Plateau 3 par 3" className="aspect-square w-full max-w-[360px] flex-row flex-wrap self-center rounded-lg bg-border p-[6px]">
      {g.board.map((v, i) => {
        const who = v ? (v === me ? "ton cœur" : "sa flamme") : "vide";
        return (
          <View key={i} className="h-1/3 w-1/3 p-[3px]">
            <Pressable accessibilityRole="button" accessibilityLabel={`Ligne ${Math.floor(i / 3) + 1}, colonne ${(i % 3) + 1}, ${who}`}
              accessibilityState={{ disabled: !enabled || !!v }} disabled={!enabled || !!v} onPress={() => onPlay(i)}
              className={cx("flex-1 items-center justify-center rounded-md bg-surface", enabled && !v && "active:bg-accent-soft")}>
              <Piece owner={v} me={me} size={40} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function FourInRow({ g, me, onPlay, enabled }: BoardProps) {
  return (
    <View className="w-full max-w-[420px] flex-row self-center rounded-lg bg-border p-[4px]">
      {Array.from({ length: g.cols }, (_, c) => {
        const full = !!g.board[c];
        return (
          <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Colonne ${c + 1}${full ? ", pleine" : ""}`}
            accessibilityState={{ disabled: !enabled || full }} disabled={!enabled || full} onPress={() => onPlay(c)}
            className={cx("flex-1 gap-[4px] rounded-md p-[2px]", enabled && !full && "active:bg-accent-soft")}>
            {Array.from({ length: g.rows }, (_, r) => {
              const v = g.board[r * g.cols + c];
              return (
                <View key={r} className="aspect-square items-center justify-center rounded-pill bg-bg">
                  <Piece owner={v} me={me} size={20} />
                </View>
              );
            })}
          </Pressable>
        );
      })}
    </View>
  );
}

export default withPartner(GameScreen, { id: "S12", kicker: "Jouer", title: "Une partie se joue à deux", body: "Chacun joue à son tour, même à distance. Le plateau se met à jour tout seul.", icon: Gamepad2Icon });
