import { Pressable, Text, View } from "react-native";
import { withPartner } from "@/components/app/PairGate";
import { Gamepad2 as Gamepad2Icon } from "lucide-react-native";
import { router } from "expo-router";
import { ChevronRight, Dices, Grid3x3, Smile, Columns3 } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Caption, Heading, Muted, Toast } from "@/components/ui";
import { api, useMutation, useQuery, type Game, type GameType } from "@/data";
import { color, cx } from "@/theme";
import { GAME_NAMES } from "@/components/app/games";



// S11 · Jouer
function Play() {
  const { profile, partner } = useGate();
  const games = useQuery(api.getGames);
  const create = useMutation(api.createGame);
  const them = partner?.display_name ?? "l'autre";
  const active = games.data?.filter((g) => g.status === "active") ?? [];
  const finished = games.data?.filter((g) => g.status === "finished") ?? [];
  const wins = finished.filter((g) => g.winner_id === profile?.id).length;
  const losses = finished.filter((g) => g.winner_id && g.winner_id !== profile?.id).length;

  const start = async (t: GameType) => { const id = await create.mutate(t); if (id) router.push({ pathname: "/game/[id]", params: { id } }); };
  const status = (g: Game) => g.turn_user_id === profile?.id ? "À toi de jouer" : `Au tour de ${them}`;

  return (
    <Screen edges={["top"]}>
      <Caption>Jouer</Caption>
      <Heading>À deux, même à distance</Heading>
      {finished.length ? <Body className="text-text-muted">{`Score : toi ${wins} · ${them} ${losses}`}</Body> : null}
      {create.error ? <Toast tone="error">{create.error}</Toast> : null}

      {games.loading && !games.data ? <Skeleton className="h-[80px]" /> : active.length ? (
        <View className="gap-2">
          <Caption>Parties en cours</Caption>
          {active.map((g) => (
            <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${GAME_NAMES[g.game_type]}, ${status(g)}`}
              onPress={() => router.push({ pathname: "/game/[id]", params: { id: g.id } })}
              className="min-h-[56px] flex-row items-center gap-3 rounded-md border border-border bg-surface px-4 active:bg-surface-raised">
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-text">{GAME_NAMES[g.game_type]}</Text>
                <Text className={cx("font-sans-semibold text-sm", g.turn_user_id === profile?.id ? "text-accent" : "text-text-muted")}>{status(g)}</Text>
              </View>
              <ChevronRight size={18} color={color["text-muted"]} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="gap-2">
        <Caption>Nouvelle partie</Caption>
        <View className="flex-row flex-wrap gap-2">
          <Tile icon={Grid3x3} title={GAME_NAMES.tic_tac_toe} sub="3 cœurs alignés" onPress={() => start("tic_tac_toe")} />
          <Tile icon={Columns3} title={GAME_NAMES.four_in_row} sub="4 pions à la suite" onPress={() => start("four_in_row")} />
          <Tile icon={Smile} title="Quiz à deux" sub="Votre score de complicité" onPress={() => router.push("/quiz")} />
          <Tile icon={Dices} title="Dés coquins" sub="Pour pimenter la soirée" onPress={() => router.push("/dice")} />
        </View>
        <Muted>{"D'autres jeux arrivent : mots, mémoire, quiz de culture."}</Muted>
      </View>
    </Screen>
  );
}

function Tile({ icon: Icon, title, sub, onPress }: { icon: typeof Dices; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={onPress}
      className="min-h-[112px] grow basis-[45%] justify-between rounded-lg border border-border bg-surface p-4 active:bg-surface-raised">
      <Icon size={24} color={color.accent} />
      <View>
        <Text className="font-sans-bold text-base text-text">{title}</Text>
        <Text className="font-sans text-sm text-text-muted">{sub}</Text>
      </View>
    </Pressable>
  );
}

export default withPartner(Play, { id: "S11", kicker: "Jouer", title: "À deux, même à distance", body: "Morpion du cœur, Quatre d'affilée, quiz de complicité et dés coquins. Chacun joue à son tour, le plateau se met à jour tout seul.", example: "« À toi de jouer » : ton cœur contre sa flamme.", icon: Gamepad2Icon }, { tabs: true });
