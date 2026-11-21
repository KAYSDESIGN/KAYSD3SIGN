// Couche de données factice, en mémoire. Mêmes signatures (async) que la future couche Supabase,
// mêmes règles que replica/schema.sql : appairage, révélation, streak, audace = le plus bas des deux.
import { SEED_PROMPTS } from "./seed";
import {
  DataError, type Assignment, type Couple, type DailyView, type Message, type Mood, type MoodKey,
  type Profile, type Response, type Session, type Slot, type Spice,
} from "./types";

type Store = {
  session: Session;
  emails: Record<string, string>; // user_id -> email
  profiles: Record<string, Profile>;
  couples: Record<string, Couple>;
  members: { couple_id: string; user_id: string }[];
  assignments: Assignment[];
  responses: Response[];
  moods: Mood[];
  messages: Message[];
};

const PARTNER_ID = "dev-partner";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LATENCY = 120;

const s: Store = {
  session: null, emails: {}, profiles: {}, couples: {}, members: [],
  assignments: [], responses: [], moods: [], messages: [],
};

// --- temps réel simulé ---------------------------------------------------
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
export function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

// --- utilitaires -----------------------------------------------------------
const wait = () => new Promise((r) => setTimeout(r, LATENCY));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();
const SPICE_RANK: Record<Spice, number> = { soft: 1, spicy: 2, hot: 3 };

export function dayIn(timezone: string, d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function prevDay(day: string) {
  const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
function hash(str: string) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function me() {
  if (!s.session) throw new DataError("not_signed_in");
  return s.session.user_id;
}
function coupleOf(userId: string) { return s.members.find((m) => m.user_id === userId)?.couple_id ?? null; }
function membersOf(coupleId: string) { return s.members.filter((m) => m.couple_id === coupleId).map((m) => m.user_id); }
function partnerOf(userId: string) {
  const c = coupleOf(userId); if (!c) return null;
  return membersOf(c).find((u) => u !== userId) ?? null;
}
function newProfile(id: string, name = ""): Profile {
  return { id, display_name: name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris",
    birthdate: null, age_confirmed_at: null, spice_level: "soft", discreet_mode: false, locale: "fr" };
}
function isAdult(birthdate: string) {
  const b = new Date(birthdate + "T00:00:00Z"); const t = new Date();
  const limit = new Date(Date.UTC(t.getUTCFullYear() - 18, t.getUTCMonth(), t.getUTCDate()));
  return !isNaN(b.getTime()) && b <= limit;
}

// --- auth (S01) --------------------------------------------------------------
export async function getSession(): Promise<Session> { return s.session; }

export async function signInWithEmail(email: string): Promise<Session> {
  await wait();
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new DataError("invalid_email");
  let id = Object.keys(s.emails).find((k) => s.emails[k] === e);
  if (!id) { id = uid(); s.emails[id] = e; s.profiles[id] = newProfile(id); }
  s.session = { user_id: id, email: e };
  emit();
  return s.session;
}

export async function signInWithProvider(provider: "apple" | "google"): Promise<Session> {
  return signInWithEmail(`${provider}.demo@hotcouple.app`);
}

export async function signOut() { s.session = null; emit(); }

// --- profil (S02, S20) -------------------------------------------------------
export async function getMyProfile(): Promise<Profile> { await wait(); return { ...s.profiles[me()] }; }

export async function updateProfile(patch: Partial<Pick<Profile, "display_name" | "timezone" | "birthdate" | "spice_level" | "discreet_mode">>): Promise<Profile> {
  await wait();
  const p = s.profiles[me()];
  if (patch.birthdate !== undefined && patch.birthdate !== null) {
    if (!isAdult(patch.birthdate)) throw new DataError("underage");
    p.age_confirmed_at = p.age_confirmed_at ?? now();
  }
  Object.assign(p, patch);
  emit();
  return { ...p };
}

// --- couple (S03, F08) -------------------------------------------------------
export async function getCouple(): Promise<Couple | null> {
  await wait();
  const c = coupleOf(me());
  return c ? { ...s.couples[c] } : null;
}

export async function getPartner(): Promise<Profile | null> {
  await wait();
  const p = partnerOf(me());
  return p ? { ...s.profiles[p] } : null;
}

export async function createCouple(): Promise<string> {
  await wait();
  const u = me();
  if (coupleOf(u)) throw new DataError("already_paired");
  let code = "";
  do { code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * 32)]).join(""); }
  while (Object.values(s.couples).some((c) => c.invite_code === code));
  const id = uid();
  s.couples[id] = { id, invite_code: code, invite_expires_at: new Date(Date.now() + 48 * 3600e3).toISOString(),
    anniversary: null, timezone: s.profiles[u].timezone, streak_count: 0, streak_last_day: null, premium_until: null };
  s.members.push({ couple_id: id, user_id: u });
  emit();
  return code;
}

