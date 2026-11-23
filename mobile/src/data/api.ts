// Choix de la couche de données (voir index.ts).
import * as fake from "./fake";
import * as real from "./supabase";

export const USING_SUPABASE = !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_KEY;
export const api: typeof fake = USING_SUPABASE ? real : fake;
