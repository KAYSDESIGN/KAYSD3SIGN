-- 1. Chat : envoi de photos (stockées dans couple-media/<couple>/chat/…, visibles du couple seulement).
alter table public.messages add column if not exists media_path text;
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text','nudge','affection','photo'));
alter table public.messages drop constraint if exists photo_has_media;
alter table public.messages add constraint photo_has_media check (kind <> 'photo' or media_path is not null);

-- 2. Jeux : une seule partie en cours PAR JEU (un morpion et un quatre d'affilée peuvent coexister).
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
  if exists (select 1 from public.games where couple_id = v_couple and game_type = p_type and status = 'active') then
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


notify pgrst, 'reload schema';
