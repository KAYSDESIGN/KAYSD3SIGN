-- Envies secrètes du jour : chaque jour (fuseau du couple), 5 envies Épicées / Brûlantes tirées pour
-- le couple, les mêmes pour les deux. Les matchs ne portent que sur ces 5 et repartent de zéro chaque jour.

create table if not exists public.daily_desires (
  couple_id uuid not null references public.couples(id) on delete cascade,
  day date not null,
  desire_ids uuid[] not null,
  created_at timestamptz not null default now(),
  primary key (couple_id, day)
);
alter table public.daily_desires enable row level security;
drop policy if exists daily_desires_read on public.daily_desires;
create policy daily_desires_read on public.daily_desires for select using (couple_id = public.my_couple_id());

create or replace function public.ensure_daily_desires(p_couple uuid) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare v_day date := public.couple_day(p_couple); v_spice text; v_ids uuid[];
begin
  select desire_ids into v_ids from public.daily_desires where couple_id = p_couple and day = v_day;
  if v_ids is not null then return v_ids; end if;
  select case when bool_and(p.age_confirmed_at is not null) and count(*) = 2
              then (array['soft','spicy','hot'])[min(spice_rank(p.spice_level))] end
    into v_spice
    from public.couple_members m join public.profiles p on p.id = m.user_id where m.couple_id = p_couple;
  if v_spice is null then return '{}'; end if;
  -- Épicé et Brûlant seulement (Doux uniquement si le couple a choisi Doux) ; jamais tirée d'abord
  select array_agg(id) into v_ids from (
    select d.id from public.desires d
     where d.active and d.locale = 'fr'
       and (case when v_spice = 'soft' then d.spice_level = 'soft'
                 else d.spice_level in ('spicy','hot') and spice_rank(d.spice_level) <= spice_rank(v_spice) end)
     order by (select max(x.day) from public.daily_desires x where x.couple_id = p_couple and d.id = any(x.desire_ids)) nulls first,
              md5(p_couple::text || v_day::text || d.id::text)
     limit 5) t;
  if v_ids is null then return '{}'; end if;
  -- une envie qui revient repart de zéro
  delete from public.desire_answers where couple_id = p_couple and desire_id = any(v_ids);
  insert into public.daily_desires (couple_id, day, desire_ids) values (p_couple, v_day, v_ids)
    on conflict (couple_id, day) do nothing;
  select desire_ids into v_ids from public.daily_desires where couple_id = p_couple and day = v_day;
  return v_ids;
end $$;
revoke execute on function public.ensure_daily_desires(uuid) from public, authenticated, anon;

-- Les 5 envies du jour, avec ma réponse et l'heure de minuit (renouvellement)
create or replace function public.get_daily_desires() returns json
language plpgsql security definer set search_path = public as $$
declare v_couple uuid := public.my_couple_id(); v_ids uuid[];
begin
  if v_couple is null or (select count(*) from public.couple_members where couple_id = v_couple) < 2 then return '[]'::json; end if;
  v_ids := public.ensure_daily_desires(v_couple);
  return (select coalesce(json_agg(json_build_object(
            'id', d.id, 'category', d.category, 'spice_level', d.spice_level, 'body', d.body, 'is_premium', false,
            'answer', (select a.answer from public.desire_answers a where a.desire_id = d.id and a.user_id = auth.uid()),
            'answered_at', (select a.created_at from public.desire_answers a where a.desire_id = d.id and a.user_id = auth.uid())
          ) order by t.ord), '[]'::json)
          from unnest(v_ids) with ordinality t(id, ord) join public.desires d on d.id = t.id);
end $$;

-- Matchs : uniquement les oui communs parmi les 5 envies du jour
create or replace function public.mutual_desires()
returns table (desire_id uuid, body text, category text, matched_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.body, d.category, greatest(a.updated_at, b.updated_at)
  from public.daily_desires dd
  join public.desire_answers a on a.couple_id = dd.couple_id and a.desire_id = any(dd.desire_ids) and a.user_id = auth.uid()
  join public.desire_answers b on b.couple_id = dd.couple_id and b.desire_id = a.desire_id and b.user_id <> a.user_id
  join public.desires d on d.id = a.desire_id
  where dd.couple_id = public.my_couple_id()
    and dd.day = public.couple_day(dd.couple_id)
    and a.answer = 'yes' and b.answer = 'yes'
$$;

-- On ne répond qu'aux envies du jour
create or replace function public.desire_answer_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.daily_desires dd
                  where dd.couple_id = new.couple_id and dd.day = public.couple_day(new.couple_id)
                    and new.desire_id = any(dd.desire_ids)) then
    raise exception 'quiz_closed';
  end if;
  return new;
end $$;
drop trigger if exists desire_answers_guard on public.desire_answers;
create trigger desire_answers_guard before insert or update on public.desire_answers
  for each row execute function public.desire_answer_guard();
