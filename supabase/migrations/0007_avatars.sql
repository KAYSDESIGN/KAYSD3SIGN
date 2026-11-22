-- Photos de profil : bucket privé « avatars », un dossier par personne (<user_id>/avatar.jpg).
-- On écrit seulement dans son dossier ; on lit le sien et celui de son/sa partenaire.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_write on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;
create policy avatars_read on storage.objects for select using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text
                             or (storage.foldername(name))[1] = public.my_partner_id()::text));
create policy avatars_write on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
