import { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { color, cx } from "@/theme";
import { Glass } from "./Glass";

type Props = TextInputProps & { label: string; hint?: string; error?: string; className?: string };

/** Champ texte : libellé visible, aide, erreur annoncée, bordure 3:1, focus marqué. */
export function TextField({ label, hint, error, className, editable = true, ...p }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View className={cx("gap-2", className)}>
      <Text className="font-sans-semibold text-sm text-text">{label}</Text>
      <Glass float radius={14}>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        editable={editable}
        placeholderTextColor={color["text-subtle"]}
        selectionColor={color.accent}
        onFocus={(e) => { setFocused(true); p.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); p.onBlur?.(e); }}
        className={cx(
          "h-[48px] rounded-[14px] border bg-transparent px-4 font-sans text-base text-text",
          error ? "border-danger" : focused ? "border-focus border-2" : "border-border-input",
          !editable && "opacity-50"
        )}
        {...p}
      />
      </Glass>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-sans-semibold text-sm text-danger">{error}</Text>
      ) : hint ? (
        <Text className="font-sans text-sm text-text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
