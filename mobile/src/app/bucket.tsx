import { useState } from "react";
import { withPartner } from "@/components/app/PairGate";
import { ListChecks as ListChecksIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { ListChecks, Trash2 } from "lucide-react-native";
import { DevPanel } from "@/components/app/DevPanel";
import { Screen, Skeleton } from "@/components/app/Screen";
import { useGate } from "@/components/app/useGate";
import { Button, Caption, Card, ChecklistItem, EmptyState, Heading, IconButton, TextField } from "@/components/ui";
import { api, useMutation, useQuery, type BucketItem } from "@/data";
import { cx } from "@/theme";

const CATS: { key: BucketItem["category"]; label: string }[] = [
  { key: "date", label: "Sortie" }, { key: "trip", label: "Voyage" }, { key: "adventure", label: "Aventure" }, { key: "spicy", label: "🌶️ Coquin" },
];
const label = (k: BucketItem["category"]) => CATS.find((c) => c.key === k)?.label ?? "";

// S13 · Bucket list partagée
function Bucket() {
  const { profile, partner } = useGate();
  const items = useQuery(api.getBucket);
  const add = useMutation(api.addBucketItem);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<BucketItem["category"]>("date");
  const done = items.data?.filter((i) => i.done_at).length ?? 0;

  const submit = async () => { if (!title.trim()) return; await add.mutate(title, cat); setTitle(""); };
  const who = (i: BucketItem) => (i.created_by === profile?.id ? "toi" : partner?.display_name ?? "l'autre");

  return (
    <Screen>
      <Caption>{`Nos envies d'ailleurs · ${done} sur ${items.data?.length ?? 0} faites`}</Caption>
      <Heading>{"Ce qu'on fera ensemble"}</Heading>

      <Card className="gap-3">
        <TextField label="Nouvelle idée" value={title} onChangeText={setTitle} placeholder="Ex. Dîner sur un rooftop" maxLength={200}
          returnKeyType="done" onSubmitEditing={submit} error={add.error ?? undefined} />
        <View accessibilityRole="radiogroup" accessibilityLabel="Catégorie" className="flex-row flex-wrap gap-2">
          {CATS.map((c) => (
            <Pressable key={c.key} accessibilityRole="radio" accessibilityState={{ checked: cat === c.key }} onPress={() => setCat(c.key)}
              className={cx("h-[36px] justify-center rounded-pill border px-3", cat === c.key ? "border-accent bg-accent-soft" : "border-glass-edge bg-surface-raised")}>
              <Text className={cx("font-sans-semibold text-sm", cat === c.key ? "text-on-accent-soft" : "text-text-muted")}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
        <Button onPress={submit} loading={add.pending} disabled={!title.trim()}>Ajouter</Button>
      </Card>

      {items.loading && !items.data ? <Skeleton className="h-[160px]" /> : items.data?.length ? (
        <Card className="py-1">
          {items.data.map((i) => (
            <View key={i.id} className="flex-row items-center">
              <View className="flex-1">
                <ChecklistItem label={i.title} done={!!i.done_at} onToggle={() => api.toggleBucketItem(i.id)}
                  meta={`${label(i.category)} · ${i.done_at ? `fait le ${new Date(i.done_at).toLocaleDateString("fr-FR")}` : `ajouté par ${who(i)}`}`} />
              </View>
              <IconButton icon={Trash2} label={`Supprimer « ${i.title} »`} onPress={() => api.deleteBucketItem(i.id)} />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState icon={ListChecks} title="Votre liste est vide" body="Un voyage, une sortie, une première fois : notez tout ce qui vous fait envie à deux." />
      )}
      {api.dev.enabled ? <DevPanel actions={[{ label: "Sam ajoute une idée", onPress: () => api.dev.partnerAddsBucket() }]} /> : null}
    </Screen>
  );
}

export default withPartner(Bucket, { id: "S13", kicker: "Nos envies d'ailleurs", title: "Votre liste de choses à vivre ensemble", body: "Voyages, sorties, premières fois : vous ajoutez des idées tous les deux et vous les cochez une fois vécues.", example: "Week-end surprise à la mer", icon: ListChecksIcon });
