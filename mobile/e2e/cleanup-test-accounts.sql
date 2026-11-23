-- Supprime uniquement les comptes de test e2e (adresses @example.com) et leurs couples.
delete from public.couples where id in (
  select m.couple_id from public.couple_members m join auth.users u on u.id = m.user_id where u.email like '%@example.com');
delete from auth.users where email like '%@example.com';
select (select count(*) from auth.users) users, (select count(*) from public.couples) couples,
       (select count(*) from auth.users where email like '%@example.com') test_left;
