-- HotCouple : fonctions serveur appelées par l'app (RPC), en complément de 0001_schema.sql.
-- Tout est security definer avec search_path fixé, et vérifie auth.uid() / my_couple_id().

-- ---------------------------------------------------------------
-- 1. Confidentialité du profil : le partenaire ne lit que les colonnes neutres.
--    Date de naissance, niveau d'audace, mode discret : seulement via my_profile().
-- ---------------------------------------------------------------
revoke select, update on public.profiles from authenticated, anon;
grant select (id, display_name, avatar_path, timezone, locale, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name, avatar_path, timezone, birthdate, spice_level, discreet_mode, app_pin_enabled, locale, notification_prefs)
  on public.profiles to authenticated;

create or replace function public.my_profile() returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid()
$$;

-- La confirmation d'âge est posée par le serveur, jamais par le client
create or replace function public.stamp_age_confirmation() returns trigger
language plpgsql as $$
begin
  if new.birthdate is not null and old.age_confirmed_at is null then
    new.age_confirmed_at := now();
  end if;
  if new.birthdate is null then new.age_confirmed_at := null; end if;
  return new;
end $$;
drop trigger if exists profiles_age on public.profiles;
create trigger profiles_age before update of birthdate on public.profiles
  for each row execute function public.stamp_age_confirmation();

-- Niveau du couple : null tant que les deux n'ont pas confirmé leur âge
create or replace function public.couple_spice_level() returns text
language sql stable security definer set search_path = public as $$
  select case when count(*) = 2 and count(p.age_confirmed_at) = 2 then
           case min(case p.spice_level when 'soft' then 1 when 'spicy' then 2 else 3 end)
             when 1 then 'soft' when 2 then 'spicy' else 'hot' end
         end
  from public.couple_members m join public.profiles p on p.id = m.user_id
  where m.couple_id = public.my_couple_id()
$$;

create or replace function public.get_spice_status() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'confirmed', (select age_confirmed_at is not null from public.profiles where id = auth.uid()),
    'mine', (select spice_level from public.profiles where id = auth.uid()),
    'partnerConfirmed', coalesce((select age_confirmed_at is not null from public.profiles where id = public.my_partner_id()), false),
    'effective', public.couple_spice_level()
  )
$$;

-- ---------------------------------------------------------------
-- 2. Tirage du jour (questions et défis) avec la règle de consentement :
--    on retire si le niveau a changé et que personne n'a répondu, et toujours s'il a baissé.
-- ---------------------------------------------------------------
create or replace function public.spice_rank(s text) returns int
language sql immutable as $$ select case s when 'soft' then 1 when 'spicy' then 2 when 'hot' then 3 end $$;

