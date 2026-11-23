import { Pressable, Text, View } from "react-native";
import { withPartner } from "@/components/app/PairGate";
import { Gamepad2 as Gamepad2Icon } from "lucide-react-native";
import { router } from "expo-router";
import { ChevronRight, Dices, Grid3x3, Smile, Columns3 } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Body, Caption, Glass, GlassList, GradientFill, ListRow, Muted, SectionTitle, Toast } from "@/components/ui";
import { ScreenHeader } from "@/components/app/ScreenHeader";
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
  const finished = games.data?.filter((g) => g.status !== "active") ?? [];
  const current = active[0];
  const wins = finished.filter((g) => g.winner_id === profile?.id).length;
  const losses = finished.filter((g) => g.winner_id && g.winner_id !== profile?.id).length;

  // Une seule partie à la fois : tant qu'elle n'est pas finie, on y retourne au lieu d'en lancer une autre.
  const start = async (t: GameType) => {
    if (current) return router.push({ pathname: "/game/[id]", params: { id: current.id } });
    const id = await create.mutate(t); if (id) router.push({ pathname: "/game/[id]", params: { id } });
  };
  const gameRow = (t: GameType) => current
    ? current.game_type === t ? { subtitle: status(current), action: "Reprendre" } : { subtitle: "Finissez d'abord la partie en cours", action: "Bloqué" }
    : { subtitle: t === "tic_tac_toe" ? "3 cœurs alignés" : "4 pions à la suite", action: "Jouer" };
  const status = (g: Game) => g.turn_user_id === profile?.id ? "À toi de jouer" : `Au tour de ${them}`;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader kicker="JOUER" title="À deux, même à distance" />
      {finished.length ? <Body className="text-text-muted">{`Score : toi ${wins} · ${them} ${losses}`}</Body> : null}
      {create.error ? <Toast tone="error">{create.error}</Toast> : null}

      {games.loading && !games.data ? <Skeleton className="h-[80px]" /> : active.length ? (
        <View className="gap-2">
          <Caption>Partie en cours · une seule à la fois</Caption>
          {active.map((g) => (
            <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${GAME_NAMES[g.game_type]}, ${status(g)}`}
              onPress={() => router.push({ pathname: "/game/[id]", params: { id: g.id } })}
              className="min-h-[56px] flex-row items-center gap-3 rounded-md border border-glass-edge bg-surface px-4 active:bg-surface-raised">
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
        <SectionTitle title="Nouvelle partie" />
        <GlassList>
          <ListRow first icon={Grid3x3} tone="rose" title={GAME_NAMES.tic_tac_toe} {...gameRow("tic_tac_toe")} onPress={() => start("tic_tac_toe")} />
          <ListRow icon={Columns3} tone="violet" title={GAME_NAMES.four_in_row} {...gameRow("four_in_row")} onPress={() => start("four_in_row")} />
          <ListRow icon={Smile} tone="coral" title="Quiz à deux" subtitle="Votre score de complicité" action="Jouer" onPress={() => router.push("/quiz")} />
          <ListRow icon={Dices} tone="night" title="Dés coquins" subtitle="Pour pimenter la soirée" action="Lancer" onPress={() => router.push("/dice")} />
        </GlassList>
        <Muted>{"D'autres jeux arrivent : mots, mémoire, quiz de culture."}</Muted>
      </View>
    </Screen>
  );
}

function Tile({ icon: Icon, title, sub, onPress }: { icon: typeof Dices; title: string; sub: string; onPress: () => void }) {
  return (
    <Glass radius={26} className="grow basis-[45%]">
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={onPress}
        className="min-h-[118px] justify-between p-4 active:bg-surface">
        <View className="h-[40px] w-[40px] items-center justify-center overflow-hidden rounded-pill">
          <GradientFill />
          <View><Icon size={20} color="#FFFFFF" /></View>
        </View>
        <View>
          <Text className="font-sans-bold text-base text-text">{title}</Text>
          <Text className="font-sans text-sm text-text-muted">{sub}</Text>
        </View>
      </Pressable>
    </Glass>
  );
}

export default withPartner(Play, { id: "S11", kicker: "Jouer", title: "À deux, même à distance", body: "Morpion du cœur, Quatre d'affilée, quiz de complicité et dés coquins. Chacun joue à son tour, le plateau se met à jour tout seul.", example: "« À toi de jouer » : ton cœur contre sa flamme.", icon: Gamepad2Icon }, { tabs: true });
