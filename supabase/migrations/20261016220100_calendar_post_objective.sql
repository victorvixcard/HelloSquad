-- S2f (item extra da A2b §5.2): o objetivo de cada post do calendário editorial (04.02) passa a ficar no próprio
-- post, como o tema e o canal. As linhas que já existem recebem o objetivo do post equivalente (mesma data, canal e
-- tema) na versão que as propôs.

alter table public.calendar_posts add column objective text;
alter table public.calendar_posts
  add constraint calendar_posts_objective_length check (char_length(objective) <= 2000);
comment on column public.calendar_posts.objective is 'Objetivo do post na entrega 04.02 que o propôs.';

update public.calendar_posts p
set objective = e ->> 'objetivo'
from public.delivery_versions v
cross join lateral jsonb_array_elements(coalesce(v.content -> 'posts', '[]'::jsonb)) e
where v.workspace_id = p.workspace_id
  and v.id = p.delivery_version_id
  and p.objective is null
  and jsonb_typeof(v.content -> 'posts') = 'array'
  and (e ->> 'data')::date = p.scheduled_on
  and e ->> 'canal' = p.channel
  and e ->> 'tema' = p.theme;
