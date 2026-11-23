// Couche de données réelle : Supabase. Mêmes exports et mêmes signatures que ./fake.ts.
// Les règles (révélation, audace, appairage, jeux) sont appliquées par la base : RLS + RPC
// de supabase/migrations. Ce fichier ne fait que traduire.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import {
  DataError, type BucketItem, type Couple, type DailyView, type DataErrorCode, type DatePlan, type Desire,
  type DesireAnswer, type Game, type GameType, type Message, type Mood, type MoodKey, type Offer, type Profile,
  type Quiz, type QuizSession, type Session, type SpecialDate, type Spice,
} from "./types";

// --- client --------------------------------------------------------------------
let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!url || !key) throw new Error("EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY manquants");
  client = createClient(url, key, {
    auth: {
      storage: Platform.OS === "web" ? undefined : AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  client.auth.onAuthStateChange(() => { resetChannel(); emit(); });
  if (Platform.OS !== "web") {
    AppState.addEventListener("change", (st) => {
      if (st === "active") { client?.auth.startAutoRefresh(); emit(); } else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

// --- temps réel : un seul canal, toute modification visible (RLS) relance les lectures --
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
function emit() { listeners.forEach((l) => l()); }
function resetChannel() { if (channel) { client?.removeChannel(channel); channel = null; } }
function ensureChannel() {
  if (channel || !listeners.size) return;
  channel = sb().channel("hotcouple").on("postgres_changes", { event: "*", schema: "public" }, () => emit()).subscribe();
}
export function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureChannel();
  return () => { listeners.delete(cb); if (!listeners.size) resetChannel(); };
}

// --- erreurs -----------------------------------------------------------------------
const KNOWN: DataErrorCode[] = [
  "already_paired", "invalid_or_expired_code", "couple_full", "not_paired", "not_signed_in", "already_answered",
  "not_your_turn", "invalid_move", "stale_game", "premium_required", "invalid_date", "quiz_closed", "game_in_progress",
];
function fail(e: { message?: string; code?: string } | null): never {
  const msg = e?.message ?? "";
  const known = KNOWN.find((k) => msg.includes(k));
  if (known) throw new DataError(known);
  if (e?.code === "23505") throw new DataError("already_answered");
  if (msg.includes("adult")) throw new DataError("underage");
  if (/Invalid login credentials/i.test(msg)) throw new DataError("invalid_credentials");
  if (/already registered|already been registered/i.test(msg)) throw new DataError("email_taken");
  if (/Password should be|weak/i.test(msg)) throw new DataError("weak_password");
  if (/Signups not allowed/i.test(msg)) throw new DataError("signup_disabled");
  if (/Email not confirmed/i.test(msg)) throw new DataError("confirm_email");
  throw new Error(msg || "network");
}
async function must<T>(p: PromiseLike<{ data: T; error: { message?: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) fail(error);
  return data;
}

async function uidOrThrow(): Promise<string> {
  const { data } = await sb().auth.getSession();
  if (!data.session) throw new DataError("not_signed_in");
  return data.session.user.id;
}
async function myCoupleId(): Promise<string> {
  const u = await uidOrThrow();
  const rows = await must(sb().from("couple_members").select("couple_id").eq("user_id", u));
  const c = (rows as { couple_id: string }[])[0]?.couple_id;
  if (!c) throw new DataError("not_paired");
  return c;
}
const SPICE_RANK: Record<Spice, number> = { soft: 1, spicy: 2, hot: 3 };

export function dayIn(timezone: string, d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// --- auth (S01) -------------------------------------------------------------------
export async function getSession(): Promise<Session> {
  const { data } = await sb().auth.getSession();
  return data.session ? { user_id: data.session.user.id, email: data.session.user.email ?? "" } : null;
}

export async function signInWithPassword(email: string, password: string, mode: "signin" | "signup"): Promise<Session> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new DataError("invalid_email");
  if (password.length < 8) throw new DataError("weak_password");
  const res = mode === "signup"
    ? await sb().auth.signUp({ email: e, password })
    : await sb().auth.signInWithPassword({ email: e, password });
  if (res.error) fail(res.error);
  if (!res.data.session) throw new DataError("confirm_email");
  return { user_id: res.data.session.user.id, email: e };
}

export async function signInWithProvider(_provider: "apple" | "google"): Promise<Session> {
  throw new Error("Connexion Apple / Google pas encore configurée");
}

export async function signOut() { await sb().auth.signOut(); }

// --- profil (S02, S20) -------------------------------------------------------------
type ProfileRow = Profile & { avatar_path?: string | null };
export async function getMyProfile(): Promise<Profile> {
  await uidOrThrow();
  return (await must(sb().rpc("my_profile"))) as ProfileRow;
}

export async function updateProfile(patch: Partial<Pick<Profile, "display_name" | "timezone" | "birthdate" | "spice_level" | "discreet_mode">>): Promise<Profile> {
  const u = await uidOrThrow();
  await must(sb().from("profiles").update(patch).eq("id", u));
  emit();
  return getMyProfile();
}

// --- couple (S03, F08) ---------------------------------------------------------------
export async function getCouple(): Promise<Couple | null> {
  await uidOrThrow();
  const rows = await must(sb().from("couples").select("id, invite_code, invite_expires_at, anniversary, timezone, streak_count, streak_last_day, premium_until"));
  return ((rows as Couple[])[0]) ?? null;
}

export async function getPartner(): Promise<Profile | null> {
  const u = await uidOrThrow();
  const rows = await must(sb().from("profiles").select("id, display_name, avatar_path, timezone, locale").neq("id", u));
  const p = (rows as Pick<Profile, "id" | "display_name" | "avatar_path" | "timezone" | "locale">[])[0];
  // Les champs privés du partenaire (âge, audace…) ne sont jamais lus : valeurs neutres
  return p ? { ...p, birthdate: null, age_confirmed_at: null, spice_level: "soft", discreet_mode: false } : null;
}

export async function createCouple(): Promise<string> { await uidOrThrow(); const c = await must(sb().rpc("create_couple")); emit(); return c as string; }
export async function joinCouple(code: string): Promise<string> { await uidOrThrow(); const c = await must(sb().rpc("join_couple", { p_code: code })); emit(); return c as string; }
export async function unpair(): Promise<void> { await uidOrThrow(); await must(sb().rpc("unpair")); emit(); }

// --- rituel du jour (S04, S08, S06, S22, S23) ------------------------------------
export async function getToday(): Promise<DailyView[]> { await uidOrThrow(); return (await must(sb().rpc("get_today", { p_group: "questions" }))) as DailyView[]; }
export async function getChallenges(): Promise<DailyView[]> { await uidOrThrow(); return (await must(sb().rpc("get_today", { p_group: "challenges" }))) as DailyView[]; }
export async function getDaily(assignmentId: string): Promise<DailyView | null> {
  await uidOrThrow();
  return ((await must(sb().rpc("daily_view", { p_assignment: assignmentId }))) as DailyView | null) ?? null;
}

async function respond(assignmentId: string, body: string | null, skipped: boolean) {
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("responses").insert({ assignment_id: assignmentId, couple_id: c, user_id: u, body, skipped }));
  emit();
}
export async function answer(assignmentId: string, body: string): Promise<void> { await respond(assignmentId, body.trim(), false); }
export async function skip(assignmentId: string): Promise<void> { await respond(assignmentId, null, true); }

// --- humeurs et nudges (S04, S05, S14) ---------------------------------------
export async function setMood(mood: MoodKey, note?: string): Promise<void> {
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("moods").insert({ couple_id: c, user_id: u, mood, note: note ?? null }));
  emit();
}
export async function getMoods(): Promise<{ mine: Mood | null; partner: Mood | null }> {
  const u = await uidOrThrow();
  const rows = (await must(sb().from("moods").select("id, user_id, mood, note, created_at").order("created_at", { ascending: false }).limit(30))) as Mood[];
  return { mine: rows.find((m) => m.user_id === u) ?? null, partner: rows.find((m) => m.user_id !== u) ?? null };
}
export async function sendNudge(body: string): Promise<void> {
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("messages").insert({ couple_id: c, sender_id: u, kind: "nudge", body }));
  emit();
}
export async function getLastNudgeFromPartner(): Promise<Message | null> {
  const u = await uidOrThrow();
  const rows = (await must(sb().from("messages").select("id, sender_id, kind, body, created_at").eq("kind", "nudge").neq("sender_id", u).order("created_at", { ascending: false }).limit(1))) as Message[];
  return rows[0] ?? null;
}

// --- audace et Premium (S20, S16) --------------------------------------------------
export async function getSpiceStatus(): Promise<{ confirmed: boolean; mine: Spice; partnerConfirmed: boolean; effective: Spice | null }> {
  await uidOrThrow();
  return (await must(sb().rpc("get_spice_status"))) as { confirmed: boolean; mine: Spice; partnerConfirmed: boolean; effective: Spice | null };
}
export async function isPremium(): Promise<boolean> { await uidOrThrow(); return !!(await must(sb().rpc("couple_is_premium"))); }
export async function getOffers(): Promise<Offer[]> { return []; } // version privée : Premium offert au couple
export async function purchase(_product: Offer["product"]): Promise<void> { emit(); }

// --- envies secrètes (S21) ------------------------------------------------------------
export type DesireRow = { desire: Desire; answer: DesireAnswer | null; answeredAt: string | null; locked: boolean };
/** Les 5 envies du jour (tirées côté serveur, les mêmes pour les deux). */
export async function getDesires(): Promise<DesireRow[]> {
  await uidOrThrow();
  const rows = (await must(sb().rpc("get_daily_desires"))) as (Desire & { answer: DesireAnswer | null; answered_at: string | null })[];
  return rows.map(({ answer, answered_at, ...d }) => ({ desire: d, answer, answeredAt: answered_at, locked: false }));
}
export async function answerDesire(desireId: string, answerValue: DesireAnswer): Promise<void> {
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("desire_answers").upsert({ couple_id: c, user_id: u, desire_id: desireId, answer: answerValue }, { onConflict: "user_id,desire_id" }));
  emit();
}
export async function getMutualDesires(): Promise<Desire[]> {
  await uidOrThrow();
  const rows = (await must(sb().rpc("mutual_desires"))) as { desire_id: string; body: string; category: string }[];
  return rows.map((r) => ({ id: r.desire_id, body: r.body, category: r.category, spice_level: "soft", is_premium: false }));
}

// --- bucket list (S13) ------------------------------------------------------------------
export async function getBucket(): Promise<BucketItem[]> {
  await uidOrThrow();
  const rows = (await must(sb().from("bucket_items").select("id, title, category, done_at, created_by, created_at").order("created_at", { ascending: false }))) as BucketItem[];
  return rows.sort((x, y) => Number(!!x.done_at) - Number(!!y.done_at));
}
export async function addBucketItem(title: string, category: BucketItem["category"]): Promise<void> {
  const t = title.trim(); if (!t) return;
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("bucket_items").insert({ couple_id: c, created_by: u, title: t.slice(0, 200), category }));
  emit();
}
export async function toggleBucketItem(id: string): Promise<void> {
  const rows = (await must(sb().from("bucket_items").select("done_at").eq("id", id))) as { done_at: string | null }[];
  if (!rows[0]) return;
  await must(sb().from("bucket_items").update({ done_at: rows[0].done_at ? null : new Date().toISOString() }).eq("id", id));
  emit();
}
export async function deleteBucketItem(id: string): Promise<void> { await must(sb().from("bucket_items").delete().eq("id", id)); emit(); }

// --- petits mots (S14) ----------------------------------------------------------------------
export async function getMessages(): Promise<Message[]> {
  await uidOrThrow();
  const rows = (await must(sb().from("messages").select("id, sender_id, kind, body, created_at").order("created_at", { ascending: false }).limit(200))) as Message[];
  return rows.reverse();
}
export async function sendNote(body: string): Promise<void> {
  const b = body.trim(); if (!b) return;
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("messages").insert({ couple_id: c, sender_id: u, kind: "text", body: b.slice(0, 2000) }));
  emit();
}

