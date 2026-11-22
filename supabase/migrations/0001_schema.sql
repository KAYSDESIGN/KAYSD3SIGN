-- HotCouple : schéma Postgres (Supabase)
-- Règles d'accès : Row Level Security sur toutes les tables.
-- Principe : tout le contenu appartient à un couple ; on ne lit que celui de son propre couple.
-- Heures en timestamptz (UTC). Pas d'argent stocké ici : les achats passent par les stores (RevenueCat).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------
-- Profils (1-1 avec auth.users)
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_path text,
  timezone text not null default 'Europe/Paris',
  birthdate date,                                   -- déclaratif, requis avant le contenu adulte
  age_confirmed_at timestamptz,                     -- 18+ confirmé (S20)
  spice_level text not null default 'soft'
    check (spice_level in ('soft','spicy','hot')),  -- niveau d'audace choisi par la personne
  discreet_mode boolean not null default false,     -- S26 : notifications génériques
  app_pin_enabled boolean not null default false,   -- le PIN lui-même reste sur l'appareil
  locale text not null default 'fr' check (locale in ('fr','en')),
  notification_prefs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adult check (birthdate is null or birthdate <= (current_date - interval '18 years'))
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Création auto du profil à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.push_tokens (user_id);

-- ---------------------------------------------------------------
-- Couple et appairage
-- ---------------------------------------------------------------
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'), -- sans 0/O/1/I
  invite_expires_at timestamptz,
  anniversary date,
  timezone text not null default 'Europe/Paris',    -- fuseau qui définit « le jour » du couple
  streak_count int not null default 0 check (streak_count >= 0),
  streak_last_day date,
  premium_until timestamptz,                        -- 'infinity' pour l'achat à vie
  premium_owner_id uuid references public.profiles(id) on delete set null,
  premium_product text check (premium_product in ('monthly','yearly','lifetime')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger couples_touch before update on public.couples
  for each row execute function public.touch_updated_at();

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade, -- 1 couple max par personne
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);
create index on public.couple_members (couple_id);

-- Max 2 membres par couple (verrou sur la ligne du couple contre les courses)
create or replace function public.enforce_two_members() returns trigger
language plpgsql as $$
begin
  perform 1 from public.couples where id = new.couple_id for update;
  if (select count(*) from public.couple_members where couple_id = new.couple_id) >= 2 then
    raise exception 'couple_full';
  end if;
  return new;
end $$;
create trigger couple_members_max_two before insert on public.couple_members
  for each row execute function public.enforce_two_members();

-- Le couple de l'utilisateur courant (utilisé par toutes les règles d'accès)
create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from public.couple_members where user_id = auth.uid()
$$;

create or replace function public.my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from public.couple_members
  where couple_id = public.my_couple_id() and user_id <> auth.uid()
$$;

-- Le niveau d'audace effectif = le plus bas des deux
create or replace function public.couple_spice_level() returns text
language sql stable security definer set search_path = public as $$
  select case min(case p.spice_level when 'soft' then 1 when 'spicy' then 2 else 3 end)
           when 1 then 'soft' when 2 then 'spicy' when 3 then 'hot' end
  from public.couple_members m join public.profiles p on p.id = m.user_id
  where m.couple_id = public.my_couple_id()
$$;

create or replace function public.couple_is_premium() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(premium_until > now(), false) from public.couples where id = public.my_couple_id()
$$;

-- RPC : créer un couple et obtenir un code d'invitation (S03)
create or replace function public.create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_couple uuid;
  v_tz text;
begin
  if public.my_couple_id() is not null then raise exception 'already_paired'; end if;
  select timezone into v_tz from public.profiles where id = auth.uid();
  loop
    v_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '')
               from generate_series(1,6));
    begin
      insert into public.couples (invite_code, invite_expires_at, timezone)
        values (v_code, now() + interval '48 hours', coalesce(v_tz, 'Europe/Paris'))
        returning id into v_couple;
      exit;
    exception when unique_violation then
      -- code déjà pris : on recommence
    end;
  end loop;
  insert into public.couple_members (couple_id, user_id) values (v_couple, auth.uid());
  return v_code;