function join(userId: string, code: string) {
  if (coupleOf(userId)) throw new DataError("already_paired");
  const c = Object.values(s.couples).find((x) => x.invite_code === code.toUpperCase()
    && x.invite_expires_at && new Date(x.invite_expires_at) > new Date());
  if (!c) throw new DataError("invalid_or_expired_code");
  if (membersOf(c.id).length >= 2) throw new DataError("couple_full");
  s.members.push({ couple_id: c.id, user_id: userId });
  c.invite_code = null; c.invite_expires_at = null;
  emit();
  return c.id;
}

export async function joinCouple(code: string): Promise<string> { await wait(); return join(me(), code); }

export async function unpair(): Promise<void> {
  await wait();
  const c = coupleOf(me()); if (!c) throw new DataError("not_paired");
  const ids = new Set(s.assignments.filter((a) => a.couple_id === c).map((a) => a.id));
  s.responses = s.responses.filter((r) => !ids.has(r.assignment_id));
  s.assignments = s.assignments.filter((a) => a.couple_id !== c);
  const users = new Set(membersOf(c));
  s.moods = s.moods.filter((m) => !users.has(m.user_id));
  s.messages = s.messages.filter((m) => !users.has(m.sender_id));
  s.members = s.members.filter((m) => m.couple_id !== c);
  delete s.couples[c];
  emit();
}

// --- rituel du jour (S04, S08, S22) ---------------------------------------
function coupleSpice(coupleId: string): Spice | null {
  const ps = membersOf(coupleId).map((u) => s.profiles[u]);
  if (ps.length < 2 || ps.some((p) => !p.age_confirmed_at)) return null; // pas de contenu coquin sans 18+ des deux
  return ps.reduce<Spice>((acc, p) => (SPICE_RANK[p.spice_level] < SPICE_RANK[acc] ? p.spice_level : acc), "hot");
}

function ensureAssignment(coupleId: string, day: string, slot: Slot, spice: Spice) {
  let a = s.assignments.find((x) => x.couple_id === coupleId && x.day === day && x.slot === slot);
  if (a) return a;
  const pool = SEED_PROMPTS.filter((p) => p.kind === slot && SPICE_RANK[p.spice_level] <= SPICE_RANK[spice]);
  if (!pool.length) return null;
  const prompt = pool[hash(coupleId + day + slot) % pool.length];
  a = { id: uid(), couple_id: coupleId, day, slot, prompt };
  s.assignments.push(a);
  return a;
}

function view(a: Assignment, userId: string): DailyView {
  const rs = s.responses.filter((r) => r.assignment_id === a.id);
  const mine = rs.find((r) => r.user_id === userId) ?? null;
  const other = rs.find((r) => r.user_id !== userId) ?? null;
  return { assignment: a, mine, theirs: mine ? other : null, partnerAnswered: !!other };
}

export async function getToday(): Promise<DailyView[]> {
  await wait();
  const u = me(); const c = coupleOf(u);
  if (!c || membersOf(c).length < 2) return [];
  const day = dayIn(s.couples[c].timezone);
  const out: DailyView[] = [];
  const q = ensureAssignment(c, day, "question", "soft");
  if (q) out.push(view(q, u));
  const spice = coupleSpice(c);
  if (spice) { const sq = ensureAssignment(c, day, "spicy_question", spice); if (sq) out.push(view(sq, u)); }
  return out;
}

export async function getDaily(assignmentId: string): Promise<DailyView | null> {
  await wait();
  const u = me(); const a = s.assignments.find((x) => x.id === assignmentId && x.couple_id === coupleOf(u));
  return a ? view(a, u) : null;
}