// --- compte (S18) -----------------------------------------------------------------------------
export async function deleteAccount(): Promise<void> {
  const u = await uidOrThrow();
  await sb().storage.from("avatars").remove([`${u}/avatar.jpg`]).catch(() => {});
  await must(sb().rpc("delete_my_account"));
  await sb().auth.signOut({ scope: "local" });
  emit();
}

// --- quiz (S10) ----------------------------------------------------------------------------------
export type QuizRow = { quiz: Quiz; locked: boolean; lastSession: QuizSession | null };
type QuizDb = { id: string; title: string; blurb: string; spice_level: Spice; is_premium: boolean; quiz_questions: { id: string; position: number; body: string; choices: string[] }[] };
type SessionDb = { id: string; quiz_id: string; status: "open" | "revealed"; match_score: number | null; created_at: string; day: string | null; question_ids: string[] | null };
const SESSION_COLS = "id, quiz_id, status, match_score, created_at, day, question_ids";

function toQuiz(q: QuizDb): Quiz {
  return { id: q.id, title: q.title, blurb: q.blurb, spice_level: q.spice_level, is_premium: q.is_premium,
    questions: [...q.quiz_questions].sort((a, b) => a.position - b.position).map(({ id, body, choices }) => ({ id, body, choices })) };
}
/** Le quiz réduit aux questions tirées pour cette partie, dans l'ordre du tirage. */
function forSession(quiz: Quiz, sess: SessionDb): Quiz {
  if (!sess.question_ids) return quiz;
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));
  return { ...quiz, questions: sess.question_ids.map((id) => byId.get(id)).filter((q): q is Quiz["questions"][number] => !!q) };
}
async function sessionView(sess: SessionDb, u: string): Promise<QuizSession> {
  const ans = (await must(sb().from("quiz_answers").select("user_id, question_id, choices").eq("session_id", sess.id))) as { user_id: string; question_id: string; choices: number[] }[];
  const mine = Object.fromEntries(ans.filter((a) => a.user_id === u).map((a) => [a.question_id, a.choices]));
  const theirs = sess.status === "revealed" ? Object.fromEntries(ans.filter((a) => a.user_id !== u).map((a) => [a.question_id, a.choices])) : null;
  const partnerDone = !!(await must(sb().rpc("quiz_partner_done", { p_session: sess.id })));
  const { question_ids: _q, ...rest } = sess;
  return { ...rest, mine, theirs, partnerDone };
}
async function allQuizzes(): Promise<Quiz[]> {
  const rows = (await must(sb().from("quizzes").select("id, title, blurb, spice_level, is_premium, quiz_questions(id, position, body, choices)").eq("active", true))) as QuizDb[];
  return rows.map(toQuiz).sort((a, b) => SPICE_RANK[a.spice_level] - SPICE_RANK[b.spice_level]);
}
/** Les quiz du jour : 5 questions nouvelles par catégorie, une seule partie par jour. */
export async function getQuizzes(): Promise<QuizRow[]> {
  const u = await uidOrThrow();
  const daily = (await must(sb().rpc("daily_quizzes"))) as { quiz_id: string; session_id: string | null }[];
  const quizzes = await allQuizzes();
  const ids = daily.map((d) => d.session_id).filter((x): x is string => !!x);
  const sessions = ids.length ? (await must(sb().from("quiz_sessions").select(SESSION_COLS).in("id", ids))) as SessionDb[] : [];
  const rows = await Promise.all(daily.map(async (d) => {
    const quiz = quizzes.find((z) => z.id === d.quiz_id); const sess = sessions.find((x) => x.id === d.session_id);
    if (!quiz || !sess) return null;
    const row: QuizRow = { quiz: forSession(quiz, sess), locked: false, lastSession: await sessionView(sess, u) };
    return row;
  }));
  return rows.filter((r) => r !== null);
}
export async function startQuiz(quizId: string): Promise<string> { await uidOrThrow(); const id = await must(sb().rpc("start_quiz", { p_quiz: quizId })); emit(); return id as string; }
export async function getQuizSession(id: string): Promise<{ quiz: Quiz; session: QuizSession } | null> {
  const u = await uidOrThrow();
  const rows = (await must(sb().from("quiz_sessions").select(SESSION_COLS).eq("id", id))) as SessionDb[];
  if (!rows[0]) return null;
  const quiz = (await allQuizzes()).find((z) => z.id === rows[0].quiz_id);
  return quiz ? { quiz: forSession(quiz, rows[0]), session: await sessionView(rows[0], u) } : null;
}
export async function answerQuiz(sessionId: string, questionId: string, choices: number[]): Promise<void> {
  if (!choices.length) throw new DataError("invalid_move");
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("quiz_answers").insert({ session_id: sessionId, couple_id: c, question_id: questionId, user_id: u, choices: [...new Set(choices)].sort() }));
  emit();
}