end $$;

-- RPC : rejoindre un couple avec un code
create or replace function public.join_couple(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_couple uuid;
begin
  if public.my_couple_id() is not null then raise exception 'already_paired'; end if;
  select id into v_couple from public.couples
    where invite_code = upper(p_code) and invite_expires_at > now()
    for update;
  if v_couple is null then raise exception 'invalid_or_expired_code'; end if;
  insert into public.couple_members (couple_id, user_id) values (v_couple, auth.uid());
  update public.couples set invite_code = null, invite_expires_at = null where id = v_couple;
  return v_couple;
end $$;

-- RPC : se désappairer = supprimer le couple et tout son contenu, des deux côtés (F08)
-- Les fichiers du bucket sont supprimés par l'Edge Function « unpair » qui appelle cette RPC.
create or replace function public.unpair() returns void
language plpgsql security definer set search_path = public as $$
declare v_couple uuid := public.my_couple_id();
begin
  if v_couple is null then raise exception 'not_paired'; end if;
  delete from public.couples where id = v_couple;  -- cascade sur tout le contenu
end $$;

-- ---------------------------------------------------------------
-- Humeurs, position
-- ---------------------------------------------------------------
create table public.moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood text not null check (mood in ('amazing','happy','calm','tired','sad','stressed','need_hug','in_the_mood')),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.moods (couple_id, created_at desc);
create index on public.moods (user_id);

create table public.locations_current (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m real,
  sharing_paused boolean not null default false,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.locations_current (couple_id);

-- Trace du jour : conservée 48 h max (job location-purge)
create table public.location_points (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.location_points (user_id, recorded_at desc);
create index on public.location_points (couple_id);
create index on public.location_points (recorded_at);

-- ---------------------------------------------------------------
-- Contenu éditorial : questions, défis (lecture seule pour les utilisateurs)
-- ---------------------------------------------------------------
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('question','challenge','spicy_question','spicy_challenge')),
  challenge_kind text check (challenge_kind in ('photo','voice','drawing','text')),
  spice_level text not null default 'soft' check (spice_level in ('soft','spicy','hot')),
  locale text not null check (locale in ('fr','en')),
  body text not null,
  is_premium boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_has_kind check ((kind like '%challenge') = (challenge_kind is not null))
);
create index on public.prompts (kind, locale, spice_level) where active;

-- Le tirage du jour pour un couple (créé par le job daily-assign ou à la demande)
create table public.daily_assignments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  day date not null,                                -- date locale dans couples.timezone
  slot text not null check (slot in ('question','challenge','spicy_question','spicy_challenge')),
  prompt_id uuid not null references public.prompts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, day, slot)
);
create index on public.daily_assignments (prompt_id);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.daily_assignments(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 2000),
  media_path text,                                  -- photo, vocal ou dessin dans le bucket couple-media
  skipped boolean not null default false,           -- « passer » sans pénalité (défis coquins)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);
create index on public.responses (couple_id, created_at desc);
create index on public.responses (user_id);

-- Streak : +1 quand les deux ont répondu à la question du jour
create or replace function public.bump_streak() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_day date;
  v_slot text;
begin
  select day, slot into v_day, v_slot from public.daily_assignments where id = new.assignment_id;
  if v_slot <> 'question' then return new; end if;
  if (select count(*) from public.responses where assignment_id = new.assignment_id) < 2 then
    return new;
  end if;
  update public.couples
     set streak_count = case
           when streak_last_day = v_day then streak_count
           when streak_last_day = v_day - 1 then streak_count + 1
           else 1 end,
         streak_last_day = greatest(coalesce(streak_last_day, v_day), v_day)
   where id = new.couple_id;
  return new;
end $$;
create trigger responses_streak after insert on public.responses
  for each row execute function public.bump_streak();

-- ---------------------------------------------------------------
-- Moments, bucket list, messages, dates
-- ---------------------------------------------------------------
create table public.moments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  photo_path text not null,
  caption text check (char_length(caption) <= 500),
  lat double precision,
  lng double precision,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.moments (couple_id, taken_at desc);
