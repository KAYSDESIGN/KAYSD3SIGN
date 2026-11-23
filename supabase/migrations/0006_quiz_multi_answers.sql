-- Quiz à réponses multiples : chaque réponse est une liste de choix ; le score d'une question
-- est la part de choix communs (réponses communes / réponses données), moyenné sur le quiz.
alter table public.quiz_answers add column if not exists choices int[] not null default '{}';
update public.quiz_answers set choices = array[choice] where choices = '{}' and choice is not null;
alter table public.quiz_answers alter column choice drop not null;
alter table public.quiz_answers drop constraint if exists quiz_answers_has_choice;
alter table public.quiz_answers add constraint quiz_answers_has_choice check (cardinality(choices) between 1 and 10);

create or replace function public.reveal_quiz() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_score numeric;
begin
  perform 1 from public.quiz_sessions where id = new.session_id for update;
  select count(*) into v_total from public.quiz_questions q
    join public.quiz_sessions s on s.quiz_id = q.quiz_id where s.id = new.session_id;
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