function answerAs(userId: string, assignmentId: string, body: string | null, skipped = false) {
  const a = s.assignments.find((x) => x.id === assignmentId && x.couple_id === coupleOf(userId));
  if (!a) throw new DataError("not_paired");
  if (s.responses.some((r) => r.assignment_id === a.id && r.user_id === userId)) throw new DataError("already_answered");
  s.responses.push({ id: uid(), assignment_id: a.id, user_id: userId, body, skipped, created_at: now() });
  // même logique que le trigger bump_streak
  if (a.slot === "question" && s.responses.filter((r) => r.assignment_id === a.id).length === 2) {
    const c = s.couples[a.couple_id];
    c.streak_count = c.streak_last_day === a.day ? c.streak_count : c.streak_last_day === prevDay(a.day) ? c.streak_count + 1 : 1;
    if (!c.streak_last_day || c.streak_last_day < a.day) c.streak_last_day = a.day;
  }
  emit();
}

export async function answer(assignmentId: string, body: string): Promise<void> {
  await wait(); answerAs(me(), assignmentId, body.trim());
}
export async function skip(assignmentId: string): Promise<void> {
  await wait(); answerAs(me(), assignmentId, null, true);
}

// --- humeurs et nudges (S04, S05, S14) ------------------------------------
export async function setMood(mood: MoodKey, note?: string): Promise<void> {
  await wait();
  s.moods.push({ id: uid(), user_id: me(), mood, note: note ?? null, created_at: now() });
  emit();
}

export async function getMoods(): Promise<{ mine: Mood | null; partner: Mood | null }> {
  await wait();
  const u = me(); const p = partnerOf(u);
  const last = (id: string | null) => (id ? [...s.moods].reverse().find((m) => m.user_id === id) ?? null : null);
  return { mine: last(u), partner: last(p) };
}

export async function sendNudge(body: string): Promise<void> {
  await wait();
  if (!coupleOf(me())) throw new DataError("not_paired");
  s.messages.push({ id: uid(), sender_id: me(), kind: "nudge", body, created_at: now() });
  emit();
}

export async function getLastNudgeFromPartner(): Promise<Message | null> {
  await wait();
  const p = partnerOf(me());
  return p ? [...s.messages].reverse().find((m) => m.sender_id === p && m.kind === "nudge") ?? null : null;
}

// --- outils de dev : simuler le/la partenaire sur un seul téléphone ------
export const dev = {
  enabled: true,
  async partnerJoins(name = "Sam") {
    await wait();
    const c = coupleOf(me()); if (!c) throw new DataError("not_paired");
    const code = s.couples[c].invite_code; if (!code) throw new DataError("couple_full");
    s.profiles[PARTNER_ID] = { ...newProfile(PARTNER_ID, name), birthdate: "1994-05-12", age_confirmed_at: now(), spice_level: "spicy" };
    s.emails[PARTNER_ID] = "partenaire@demo.hotcouple.app";
    join(PARTNER_ID, code);
  },
  async partnerAnswers(assignmentId: string, body = "Notre fou rire sous la pluie, le premier soir.") {
    await wait(); answerAs(PARTNER_ID, assignmentId, body);
  },
  async partnerMood(mood: MoodKey) {
    await wait(); s.moods.push({ id: uid(), user_id: PARTNER_ID, mood, note: null, created_at: now() }); emit();
  },
  async partnerNudge(body = "Je pense à toi") {
    await wait(); s.messages.push({ id: uid(), sender_id: PARTNER_ID, kind: "nudge", body, created_at: now() }); emit();
  },
  /** Crée un couple en attente auquel « je » peux me joindre avec le code renvoyé (test de la saisie). */
  async partnerInvites(name = "Sam") {
    await wait();
    s.profiles[PARTNER_ID] = { ...newProfile(PARTNER_ID, name), birthdate: "1994-05-12", age_confirmed_at: now(), spice_level: "spicy" };
    const id = uid(); const code = "K7PM4Q";
    s.couples[id] = { id, invite_code: code, invite_expires_at: new Date(Date.now() + 48 * 3600e3).toISOString(),
      anniversary: null, timezone: "Europe/Paris", streak_count: 0, streak_last_day: null, premium_until: null };
    s.members.push({ couple_id: id, user_id: PARTNER_ID });
    emit();
    return code;
  },
};
