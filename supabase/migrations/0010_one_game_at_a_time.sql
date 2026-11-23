-- Jeux : une seule partie à la fois pour le couple (Morpion du cœur et Quatre d'affilée confondus).
-- On ne peut relancer qu'une fois la partie en cours terminée ou abandonnée.
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
  perform 1 from public.couples where id = v_couple for update;  -- deux lancements simultanés : un seul passe
  if exists (select 1 from public.games where couple_id = v_couple and status = 'active') then
    raise exception 'game_in_progress';
  end if;
  insert into public.games (couple_id, game_type, state, turn_user_id)
    values (v_couple, p_type,
            json_build_object('cols', v_cols, 'rows', v_rows, 'players', json_build_array(auth.uid(), public.my_partner_id()),
                              'board', (select json_agg(null::text) from generate_series(1, v_cols * v_rows)))::jsonb,
            auth.uid())
    returning id into v_id;
  return v_id;
end $$;


-- Abandonner : la partie se termine et l'autre gagne. Évite de rester bloqué si l'un ne joue plus.
create or replace function public.abandon_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games; other uuid;
begin
  select * into g from public.games where id = p_game and couple_id = public.my_couple_id() for update;
  if g.id is null or g.status <> 'active' then raise exception 'invalid_move'; end if;
  select (x)::uuid into other from jsonb_array_elements_text(g.state->'players') x where x <> auth.uid()::text;
  update public.games set status = 'abandoned', winner_id = other, turn_user_id = null, version = g.version + 1 where id = g.id;
end $$;
