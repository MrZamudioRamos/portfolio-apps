-- 009_photos_storage.sql
-- Storage bucket for synced photos (plants, diary entries, gardens). Without
-- this, photoUri stayed a local file:// path and never synced, so photos were
-- lost on reinstall / new device.
--
-- Layout: photos are stored at  <user_id>/<uuid>.<ext>  so RLS can scope writes
-- to the owner's folder. Bucket is public-read (garden photos, low sensitivity)
-- so the stored public URL loads directly in <Image>.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Public read (bucket is public, but be explicit).
drop policy if exists "photos_read" on storage.objects;
create policy "photos_read" on storage.objects
  for select using (bucket_id = 'photos');

-- Authenticated users may write only inside their own <user_id>/ folder.
drop policy if exists "photos_insert_own" on storage.objects;
create policy "photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_update_own" on storage.objects;
create policy "photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_delete_own" on storage.objects;
create policy "photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
