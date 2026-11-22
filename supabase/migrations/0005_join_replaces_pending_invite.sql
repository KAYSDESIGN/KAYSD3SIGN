-- Rejoindre avec un code annule sa propre invitation en attente (couple où l'on est seul·e).
-- Cas réel depuis qu'on peut visiter l'app avant d'inviter : les deux ont pu générer un code.
create or replace function public.join_couple(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_couple uuid;
  v_mine uuid := public.my_couple_id();
begin
  select id into v_couple from public.couples
    where invite_code = upper(p_code) and invite_expires_at > now()
    for update;
  if v_couple is null then raise exception 'invalid_or_expired_code'; end if;
  if v_mine is not null then
    if v_mine = v_couple then raise exception 'invalid_or_expired_code'; end if;  -- son propre code
    if (select count(*) from public.couple_members where couple_id = v_mine) > 1 then
      raise exception 'already_paired';
    end if;
    delete from public.couples where id = v_mine;  -- invitation en attente, rien de partagé
  end if;
  insert into public.couple_members (couple_id, user_id) values (v_couple, auth.uid());
  update public.couples set invite_code = null, invite_expires_at = null where id = v_couple;
  return v_couple;
end $$;
