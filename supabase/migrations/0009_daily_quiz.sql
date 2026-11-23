-- Quiz à deux quotidien : chaque jour (fuseau du couple), 5 questions nouvelles par catégorie,
-- tirées dans la réserve de chaque quiz sans répétition tant que la réserve n'est pas épuisée.
-- Une fois répondues, les réponses sont définitives (pas de modification, pas de « rejouer ») ;
-- on ne peut répondre qu'au quiz du jour.

alter table public.quiz_sessions add column if not exists day date;
alter table public.quiz_sessions add column if not exists question_ids uuid[];
create unique index if not exists quiz_sessions_daily on public.quiz_sessions (couple_id, quiz_id, day) where day is not null;

create or replace function public.couple_day(p_couple uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce(timezone, 'Europe/Paris'))::date from public.couples where id = p_couple
$$;

-- Nombre de questions d'une partie : celles tirées pour le jour, sinon tout le quiz (anciennes parties)
create or replace function public.quiz_session_total(p_session uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(cardinality(s.question_ids), (select count(*)::int from public.quiz_questions q where q.quiz_id = s.quiz_id))
  from public.quiz_sessions s where s.id = p_session
$$;

create or replace function public.ensure_daily_quiz(p_couple uuid, p_quiz uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_day date := public.couple_day(p_couple); v_id uuid; v_ids uuid[];
begin
  select id into v_id from public.quiz_sessions where couple_id = p_couple and quiz_id = p_quiz and day = v_day;
  if v_id is not null then return v_id; end if;
  -- jamais posée d'abord, sinon posée il y a le plus longtemps ; ordre propre au couple et au jour
  select array_agg(id) into v_ids from (
    select q.id from public.quiz_questions q
     where q.quiz_id = p_quiz
     order by (select max(s.day) from public.quiz_sessions s
                where s.couple_id = p_couple and s.quiz_id = p_quiz and q.id = any(s.question_ids)) nulls first,
              md5(p_couple::text || v_day::text || q.id::text)
     limit 5) t;
  if v_ids is null then return null; end if;
  insert into public.quiz_sessions (couple_id, quiz_id, started_by, day, question_ids)
    values (p_couple, p_quiz, auth.uid(), v_day, v_ids)
    on conflict (couple_id, quiz_id, day) where day is not null do nothing
    returning id into v_id;
  if v_id is null then
    select id into v_id from public.quiz_sessions where couple_id = p_couple and quiz_id = p_quiz and day = v_day;
  end if;
  return v_id;
end $$;
revoke execute on function public.ensure_daily_quiz(uuid, uuid) from public, authenticated, anon;

-- Les quiz du jour accessibles au couple : [{quiz_id, session_id}]
create or replace function public.daily_quizzes() returns json
language plpgsql security definer set search_path = public as $$
declare v_couple uuid := public.my_couple_id(); v_spice text := public.couple_spice_level(); out json;
begin
  if v_couple is null or (select count(*) from public.couple_members where couple_id = v_couple) < 2 then return '[]'::json; end if;
  select coalesce(json_agg(json_build_object('quiz_id', z.id, 'session_id', public.ensure_daily_quiz(v_couple, z.id)) order by spice_rank(z.spice_level)), '[]'::json)
    into out
    from public.quizzes z
   where z.active and (z.spice_level = 'soft' or (v_spice is not null and spice_rank(z.spice_level) <= spice_rank(v_spice)));
  return out;
end $$;

-- start_quiz renvoie désormais la partie du jour (jamais une nouvelle partie le même jour)
create or replace function public.start_quiz(p_quiz uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_couple uuid := public.my_couple_id(); q public.quizzes;
begin
  if v_couple is null then raise exception 'not_paired'; end if;
  select * into q from public.quizzes where id = p_quiz and active;
  if q.id is null then raise exception 'invalid_move'; end if;
  if q.spice_level <> 'soft' and (public.couple_spice_level() is null or spice_rank(q.spice_level) > spice_rank(public.couple_spice_level())) then
    raise exception 'premium_required';
  end if;
  return public.ensure_daily_quiz(v_couple, p_quiz);
end $$;

-- Réponses : seulement pour le quiz du jour et ses questions ; une fois données, définitives.
create or replace function public.quiz_answer_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.quiz_sessions;
begin
  select * into s from public.quiz_sessions where id = new.session_id;
  if s.id is null or s.day is null or s.day <> public.couple_day(s.couple_id) or not (new.question_id = any(s.question_ids)) then
    raise exception 'quiz_closed';
  end if;
  return new;
end $$;
drop trigger if exists quiz_answers_guard on public.quiz_answers;
create trigger quiz_answers_guard before insert on public.quiz_answers
  for each row execute function public.quiz_answer_guard();

create or replace function public.reveal_quiz() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_score numeric;
begin
  perform 1 from public.quiz_sessions where id = new.session_id for update;
  v_total := public.quiz_session_total(new.session_id);
  if (select count(*) from public.quiz_answers where session_id = new.session_id) < v_total * 2 then
    return new;
  end if;
  select coalesce(sum(
           (select count(*) from (select unnest(a.choices) intersect select unnest(b.choices)) i)::numeric
         / nullif((select count(*) from (select unnest(a.choices) union select unnest(b.choices)) u), 0)
         ), 0)
    into v_score
    from public.quiz_answers a
    join public.quiz_answers b on b.session_id = a.session_id and b.question_id = a.question_id and b.user_id > a.user_id
   where a.session_id = new.session_id;
  update public.quiz_sessions
     set status = 'revealed', match_score = round(100.0 * v_score / greatest(v_total, 1))
   where id = new.session_id;
  return new;
end $$;

create or replace function public.quiz_partner_done(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.quiz_answers a where a.session_id = s.id and a.user_id <> auth.uid())
       >= public.quiz_session_total(s.id)
  from public.quiz_sessions s where s.id = p_session and s.couple_id = public.my_couple_id()
$$;
