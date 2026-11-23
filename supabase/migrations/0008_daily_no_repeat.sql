-- Cartes du jour : plus de répétitions. On tire une carte jamais vue par le couple,
-- sinon celle vue il y a le plus longtemps.
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
  select pr.id into v_prompt from public.prompts pr
   where pr.kind = p_slot and pr.active
     and (case when has_exact then pr.spice_level = p_spice else spice_rank(pr.spice_level) <= spice_rank(p_spice) end)
   -- jamais vue d'abord, sinon celle vue il y a le plus longtemps ; ordre propre à chaque couple
   order by (select max(h.day) from public.daily_assignments h
              where h.couple_id = p_couple and h.prompt_id = pr.id and h.day <> p_day) nulls first,
            md5(p_couple::text || p_day::text || p_slot || pr.id::text)
   limit 1;
  if v_prompt is null then return null; end if;
  insert into public.daily_assignments (couple_id, day, slot, prompt_id)
    values (p_couple, p_day, p_slot, v_prompt)
    on conflict (couple_id, day, slot) do update set prompt_id = excluded.prompt_id
    returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.ensure_assignment(uuid, date, text, text) from public, authenticated, anon;