create index on public.moments (author_id);

create table public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'date' check (category in ('trip','date','adventure','spicy')),
  done_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.bucket_items (couple_id, position);
create index on public.bucket_items (created_by);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','nudge','affection')),
  body text check (char_length(body) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint text_has_body check (kind <> 'text' or body is not null)
);
create index on public.messages (couple_id, created_at desc);
create index on public.messages (sender_id);

create table public.special_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  date date not null,
  repeats_yearly boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.special_dates (couple_id, date);

-- ---------------------------------------------------------------
-- Quiz de compatibilité (S10) : réponses révélées quand les deux ont fini
-- ---------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  locale text not null check (locale in ('fr','en')),
  spice_level text not null default 'soft' check (spice_level in ('soft','spicy','hot')),
  is_premium boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.quizzes (locale, spice_level) where active;

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position int not null,
  body text not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  started_by uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open','revealed')),
  match_score int check (match_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.quiz_sessions (couple_id, created_at desc);
create index on public.quiz_sessions (quiz_id);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, question_id, user_id)
);
create index on public.quiz_answers (session_id);
create index on public.quiz_answers (user_id);

-- Révélation : quand les deux ont répondu à toutes les questions, on calcule le score
create or replace function public.reveal_quiz() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_same int;
begin
  perform 1 from public.quiz_sessions where id = new.session_id for update;
  select count(*) into v_total from public.quiz_questions q
    join public.quiz_sessions s on s.quiz_id = q.quiz_id where s.id = new.session_id;
  if (select count(*) from public.quiz_answers where session_id = new.session_id) < v_total * 2 then
    return new;
  end if;
  select count(*) into v_same from public.quiz_answers a
    join public.quiz_answers b on b.session_id = a.session_id and b.question_id = a.question_id
      and b.user_id > a.user_id and b.choice = a.choice
    where a.session_id = new.session_id;
  update public.quiz_sessions
     set status = 'revealed', match_score = round(100.0 * v_same / greatest(v_total, 1))
   where id = new.session_id;
  return new;
end $$;
create trigger quiz_answers_reveal after insert on public.quiz_answers
  for each row execute function public.reveal_quiz();

-- ---------------------------------------------------------------
-- Jeux tour par tour (S12) : les coups passent par l'Edge Function « game-move »
-- ---------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  game_type text not null check (game_type in ('four_in_row','tic_tac_toe','trivia','word_guess','memory','darts','sumo','spot_it','spicy_dice')),
  state jsonb not null default '{}',
  version int not null default 0,                   -- verrou optimiste contre les coups simultanés
  turn_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','finished','abandoned')),
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.games (couple_id, status, updated_at desc);
create trigger games_touch before update on public.games
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- HotCouple : envies secrètes (S21)
-- Règle d'or : on ne voit JAMAIS les réponses de l'autre, seulement les oui communs.
-- ---------------------------------------------------------------
create table public.desires (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('fr','en')),
  category text not null,
  spice_level text not null check (spice_level in ('soft','spicy','hot')),
  body text not null,
  is_premium boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.desires (locale, spice_level) where active;

