import { Image, Text, type TextProps } from "react-native";
import { EMOJI } from "./emojiMap";

const strip = (s: string) => s.replace(/\uFE0F/g, "");
const KEYS = Object.keys(EMOJI).sort((a, b) => b.length - a.length);
const SPLIT = new RegExp(`(${KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\uFE0F?`, "u");

/** Emoji Fluent 3D (image), avec repli sur l'emoji système s'il n'est pas dans la collection. */
export function Emoji({ char, size = 22 }: { char: string; size?: number }) {
  const src = (EMOJI as Record<string, number>)[strip(char)];
  if (!src) return <Text style={{ fontSize: size * 0.9 }}>{char}</Text>;
  return <Image source={src} style={{ width: size, height: size }} accessibilityLabel={char} accessibilityIgnoresInvertColors />;
}

/** Texte dont les emojis connus sont remplacés par les emojis Fluent, alignés sur la ligne. */
export function EmojiText({ children, size = 17, ...p }: TextProps & { children: string; size?: number; className?: string }) {
  const parts = children.split(SPLIT).filter((x) => x !== "");
  return (
    <Text {...p}>
      {parts.map((part, i) => {
        const src = (EMOJI as Record<string, number>)[strip(part)];
        return src
          ? <Image key={i} source={src} style={{ width: size, height: size, marginBottom: -3 }} accessibilityLabel={part} accessibilityIgnoresInvertColors />
          : part;
      })}
    </Text>
  );
}