// --- jeux (S11, S12) ------------------------------------------------------------------------------
type GameDb = { id: string; game_type: GameType; state: { board: (string | null)[]; cols: number; rows: number; players: [string, string] }; turn_user_id: string | null; status: "active" | "finished" | "abandoned"; winner_id: string | null; version: number; updated_at: string };
function toGame(g: GameDb): Game {
  return { id: g.id, game_type: g.game_type, board: g.state.board, cols: g.state.cols, rows: g.state.rows, players: g.state.players,
    turn_user_id: g.turn_user_id, status: g.status === "active" ? "active" : "finished", winner_id: g.winner_id,
    draw: g.status === "finished" && !g.winner_id, version: g.version, updated_at: g.updated_at };
}
const GAME_COLS = "id, game_type, state, turn_user_id, status, winner_id, version, updated_at";
export async function getGames(): Promise<Game[]> {
  await uidOrThrow();
  return ((await must(sb().from("games").select(GAME_COLS).order("updated_at", { ascending: false }).limit(50))) as GameDb[]).map(toGame);
}
export async function getGame(id: string): Promise<Game | null> {
  await uidOrThrow();
  const rows = (await must(sb().from("games").select(GAME_COLS).eq("id", id))) as GameDb[];
  return rows[0] ? toGame(rows[0]) : null;
}
export async function createGame(type: GameType): Promise<string> { await uidOrThrow(); const id = await must(sb().rpc("create_game", { p_type: type })); emit(); return id as string; }
export async function abandonGame(gameId: string): Promise<void> { await uidOrThrow(); await must(sb().rpc("abandon_game", { p_game: gameId })); emit(); }
export async function playMove(gameId: string, index: number, version: number): Promise<void> {
  await uidOrThrow(); await must(sb().rpc("play_move", { p_game: gameId, p_index: index, p_version: version })); emit();
}