create table public.desire_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  desire_id uuid not null references public.desires(id) on delete cascade,
  answer text not null check (answer in ('yes','maybe','no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, desire_id)
);
create index on public.desire_answers (couple_id, desire_id);
create trigger desire_answers_touch before update on public.desire_answers
  for each row execute function public.touch_updated_at();

-- Les seuls résultats visibles : les oui des deux côtés
create or replace function public.mutual_desires()
returns table (desire_id uuid, body text, category text, matched_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.body, d.category, greatest(a.updated_at, b.updated_at)
  from public.desire_answers a
  join public.desire_answers b
    on b.desire_id = a.desire_id and b.couple_id = a.couple_id and b.user_id <> a.user_id
  join public.desires d on d.id = a.desire_id
  where a.couple_id = public.my_couple_id()
    and a.user_id = auth.uid()
    and a.answer = 'yes' and b.answer = 'yes'
$$;

-- ---------------------------------------------------------------
-- HotCouple : coffre privé (S25) et soirées (S27)
-- ---------------------------------------------------------------
create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  object_path text not null,                        -- bucket privé « vault », chiffré côté client
  expires_at timestamptz,                           -- auto-destruction optionnelle (job vault-purge)
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vault_items (couple_id, created_at desc);
create index on public.vault_items (owner_id);
create index on public.vault_items (expires_at) where expires_at is not null;

create table public.date_plans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  proposed_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  theme text check (char_length(theme) <= 200),
  status text not null default 'proposed' check (status in ('proposed','accepted','declined','done','cancelled')),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.date_plans (couple_id, starts_at);
create index on public.date_plans (status, starts_at) where status = 'accepted';
create index on public.date_plans (proposed_by);
create trigger date_plans_touch before update on public.date_plans
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Notifications internes, signalements, achats
-- ---------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('moment','vault_item','message','response','user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) <= 1000),
  status text not null default 'open' check (status in ('open','reviewed','actioned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.reports (status, created_at);
create index on public.reports (reporter_id);

-- Webhooks RevenueCat : l'id d'événement unique rend le traitement idempotent
create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  product text,
  expires_at timestamptz,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.subscription_events (user_id);

-- updated_at automatique sur toutes les tables qui n'ont pas encore le trigger
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_at'
      and not exists (select 1 from pg_trigger g join pg_class k on k.oid = g.tgrelid
                      where k.relname = c.table_name and g.tgname = c.table_name || '_touch')
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
                   t || '_touch', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.push_tokens         enable row level security;
alter table public.couples             enable row level security;
alter table public.couple_members      enable row level security;
alter table public.moods               enable row level security;
alter table public.locations_current   enable row level security;
alter table public.location_points     enable row level security;
alter table public.prompts             enable row level security;
alter table public.daily_assignments   enable row level security;
alter table public.responses           enable row level security;
alter table public.moments             enable row level security;
alter table public.bucket_items        enable row level security;
alter table public.messages            enable row level security;
alter table public.special_dates       enable row level security;
alter table public.quizzes             enable row level security;
alter table public.quiz_questions      enable row level security;
alter table public.quiz_sessions       enable row level security;
alter table public.quiz_answers        enable row level security;
alter table public.games               enable row level security;
alter table public.desires             enable row level security;
alter table public.desire_answers      enable row level security;
alter table public.vault_items         enable row level security;
alter table public.date_plans          enable row level security;
alter table public.notifications      enable row level security;
alter table public.reports             enable row level security;
alter table public.subscription_events enable row level security; -- aucune policy : service role uniquement

-- Profils : soi-même en écriture, soi + partenaire en lecture
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or id = public.my_partner_id());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy push_tokens_own on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Couple : lecture et mise à jour limitée (anniversaire, fuseau) ; création/jointure par RPC
create policy couples_read on public.couples for select using (id = public.my_couple_id());
create policy couples_update on public.couples for update
  using (id = public.my_couple_id()) with check (id = public.my_couple_id());
-- Les colonnes streak et premium ne doivent pas être modifiables par le client :
revoke update on public.couples from authenticated;
grant update (anniversary, timezone) on public.couples to authenticated;

create policy members_read on public.couple_members for select using (couple_id = public.my_couple_id());

-- Contenu partagé du couple : lecture par les deux, écriture par l'auteur
create policy moods_read on public.moods for select using (couple_id = public.my_couple_id());
create policy moods_insert on public.moods for insert
  with check (couple_id = public.my_couple_id() and user_id = auth.uid());

create policy loc_read on public.locations_current for select
  using (couple_id = public.my_couple_id() and (user_id = auth.uid() or not sharing_paused));
create policy loc_write on public.locations_current for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());

create policy locpts_read on public.location_points for select using (couple_id = public.my_couple_id());
create policy locpts_insert on public.location_points for insert
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());

-- Catalogues : lecture pour tout utilisateur connecté (le filtrage audace/premium se fait aussi côté serveur)
create policy prompts_read on public.prompts for select to authenticated using (active);
create policy quizzes_read on public.quizzes for select to authenticated using (active);
create policy quizq_read on public.quiz_questions for select to authenticated using (true);
create policy desires_read on public.desires for select to authenticated using (active);

create policy assign_read on public.daily_assignments for select using (couple_id = public.my_couple_id());

-- Réponses : la sienne toujours ; celle du partenaire seulement après avoir répondu soi-même
-- (fonction security definer pour éviter une policy qui se lit elle-même en boucle)
create or replace function public.i_answered(p_assignment uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.responses where assignment_id = p_assignment and user_id = auth.uid())
$$;
create policy responses_read on public.responses for select using (
  couple_id = public.my_couple_id() and (user_id = auth.uid() or public.i_answered(assignment_id))
);
create policy responses_insert on public.responses for insert
  with check (couple_id = public.my_couple_id() and user_id = auth.uid());

create policy moments_read on public.moments for select using (couple_id = public.my_couple_id());
create policy moments_insert on public.moments for insert
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());
create policy moments_modify on public.moments for update using (author_id = auth.uid());
create policy moments_delete on public.moments for delete using (author_id = auth.uid());

create policy bucket_all on public.bucket_items for all
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy messages_read on public.messages for select using (couple_id = public.my_couple_id());
create policy messages_insert on public.messages for insert
  with check (couple_id = public.my_couple_id() and sender_id = auth.uid());
create policy messages_mark_read on public.messages for update
  using (couple_id = public.my_couple_id() and sender_id <> auth.uid());

create policy dates_all on public.special_dates for all
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy qsess_read on public.quiz_sessions for select using (couple_id = public.my_couple_id());
create policy qsess_insert on public.quiz_sessions for insert
  with check (couple_id = public.my_couple_id() and started_by = auth.uid());

-- Réponses de quiz : celles du partenaire visibles seulement une fois la session révélée
create policy qans_read on public.quiz_answers for select using (
  couple_id = public.my_couple_id() and (
    user_id = auth.uid()
    or exists (select 1 from public.quiz_sessions s where s.id = quiz_answers.session_id and s.status = 'revealed')
  )
);
create policy qans_insert on public.quiz_answers for insert
  with check (couple_id = public.my_couple_id() and user_id = auth.uid());

-- Jeux : lecture seule côté client ; les coups passent par l'Edge Function
create policy games_read on public.games for select using (couple_id = public.my_couple_id());

-- Envies secrètes : on ne lit QUE ses propres réponses
create policy desire_ans_own on public.desire_answers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());

