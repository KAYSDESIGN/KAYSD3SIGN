import type React from "react";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { cx } from "@/theme";

const ALPHABET = /[^A-HJ-NP-Z2-9]/g; // mêmes caractères que la base (sans 0, O, 1, I)

/** Saisie du code d'appairage à 6 caractères. Un vrai TextInput caché porte le clavier et l'accessibilité. */
export function CodeInput({
  value, onChange, error, length = 6,
}: { value: string; onChange: (v: string) => void; error?: string; length?: number }) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-2">
      <Pressable onPress={() => ref.current?.focus()} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="flex-row justify-between gap-2">
        {Array.from({ length }).map((_, i) => {
          const ch = value[i] ?? "";
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              className={cx(
                "h-[56px] flex-1 items-center justify-center rounded-md bg-surface",
                error ? "border border-danger" : active ? "border-2 border-focus" : "border border-border-input"
              )}
            >
              <Text className="font-sans-bold text-xl text-text">{ch}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.toUpperCase().replace(ALPHABET, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="one-time-code"
        maxLength={length}
        accessibilityLabel="Code de ton/ta partenaire, 6 caractères"
        accessibilityHint={error}
        className="absolute h-[1px] w-[1px] opacity-0"
      />
      {error ? <Text accessibilityLiveRegion="polite" className="font-sans-semibold text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
