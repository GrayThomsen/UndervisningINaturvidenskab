-- UIN schema for a fresh database. Existing databases should apply migrations in supabase/migrations.

-- Admin-editable categories: themes, subjects and material types
create table public.categories (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('theme', 'subject', 'type')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (kind, name)
);

-- array_to_string is only STABLE; generated columns need IMMUTABLE. Safe for text[].
create function public.immutable_array_to_string(text[], text)
returns text language sql immutable parallel safe
as $$ select array_to_string($1, $2) $$;

create table public.documents (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null default '',
  theme_id bigint references public.categories(id) on delete set null,
  subject_id bigint references public.categories(id) on delete set null,
  type_id bigint references public.categories(id) on delete set null,
  subjects text[] not null default '{}',
  -- Free text, fx '7', '7-9', 'Gymnasie'
  grade text not null default '',
  tags text[] not null default '{}',
  file_path text not null,
  file_name text not null,
  file_size bigint,
  mime text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('danish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(public.immutable_array_to_string(subjects, ' '), '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(public.immutable_array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(description, '')), 'C')
  ) stored
);

create index documents_search_idx on public.documents using gin (search);
create index documents_theme_idx on public.documents (theme_id);
create index documents_subject_idx on public.documents (subject_id);
create index documents_type_idx on public.documents (type_id);

-- Row Level Security: public reads published docs, only users with app_metadata role 'admin' write.
-- app_metadata can only be set server-side (Supabase dashboard / service role), never by the user.
create function public.is_admin()
returns boolean language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

alter table public.categories enable row level security;
alter table public.documents enable row level security;

create policy "categories readable by all" on public.categories
  for select using (true);
create policy "categories managed by admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "published documents readable by all" on public.documents
  for select using (published = true);
create policy "admin reads all documents" on public.documents
  for select to authenticated using (public.is_admin());
create policy "admin writes documents" on public.documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public storage bucket for files
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', true, 52428800)
on conflict (id) do nothing;

create policy "admin uploads files" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents' and public.is_admin());
create policy "admin updates files" on storage.objects
  for update to authenticated using (bucket_id = 'documents' and public.is_admin());
create policy "admin deletes files" on storage.objects
  for delete to authenticated using (bucket_id = 'documents' and public.is_admin());

-- Starter categories (editable from the admin page)
insert into public.categories (kind, name) values
  ('theme', 'Fysik'), ('theme', 'Kemi'), ('theme', 'Biologi'), ('theme', 'Geografi'),
  ('type', 'Undervisningsforløb'), ('type', 'Arbejdsark'), ('type', 'Vejledning');