// --- dates (S15) et soirées (S27) ------------------------------------------------------------------
export async function getSpecialDates(): Promise<SpecialDate[]> {
  await uidOrThrow();
  return (await must(sb().from("special_dates").select("id, title, date, repeats_yearly").order("date"))) as SpecialDate[];
}
export async function addSpecialDate(title: string, date: string, repeats_yearly: boolean): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00Z").getTime())) throw new DataError("invalid_date");
  const c = await myCoupleId();
  await must(sb().from("special_dates").insert({ couple_id: c, title: title.trim().slice(0, 100), date, repeats_yearly }));
  emit();
}
export async function deleteSpecialDate(id: string): Promise<void> { await must(sb().from("special_dates").delete().eq("id", id)); emit(); }

export async function getDatePlans(): Promise<DatePlan[]> {
  await uidOrThrow();
  return (await must(sb().from("date_plans").select("id, proposed_by, starts_at, theme, status, created_at").order("starts_at"))) as DatePlan[];
}
export async function proposeDate(starts_at: string, theme: string): Promise<void> {
  if (new Date(starts_at) <= new Date()) throw new DataError("invalid_date");
  const [u, c] = [await uidOrThrow(), await myCoupleId()];
  await must(sb().from("date_plans").insert({ couple_id: c, proposed_by: u, starts_at, theme: theme.trim().slice(0, 200) || null }));
  emit();
}
export async function respondToDate(id: string, status: "accepted" | "declined" | "cancelled"): Promise<void> {
  await must(sb().from("date_plans").update({ status }).eq("id", id)); emit();
}

