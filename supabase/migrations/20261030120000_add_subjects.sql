alter table public.documents
  add column subjects text[] not null default '{}';

drop index public.documents_search_idx;
alter table public.documents drop column search;

alter table public.documents
  add column search tsvector generated always as (
    setweight(to_tsvector('danish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(public.immutable_array_to_string(subjects, ' '), '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(public.immutable_array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(description, '')), 'C')
  ) stored;

create index documents_search_idx on public.documents using gin (search);