create or replace function public.ensure_assignment(p_couple uuid, p_day date, p_slot text, p_spice text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a record;
  answered boolean;
  v_prompt uuid;
  v_id uuid;
  has_exact boolean;
begin
  select da.id, pr.spice_level into a
    from public.daily_assignments da join public.prompts pr on pr.id = da.prompt_id
   where da.couple_id = p_couple and da.day = p_day and da.slot = p_slot;
  select exists (select 1 from public.prompts where kind = p_slot and spice_level = p_spice and active) into has_exact;
  if found and a.id is not null then
    select exists (select 1 from public.responses where assignment_id = a.id) into answered;
    if spice_rank(a.spice_level) <= spice_rank(p_spice) and (answered or a.spice_level = p_spice or not has_exact) then
      return a.id;
    end if;
    delete from public.daily_assignments where id = a.id;  -- cascade sur les réponses
  end if;
  select id into v_prompt from public.prompts
   where kind = p_slot and active
     and (case when has_exact then spice_level = p_spice else spice_rank(spice_level) <= spice_rank(p_spice) end)
   order by md5(p_couple::text || p_day::text || p_slot || id::text)
   limit 1;
  if v_prompt is null then return null; end if;
  insert into public.daily_assignments (couple_id, day, slot, prompt_id)
    values (p_couple, p_day, p_slot, v_prompt)
    on conflict (couple_id, day, slot) do update set prompt_id = excluded.prompt_id
    returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.ensure_assignment(uuid, date, text, text) from public, authenticated, anon;

-- Vue d'une carte du jour, avec la règle de révélation (identique à la policy responses_read)
create or replace function public.daily_view(p_assignment uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'assignment', json_build_object('id', da.id, 'couple_id', da.couple_id, 'day', da.day, 'slot', da.slot,
      'prompt', json_build_object('id', pr.id, 'kind', pr.kind, 'spice_level', pr.spice_level, 'body', pr.body, 'challenge_kind', pr.challenge_kind)),
    'mine', (select row_to_json(r) from public.responses r where r.assignment_id = da.id and r.user_id = auth.uid()),
    'theirs', case when exists (select 1 from public.responses r where r.assignment_id = da.id and r.user_id = auth.uid())
                   then (select row_to_json(r) from public.responses r where r.assignment_id = da.id and r.user_id <> auth.uid())
              end,
    'partnerAnswered', exists (select 1 from public.responses r where r.assignment_id = da.id and r.user_id <> auth.uid())
  )
  from public.daily_assignments da join public.prompts pr on pr.id = da.prompt_id
  where da.id = p_assignment and da.couple_id = public.my_couple_id()
$$;

-- p_group : 'questions' (accueil) ou 'challenges' (défis)
create or replace function public.get_today(p_group text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_couple uuid := public.my_couple_id();
  v_day date;
  v_spice text;
  ids uuid[] := '{}';
  v uuid;
begin
  if v_couple is null or (select count(*) from public.couple_members where couple_id = v_couple) < 2 then
    return '[]'::json;
  end if;
  select (now() at time zone timezone)::date into v_day from public.couples where id = v_couple;
  v_spice := public.couple_spice_level();
  v := public.ensure_assignment(v_couple, v_day, case p_group when 'challenges' then 'challenge' else 'question' end, 'soft');
  if v is not null then ids := ids || v; end if;
  if v_spice is not null then
    v := public.ensure_assignment(v_couple, v_day, case p_group when 'challenges' then 'spicy_challenge' else 'spicy_question' end, v_spice);
    if v is not null then ids := ids || v; end if;
  end if;
  return (select coalesce(json_agg(public.daily_view(x) order by ord), '[]'::json) from unnest(ids) with ordinality as t(x, ord));
end $$;

-- ---------------------------------------------------------------
-- 3. Jeux tour par tour : création et coups validés côté serveur
-- ---------------------------------------------------------------
create or replace function public.create_game(p_type text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_couple uuid := public.my_couple_id();
  v_cols int; v_rows int; v_id uuid;
begin
  if v_couple is null or public.my_partner_id() is null then raise exception 'not_paired'; end if;
  if p_type = 'tic_tac_toe' then v_cols := 3; v_rows := 3;
  elsif p_type = 'four_in_row' then v_cols := 7; v_rows := 6;
  else raise exception 'invalid_move'; end if;
  insert into public.games (couple_id, game_type, state, turn_user_id)
    values (v_couple, p_type,
            json_build_object('cols', v_cols, 'rows', v_rows, 'players', json_build_array(auth.uid(), public.my_partner_id()),
                              'board', (select json_agg(null::text) from generate_series(1, v_cols * v_rows)))::jsonb,
            auth.uid())
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.board_winner(b jsonb, cols int, rows int, need int) returns text
language plpgsql immutable as $$
declare
  r int; c int; k int; v text; d int[];
  dirs int[][] := array[[1,0],[0,1],[1,1],[1,-1]];
begin
  for r in 0..rows-1 loop
    for c in 0..cols-1 loop
      v := b ->> (r * cols + c);
      continue when v is null;
      for i in 1..4 loop
        k := 1;
        while k < need
          and c + dirs[i][1]*k between 0 and cols-1
          and r + dirs[i][2]*k between 0 and rows-1
          and (b ->> ((r + dirs[i][2]*k) * cols + c + dirs[i][1]*k)) = v loop
          k := k + 1;
        end loop;
        if k = need then return v; end if;
      end loop;
    end loop;
  end loop;
  return null;
end $$;

create or replace function public.play_move(p_game uuid, p_index int, p_version int) returns void
language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  cols int; rows int; need int; cell int := -1; r int; w text; other uuid;
begin
  select * into g from public.games where id = p_game and couple_id = public.my_couple_id() for update;
  if g.id is null or g.status <> 'active' then raise exception 'invalid_move'; end if;
  if g.version <> p_version then raise exception 'stale_game'; end if;
  if g.turn_user_id is distinct from auth.uid() then raise exception 'not_your_turn'; end if;
  cols := (g.state->>'cols')::int; rows := (g.state->>'rows')::int;
  need := case g.game_type when 'tic_tac_toe' then 3 else 4 end;
  if g.game_type = 'four_in_row' then
    if p_index < 0 or p_index >= cols then raise exception 'invalid_move'; end if;
    for r in reverse rows-1..0 loop
      if g.state->'board'->>(r * cols + p_index) is null then cell := r * cols + p_index; exit; end if;
    end loop;
  else
    cell := p_index;
  end if;
  if cell < 0 or cell >= cols * rows or g.state->'board'->>cell is not null then raise exception 'invalid_move'; end if;
  g.state := jsonb_set(g.state, array['board', cell::text], to_jsonb(auth.uid()::text));
  w := public.board_winner(g.state->'board', cols, rows, need);
  select (x)::uuid into other from jsonb_array_elements_text(g.state->'players') x where x <> auth.uid()::text;
  update public.games set
    state = g.state,
    version = g.version + 1,
    status = case when w is not null or not exists (select 1 from jsonb_array_elements(g.state->'board') e where e = 'null'::jsonb) then 'finished' else 'active' end,
    winner_id = w::uuid,
    turn_user_id = case when w is not null or not exists (select 1 from jsonb_array_elements(g.state->'board') e where e = 'null'::jsonb) then null else other end
  where id = g.id;
end $$;

-- ---------------------------------------------------------------
-- 4. Quiz : démarrage (avec contrôle Premium) et progression du partenaire
-- ---------------------------------------------------------------
create or replace function public.start_quiz(p_quiz uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_couple uuid := public.my_couple_id(); q public.quizzes; v_id uuid;
begin
  if v_couple is null then raise exception 'not_paired'; end if;
  select * into q from public.quizzes where id = p_quiz and active;
  if q.id is null then raise exception 'invalid_move'; end if;
  if q.is_premium and not public.couple_is_premium() then raise exception 'premium_required'; end if;
  if q.spice_level <> 'soft' and (public.couple_spice_level() is null or spice_rank(q.spice_level) > spice_rank(public.couple_spice_level())) then
    raise exception 'premium_required';
  end if;
  select id into v_id from public.quiz_sessions where couple_id = v_couple and quiz_id = p_quiz and status = 'open' limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.quiz_sessions (couple_id, quiz_id, started_by) values (v_couple, p_quiz, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.quiz_partner_done(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.quiz_answers a where a.session_id = s.id and a.user_id <> auth.uid())
       >= (select count(*) from public.quiz_questions q where q.quiz_id = s.quiz_id)
  from public.quiz_sessions s where s.id = p_session and s.couple_id = public.my_couple_id()
$$;

-- ---------------------------------------------------------------
-- 5. Suppression de compte (exigence Apple) : désappaire puis supprime l'utilisateur
-- ---------------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  delete from public.couples where id = public.my_couple_id();
  delete from auth.users where id = v_uid;  -- cascade : profil, jetons, etc.
end $$;

-- ---------------------------------------------------------------
-- 6. Temps réel : quelques tables de plus utiles à l'app
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.bucket_items, public.special_dates, public.quiz_answers;

-- Les RPC internes ne sont pas appelables directement
revoke execute on function public.board_winner(jsonb, int, int, int) from public, anon;
