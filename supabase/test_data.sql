-- Test cards for checking the layout. Run in the Supabase SQL editor.
-- Downloads will not work (no real files). Remove again with the last statement.

insert into public.documents
  (title, description, theme_id, subject_id, type_id, subjects, grade, tags,
   file_path, file_name, file_size, mime, published)
select
  '[TEST] Materiale ' || n,
  case when n % 4 = 0 then ''
       else 'Dette er en testbeskrivelse til materiale ' || n
            || '. Den bruges kun til at se, hvordan kortene ser ud i listen.' end,
  (select id from public.categories where kind = 'theme' order by random() + n * 0 limit 1),
  s.id,
  (select id from public.categories where kind = 'type' order by random() + n * 0 limit 1),
  case when s.name is null then '{}' else array[s.name] end,
  (array['5', '7-9', '8', 'Gymnasie', ''])[1 + n % 5],
  case when n % 3 = 0 then '{}' else array['test', 'emne' || (n % 7)] end,
  'test/placeholder.txt',
  'test-' || n || '.pdf',
  (n * 37000)::bigint,
  'application/pdf',
  true
from generate_series(1, 50) as n
left join lateral (
  select id, name from public.categories where kind = 'subject' order by random() + n * 0 limit 1
) as s on true;

-- Remove the test cards again:
-- delete from public.documents where title like '[TEST]%';