// Pas de simulation du/de la partenaire avec la vraie base
export const dev: Record<string, any> & { enabled: boolean } = { enabled: false };

// --- photo de profil (bucket privé « avatars ») ---------------------------------
function b64ToBytes(b64: string) {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export async function setAvatar(jpegBase64: string): Promise<void> {
  const u = await uidOrThrow();
  const path = `${u}/avatar.jpg`;
  await must(sb().storage.from("avatars").upload(path, b64ToBytes(jpegBase64), { contentType: "image/jpeg", upsert: true }));
  await must(sb().from("profiles").update({ avatar_path: `${path}?v=${Date.now()}` }).eq("id", u));
  emit();
}
export async function removeAvatar(): Promise<void> {
  const u = await uidOrThrow();
  await sb().storage.from("avatars").remove([`${u}/avatar.jpg`]);
  await must(sb().from("profiles").update({ avatar_path: null }).eq("id", u));
  emit();
}
const signed = new Map<string, { url: string; exp: number }>();
async function signedAvatar(path: string | null | undefined) {
  if (!path) return null;
  const hit = signed.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await sb().storage.from("avatars").createSignedUrl(path.split("?")[0], 3600);
  if (!data?.signedUrl) return null;
  signed.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
export async function getAvatars(): Promise<{ mine: string | null; partner: string | null }> {
  const u = await uidOrThrow();
  const rows = (await must(sb().from("profiles").select("id, avatar_path"))) as { id: string; avatar_path: string | null }[];
  const mine = rows.find((r) => r.id === u)?.avatar_path; const partner = rows.find((r) => r.id !== u)?.avatar_path;
  return { mine: await signedAvatar(mine), partner: await signedAvatar(partner) };
}
