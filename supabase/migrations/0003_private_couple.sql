-- Déploiement privé (un seul couple, pas de paiement) : tout couple créé est Premium d'office.
-- À supprimer avant une publication publique : Premium passera alors par RevenueCat.
create or replace function public.private_premium() returns trigger
language plpgsql as $$
begin
  new.premium_until := 'infinity';
  new.premium_product := 'lifetime';
  return new;
end $$;
drop trigger if exists couples_private_premium on public.couples;
create trigger couples_private_premium before insert on public.couples
  for each row execute function public.private_premium();
