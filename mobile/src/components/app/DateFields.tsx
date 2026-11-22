import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { color, cx } from "@/theme";

export type DateParts = { d: string; m: string; y: string };

/** Renvoie la date ISO (AAAA-MM-JJ) si elle existe vraiment, sinon null. */
export function toIso({ d, m, y }: DateParts): string | null {
  if (!d || !m || y.length !== 4) return null;
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const dt = new Date(iso + "T00:00:00Z");
  return !isNaN(dt.getTime()) && dt.getUTCDate() === Number(d) && dt.getUTCMonth() + 1 === Number(m) ? iso : null;
}

/** Date en trois champs numériques (pas de sélecteur natif nécessaire, accessible au clavier). */
export function DateFields({ label, value, onChange, error }: { label: string; value: DateParts; onChange: (v: DateParts) => void; error?: string }) {
  const complete = !!value.d && !!value.m && value.y.length === 4;
  const invalid = complete && !toIso(value);
  return (
    <View className="gap-2">
      <Text className="font-sans-semibold text-sm text-text">{label}</Text>
      <View className="flex-row gap-2">
        <Box label="Jour" placeholder="JJ" value={value.d} onChange={(d) => onChange({ ...value, d })} max={2} />
        <Box label="Mois" placeholder="MM" value={value.m} onChange={(m) => onChange({ ...value, m })} max={2} />
        <Box label="Année" placeholder="AAAA" value={value.y} onChange={(y) => onChange({ ...value, y })} max={4} wide />
      </View>
      {invalid || error ? (
        <Text accessibilityLiveRegion="polite" className="font-sans-semibold text-sm text-danger">{invalid ? "Cette date n'existe pas." : error}</Text>
      ) : null}
    </View>
  );
}

function Box({ label, placeholder, value, onChange, max, wide }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; max: number; wide?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, max))}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={color["text-subtle"]}
      maxLength={max}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ minWidth: 0, width: 0 }}
      className={cx("h-[52px] rounded-md bg-bg text-center font-sans-bold text-lg text-text", wide ? "flex-[1.6]" : "flex-1", focus ? "border-2 border-focus" : "border border-border-input")}
    />
  );
}
