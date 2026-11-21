// Types alignés sur replica/schema.sql. Le jour où Supabase arrive, seuls les fichiers de src/data changent.
export type Spice = "soft" | "spicy" | "hot";
export type MoodKey = "amazing" | "happy" | "calm" | "tired" | "sad" | "stressed" | "need_hug" | "in_the_mood";
export type Slot = "question" | "challenge" | "spicy_question" | "spicy_challenge";

export type Profile = {
  id: string;
  display_name: string;
  timezone: string;
  birthdate: string | null;
  age_confirmed_at: string | null;
  spice_level: Spice;
  discreet_mode: boolean;
  locale: "fr" | "en";
};

export type Couple = {
  id: string;
  invite_code: string | null;
  invite_expires_at: string | null;
  anniversary: string | null;
  timezone: string;
  streak_count: number;
  streak_last_day: string | null;
  premium_until: string | null;
};

export type Prompt = { id: string; kind: Slot; spice_level: Spice; body: string };

export type Assignment = { id: string; couple_id: string; day: string; slot: Slot; prompt: Prompt };

export type Response = {
  id: string;
  assignment_id: string;
  user_id: string;
  body: string | null;
  skipped: boolean;
  created_at: string;
};

export type Mood = { id: string; user_id: string; mood: MoodKey; note: string | null; created_at: string };

export type Message = {
  id: string;
  sender_id: string;
  kind: "text" | "nudge" | "affection";
  body: string | null;
  created_at: string;
};

export type Session = { user_id: string; email: string } | null;

/** État de la carte du jour, calculé avec la règle de révélation (identique à la policy RLS). */
export type DailyView = {
  assignment: Assignment;
  mine: Response | null;
  theirs: Response | null; // null tant que je n'ai pas répondu, même si le partenaire l'a fait
  partnerAnswered: boolean;
};

export type DataErrorCode =
  | "already_paired"
  | "invalid_or_expired_code"
  | "couple_full"
  | "not_paired"
  | "not_signed_in"
  | "invalid_email"
  | "underage"
  | "already_answered";

export class DataError extends Error {
  constructor(public code: DataErrorCode) {
    super(code);
  }
}
