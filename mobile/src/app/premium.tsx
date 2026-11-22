import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Check, Sparkles } from "lucide-react-native";
import { Screen, Skeleton } from "@/components/app/Screen";
import { Body, Button, Caption, Display, EmptyState, Muted, PlanOption, Toast } from "@/components/ui";
import { api, useMutation, useQuery, type Offer } from "@/data";
import { color } from "@/theme";

const PERKS = [
  "Toutes les envies secrètes, jusqu'au niveau Brûlant",
  "Des défis coquins et des questions en plus chaque jour",
  "Tous les jeux à deux",
  "Le coffre privé pour vos photos",
  "Un seul abonnement pour vous deux",
];

// S16 · Premium
export default function Premium() {
  const premium = useQuery(api.isPremium);
  const offers = useQuery(api.getOffers);
  const buy = useMutation(api.purchase);
  const [product, setProduct] = useState<Offer["product"]>("yearly");

  if (premium.data) {
    return (
      <Screen>
        <EmptyState icon={Sparkles} title="Vous êtes Premium" body="Tout est débloqué, pour vous deux. Profitez-en." action="Retour" onAction={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />
      </Screen>
    );
  }

  const sel = offers.data?.find((o) => o.product === product);
  return (
    <Screen>
      <Caption>HotCouple Premium</Caption>
      <Display>Tout, pour vous deux.</Display>
      <View className="gap-2">
        {PERKS.map((p) => (
          <View key={p} className="flex-row items-start gap-3">
            <Check size={18} color={color.gold} strokeWidth={3} />
            <Text className="flex-1 font-sans text-base text-text">{p}</Text>
          </View>
        ))}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Choisis ta formule" className="gap-2">
        {offers.loading && !offers.data ? <Skeleton className="h-[230px]" /> : offers.data?.map((o) => (
          <PlanOption key={o.product} title={o.title} price={o.price} detail={o.detail} badge={o.badge} selected={o.product === product} onSelect={() => setProduct(o.product)} />
        ))}
      </View>
      {buy.error ? <Toast tone="error">{buy.error}</Toast> : null}
      <Button size="lg" icon={Sparkles} loading={buy.pending} onPress={() => buy.mutate(product)}>
        {sel?.product === "lifetime" ? `Débloquer pour toujours · ${sel.price}` : "Débloquer pour nous deux"}
      </Button>
      <Button variant="ghost">Restaurer un achat</Button>
      <Muted className="text-center">
        {sel?.product === "lifetime"
          ? "Paiement unique via ton store."
          : "Renouvellement automatique, annulable à tout moment dans les réglages de ton store, au plus tard 24 h avant la fin de la période."}
      </Muted>
      <Body className="text-center text-text-muted">Démo : aucun paiement réel n'est effectué.</Body>
    </Screen>
  );
}
