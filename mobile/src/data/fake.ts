// Couche de données factice, en mémoire. Mêmes signatures (async) que la future couche Supabase,
// mêmes règles que replica/schema.sql : appairage, révélation, streak, audace = le plus bas des deux.
import { SEED_CHALLENGES, SEED_DESIRES, SEED_PROMPTS } from "./seed";
import {
  DataError, type Assignment, type BucketItem, type Desire, type DesireAnswer, type Offer, type Couple, type DailyView, type Message, type Mood, type MoodKey,
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
  desireAnswers: { couple_id: string; user_id: string; desire_id: string; answer: DesireAnswer; updated_at: string }[];
  bucket: (BucketItem & { couple_id: string })[];
};

const PARTNER_ID = "dev-partner";
const SEED_ALL = [...SEED_PROMPTS, ...SEED_CHALLENGES];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LATENCY = 120;

const s: Store = {
  session: null, emails: {}, profiles: {}, couples: {}, members: [],
  assignments: [], responses: [], moods: [], messages: [], desireAnswers: [], bucket: [],
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
  s.desireAnswers = s.desireAnswers.filter((d) => d.couple_id !== c);
  s.bucket = s.bucket.filter((b) => b.couple_id !== c);
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
  // Le niveau du couple a changé et personne n'a encore répondu : on retire au bon niveau.
  // Si le niveau a baissé, on retire même après réponse : on ne montre jamais plus audacieux que le consentement actuel.
  if (a) {
    const answered = s.responses.some((r) => r.assignment_id === a!.id);
    const tooHot = SPICE_RANK[a.prompt.spice_level] > SPICE_RANK[spice];
    const tooMild = !answered && a.prompt.spice_level !== spice && SEED_ALL.some((p) => p.kind === slot && p.spice_level === spice);
    if (!tooHot && !tooMild) return a;
    s.responses = s.responses.filter((r) => r.assignment_id !== a!.id);
    s.assignments = s.assignments.filter((x) => x.id !== a!.id);
  }
  // On tire au niveau du couple quand il existe du contenu à ce niveau, sinon en dessous.
  const exact = SEED_ALL.filter((p) => p.kind === slot && p.spice_level === spice);
  const pool = exact.length ? exact : SEED_ALL.filter((p) => p.kind === slot && SPICE_RANK[p.spice_level] <= SPICE_RANK[spice]);
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
export const dev: Record<string, any> & { enabled: boolean } = {
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

// --- défis du jour (S06, S23) ----------------------------------------------
export async function getChallenges(): Promise<DailyView[]> {
  await wait();
  const u = me(); const c = coupleOf(u);
  if (!c || membersOf(c).length < 2) return [];
  const day = dayIn(s.couples[c].timezone);
  const out: DailyView[] = [];
  const a = ensureAssignment(c, day, "challenge", "soft");
  if (a) out.push(view(a, u));
  const spice = coupleSpice(c);
  if (spice) { const x = ensureAssignment(c, day, "spicy_challenge", spice); if (x) out.push(view(x, u)); }
  return out;
}

// --- audace et 18+ (S20) -----------------------------------------------------
export async function getSpiceStatus(): Promise<{ confirmed: boolean; mine: Spice; partnerConfirmed: boolean; effective: Spice | null }> {
  await wait();
  const u = me(); const p = partnerOf(u); const c = coupleOf(u);
  return {
    confirmed: !!s.profiles[u].age_confirmed_at,
    mine: s.profiles[u].spice_level,
    partnerConfirmed: !!(p && s.profiles[p].age_confirmed_at),
    effective: c ? coupleSpice(c) : null,
  };
}

// --- Premium (S16) : achat simulé, le vrai passera par RevenueCat ---------
function premium(coupleId: string | null) {
  const pu = coupleId ? s.couples[coupleId]?.premium_until : null;
  return !!pu && (pu === "infinity" || new Date(pu) > new Date());
}
export async function isPremium(): Promise<boolean> { await wait(); return premium(coupleOf(me())); }

export async function getOffers(): Promise<Offer[]> {
  await wait();
  // Prix d'exemple : en vrai, ils viennent du store via RevenueCat, dans la devise de l'utilisateur.
  return [
    { product: "yearly", title: "Annuel", price: "24,99 €", detail: "Pour vous deux · 2,08 € par mois", badge: "-79 %" },
    { product: "monthly", title: "Mensuel", price: "9,99 €", detail: "Pour vous deux · sans engagement" },
    { product: "lifetime", title: "À vie", price: "39,99 €", detail: "Un seul paiement, pour toujours" },
  ];
}

export async function purchase(product: Offer["product"]): Promise<void> {
  await wait(); await wait();
  const c = coupleOf(me()); if (!c) throw new DataError("not_paired");
  const until = product === "lifetime" ? "infinity"
    : new Date(Date.now() + (product === "yearly" ? 365 : 31) * 864e5).toISOString();
  s.couples[c].premium_until = until;
  emit();
}

// --- envies secrètes (S21) --------------------------------------------------
export type DesireRow = { desire: Desire; answer: DesireAnswer | null; locked: boolean };

export async function getDesires(): Promise<DesireRow[]> {
  await wait();
  const u = me(); const c = coupleOf(u); if (!c) throw new DataError("not_paired");
  const spice = coupleSpice(c); if (!spice) return [];
  const prem = premium(c);
  return SEED_DESIRES.filter((d) => SPICE_RANK[d.spice_level] <= SPICE_RANK[spice]).map((d) => ({
    desire: d,
    // RLS : on ne lit que SES réponses
    answer: s.desireAnswers.find((a) => a.user_id === u && a.desire_id === d.id)?.answer ?? null,
    locked: d.is_premium && !prem,
  }));
}

function answerDesireAs(userId: string, desireId: string, answer: DesireAnswer) {
  const c = coupleOf(userId); if (!c) throw new DataError("not_paired");
  const ex = s.desireAnswers.find((a) => a.user_id === userId && a.desire_id === desireId);
  if (ex) { ex.answer = answer; ex.updated_at = now(); }
  else s.desireAnswers.push({ couple_id: c, user_id: userId, desire_id: desireId, answer, updated_at: now() });
  emit();
}
export async function answerDesire(desireId: string, answer: DesireAnswer): Promise<void> {
  await wait(); answerDesireAs(me(), desireId, answer);
}

/** Équivalent de la RPC mutual_desires() : uniquement les oui des deux côtés. */
export async function getMutualDesires(): Promise<Desire[]> {
  await wait();
  const u = me(); const p = partnerOf(u); if (!p) return [];
  const yes = (id: string) => new Set(s.desireAnswers.filter((a) => a.user_id === id && a.answer === "yes").map((a) => a.desire_id));
  const a = yes(u); const b = yes(p);
  return SEED_DESIRES.filter((d) => a.has(d.id) && b.has(d.id));
}

// --- bucket list (S13) --------------------------------------------------------
export async function getBucket(): Promise<BucketItem[]> {
  await wait();
  const c = coupleOf(me()); if (!c) return [];
  return s.bucket.filter((b) => b.couple_id === c).map(({ couple_id, ...b }) => b)
    .sort((x, y) => Number(!!x.done_at) - Number(!!y.done_at) || y.created_at.localeCompare(x.created_at));
}
export async function addBucketItem(title: string, category: BucketItem["category"]): Promise<void> {
  await wait();
  const c = coupleOf(me()); if (!c) throw new DataError("not_paired");
  const t = title.trim(); if (!t) return;
  s.bucket.push({ id: uid(), couple_id: c, title: t.slice(0, 200), category, done_at: null, created_by: me(), created_at: now() });
  emit();
}
export async function toggleBucketItem(id: string): Promise<void> {
  await wait();
  const b = s.bucket.find((x) => x.id === id && x.couple_id === coupleOf(me())); if (!b) return;
  b.done_at = b.done_at ? null : now(); emit();
}
export async function deleteBucketItem(id: string): Promise<void> {
  await wait();
  const c = coupleOf(me()); s.bucket = s.bucket.filter((x) => !(x.id === id && x.couple_id === c)); emit();
}

// --- petits mots (S14) --------------------------------------------------------
export async function getMessages(): Promise<Message[]> {
  await wait();
  const u = me(); const p = partnerOf(u);
  const ids = new Set([u, p].filter(Boolean) as string[]);
  return s.messages.filter((m) => ids.has(m.sender_id));
}
export async function sendNote(body: string): Promise<void> {
  await wait();
  if (!coupleOf(me())) throw new DataError("not_paired");
  const b = body.trim(); if (!b) return;
  s.messages.push({ id: uid(), sender_id: me(), kind: "text", body: b.slice(0, 2000), created_at: now() });
  emit();
}

// --- compte (S18) -------------------------------------------------------------
export async function deleteAccount(): Promise<void> {
  await wait();
  const u = me();
  if (coupleOf(u)) await unpair();
  delete s.profiles[u]; delete s.emails[u];
  s.session = null;
  emit();
}

Object.assign(dev, {
  async partnerDesires() {
    await wait();
    const set = (id: string, a: DesireAnswer) => answerDesireAs(PARTNER_ID, id, a);
    set("d01", "yes"); set("d02", "no"); set("d03", "maybe"); set("d04", "yes"); set("d05", "yes"); set("d06", "yes"); set("d08", "yes");
  },
  async partnerNote(body = "Hâte de te retrouver ce soir.") {
    await wait(); s.messages.push({ id: uid(), sender_id: PARTNER_ID, kind: "text", body, created_at: now() }); emit();
  },
  async partnerAddsBucket(title = "Week-end surprise à la mer") {
    await wait();
    const c = coupleOf(PARTNER_ID); if (!c) return;
    s.bucket.push({ id: uid(), couple_id: c, title, category: "trip", done_at: null, created_by: PARTNER_ID, created_at: now() }); emit();
  },
});
