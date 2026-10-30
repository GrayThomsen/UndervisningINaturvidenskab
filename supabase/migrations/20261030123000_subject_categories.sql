alter table public.categories
  drop constraint categories_kind_check;

alter table public.categories
  add constraint categories_kind_check check (kind in ('theme', 'subject', 'type'));

insert into public.categories (kind, name)
select distinct 'subject', subject
from public.documents
cross join lateral unnest(documents.subjects) as subject_names(subject)
where subject <> ''
on conflict (kind, name) do nothing;

alter table public.documents
  add column subject_id bigint references public.categories(id) on delete set null;

update public.documents as document
set subject_id = category.id
from public.categories as category
where category.kind = 'subject'
  and category.name = document.subjects[1];

update public.documents as document
set tags = array(
  select distinct value
  from unnest(document.tags || array(
    select value
    from unnest(document.subjects) with ordinality as legacy(value, position)
    where position > 1
  )) as tag_values(value)
  where value <> ''
)
where cardinality(document.subjects) > 1;

update public.documents as document
set subjects = array[category.name]
from public.categories as category
where document.subject_id = category.id;

create index documents_subject_idx on public.documents (subject_id);