create policy vault_read on public.vault_items for select using (couple_id = public.my_couple_id());
create policy vault_insert on public.vault_items for insert
  with check (couple_id = public.my_couple_id() and owner_id = auth.uid());
create policy vault_delete on public.vault_items for delete using (owner_id = auth.uid());

create policy plans_all on public.date_plans for all
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy notif_own on public.notifications for select using (user_id = auth.uid());
create policy notif_mark_read on public.notifications for update using (user_id = auth.uid());

create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------
-- Stockage : buckets privés, dossier racine = id du couple
--   couple-media/<couple_id>/...   photos de moments, réponses aux défis
--   vault/<couple_id>/...          coffre (fichiers déjà chiffrés côté client)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('couple-media', 'couple-media', false, 15728640),
       ('vault', 'vault', false, 15728640)
on conflict (id) do nothing;

create policy couple_files_read on storage.objects for select using (
  bucket_id in ('couple-media','vault')
  and (storage.foldername(name))[1] = public.my_couple_id()::text
);
create policy couple_files_write on storage.objects for insert with check (
  bucket_id in ('couple-media','vault')
  and (storage.foldername(name))[1] = public.my_couple_id()::text
);
create policy couple_files_delete on storage.objects for delete using (
  bucket_id in ('couple-media','vault') and owner = auth.uid()
);

-- ---------------------------------------------------------------
-- Temps réel : tables diffusées aux deux partenaires (RLS appliquée)
-- ---------------------------------------------------------------
alter publication supabase_realtime add table
  public.moods, public.locations_current, public.responses, public.messages,
  public.games, public.quiz_sessions, public.date_plans, public.couples;
