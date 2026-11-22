import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Choix d'apparence, gardé sur l'appareil : automatique (suit le téléphone), jour ou nuit. */
export type ThemePref = "auto" | "light" | "dark";
const KEY = "hotcouple.theme";
let current: ThemePref = "auto";
let loaded = false;
const listeners = new Set<(p: ThemePref) => void>();

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "auto") { current = v; listeners.forEach((l) => l(v)); }
  } catch { /* stockage indisponible : on reste en automatique */ }
}

export function setThemePref(p: ThemePref) {
  current = p;
  listeners.forEach((l) => l(p));
  AsyncStorage.setItem(KEY, p).catch(() => {});
}

export function useThemePref(): ThemePref {
  const [pref, setPref] = useState<ThemePref>(current);
  useEffect(() => {
    listeners.add(setPref);
    load();
    return () => { listeners.delete(setPref); };
  }, []);
  return pref;
}
