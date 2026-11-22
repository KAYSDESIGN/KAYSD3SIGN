import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Camera } from "lucide-react-native";
import { Button, GradientFill } from "@/components/ui";
import { api, useMutation, useQuery } from "@/data";


/** Choisit une photo, la recadre en carré, la réduit (512 px, JPEG) puis l'envoie. */
async function pickSquareJpeg(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const side = Math.min(a.width || 512, a.height || 512);
  let ctx = ImageManipulator.manipulate(a.uri);
  if (a.width && a.height && a.width !== a.height) {
    ctx = ctx.crop({ originX: (a.width - side) / 2, originY: (a.height - side) / 2, width: side, height: side });
  }
  const img = await ctx.resize({ width: 512, height: 512 }).renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return out.base64 ?? null;
}

export function useAvatars() {
  return useQuery(api.getAvatars).data ?? { mine: null, partner: null };
}

/** Grande photo de profil modifiable, avec boutons Ajouter / Changer / Retirer. */
export function AvatarPicker({ name }: { name: string }) {
  const avatars = useQuery(api.getAvatars);
  const save = useMutation(api.setAvatar);
  const remove = useMutation(api.removeAvatar);
  const [busy, setBusy] = useState(false);
  const url = avatars.data?.mine ?? null;

  const choose = async () => {
    setBusy(true);
    try { const b64 = await pickSquareJpeg(); if (b64) await save.mutate(b64); }
    finally { setBusy(false); }
  };

  return (
    <View className="items-center gap-3">
      <Pressable accessibilityRole="button" accessibilityLabel={url ? "Changer ma photo" : "Ajouter une photo"} onPress={choose}
        style={{ width: 112, height: 112, padding: 3 }} className="overflow-hidden rounded-pill">
        <GradientFill />
        <View className="flex-1 items-center justify-center overflow-hidden rounded-pill border-2 border-glass-edge bg-bg">
          {url ? <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
            : <Text className="font-display text-[40px] text-text">{(name || "?").slice(0, 1).toUpperCase()}</Text>}
        </View>
        <View className="absolute bottom-1 right-1 h-[32px] w-[32px] items-center justify-center overflow-hidden rounded-pill border-2 border-bg">
          <GradientFill sheen={false} />
          <View><Camera size={16} color="#FFFFFF" /></View>
        </View>
      </Pressable>
      <View className="flex-row gap-2">
        <Button size="sm" variant="secondary" loading={busy || save.pending} onPress={choose}>{url ? "Changer ma photo" : "Ajouter une photo"}</Button>
        {url ? <Button size="sm" variant="ghost" loading={remove.pending} onPress={() => remove.mutate()}>Retirer</Button> : null}
      </View>
      {save.error ? <Text className="font-sans-semibold text-sm text-danger">{save.error}</Text> : null}
    </View>
  );
}

