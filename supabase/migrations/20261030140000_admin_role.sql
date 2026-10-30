-- Restrict writes to users with app_metadata.role = 'admin' (instead of any logged-in user).
--
-- BEFORE running this, give your admin account the role, otherwise you lock yourself out.
-- Run in the SQL editor (the dashboard has no field for it), replacing the e-mail:
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'
--   where email = 'din@email.dk';
-- Then log out and in again so the new role is included in the login token.

create function public.is_admin()
returns boolean language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

drop policy "categories managed by admin" on public.categories;
create policy "categories managed by admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy "admin reads all documents" on public.documents;
create policy "admin reads all documents" on public.documents
  for select to authenticated using (public.is_admin());

drop policy "admin writes documents" on public.documents;
create policy "admin writes documents" on public.documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy "admin uploads files" on storage.objects;
create policy "admin uploads files" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents' and public.is_admin());

drop policy "admin updates files" on storage.objects;
create policy "admin updates files" on storage.objects
  for update to authenticated using (bucket_id = 'documents' and public.is_admin());

drop policy "admin deletes files" on storage.objects;
create policy "admin deletes files" on storage.objects
  for delete to authenticated using (bucket_id = 'documents' and public.is_admin());
