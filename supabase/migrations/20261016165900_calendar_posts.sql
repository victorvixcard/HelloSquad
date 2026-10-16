-- S2a item 4 — calendário editorial persistente do Otto (delivery 04.02, Documento Mestre Anexo A:
-- "organiza datas, canais, formatos, temas e responsáveis em um calendário persistente").
-- Cada post nasce da versão da 04.02 que o propôs, como rascunho (`draft`): material produzido não é
-- material aprovado (§8). Quando a pessoa aprova a versão, os posts dela entram na pauta (`planned`) e os
-- de uma versão aprovada antes, do mesmo calendário, saem (`cancelled`). Versão nova antes da aprovação
-- troca os rascunhos (o worker apaga os da versão anterior). Trabalho cancelado cancela os rascunhos.
-- `scheduled` e `published` chegam com a publicação autorizada (Fase 3).
-- Leitura para todo membro do workspace (RLS forçada); escrita só pelo worker do squad e pelos gatilhos.
-- A conversa abre um post como objeto pelo id (context_type `calendar_post`, migração seguinte).

create type public.calendar_post_status as enum ('draft', 'planned', 'scheduled', 'published', 'cancelled');

create table public.calendar_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scheduled_on date not null,
  scheduled_time time,
  channel text not null,
  format text not null,
  theme text not null,
  owner_agent_id public.agent_id not null default 'otto',
  status public.calendar_post_status not null default 'draft',
  notes text,
  work_item_id uuid,
  delivery_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_posts_workspace_id_id_key unique (workspace_id, id),
  constraint calendar_posts_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete set null (work_item_id),
  constraint calendar_posts_version_fk foreign key (workspace_id, delivery_version_id)
    references public.delivery_versions (workspace_id, id) on delete set null (delivery_version_id),
  constraint calendar_posts_channel_format check (channel ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint calendar_posts_format_format check (format ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint calendar_posts_theme_length check (char_length(btrim(theme)) between 1 and 200),
  constraint calendar_posts_notes_length check (char_length(notes) <= 500)
);
comment on table public.calendar_posts is 'Calendário editorial (04.02): data, canal, formato, tema, responsável e estado. Rascunho até a versão ser aprovada.';
comment on column public.calendar_posts.channel is 'Canal (id: instagram, facebook, whatsapp, gbp, site, email…); o web traduz.';
comment on column public.calendar_posts.format is 'Formato (id: post, carousel, reels, stories, status, article, email…); o web traduz.';
comment on column public.calendar_posts.owner_agent_id is 'Responsável no squad (o Otto escreve; a Kaia faz a peça).';
comment on column public.calendar_posts.delivery_version_id is 'Versão da 04.02 que propôs o post.';

create index calendar_posts_workspace_day_idx on public.calendar_posts (workspace_id, scheduled_on);
create index calendar_posts_work_item_idx on public.calendar_posts (work_item_id) where work_item_id is not null;
create index calendar_posts_version_idx on public.calendar_posts (delivery_version_id) where delivery_version_id is not null;

create trigger calendar_posts_set_updated_at
  before update on public.calendar_posts
  for each row execute function app.set_updated_at();

alter table public.calendar_posts enable row level security;
alter table public.calendar_posts force row level security;
revoke all on table public.calendar_posts from public, anon, authenticated, service_role;
grant select on table public.calendar_posts to authenticated;
create policy calendar_posts_select_member on public.calendar_posts for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

-- Versão aprovada: os rascunhos dela entram na pauta; os posts de outra versão aprovada antes, do mesmo
-- trabalho, saem.
create function app.calendar_posts_on_version_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_work_item_id uuid;
begin
  select p.work_item_id into v_work_item_id
  from public.calendar_posts p
  where p.delivery_version_id = new.id and p.workspace_id = new.workspace_id
  limit 1;
  if v_work_item_id is null then
    return new;
  end if;

  update public.calendar_posts p
  set status = 'cancelled'
  where p.workspace_id = new.workspace_id and p.work_item_id = v_work_item_id
    and p.delivery_version_id is distinct from new.id and p.status in ('draft', 'planned');

  update public.calendar_posts p
  set status = 'planned'
  where p.workspace_id = new.workspace_id and p.delivery_version_id = new.id and p.status = 'draft';
  return new;
end;
$$;

create trigger delivery_versions_calendar_approved
  after update of status on public.delivery_versions
  for each row
  when (new.status = 'approved' and old.status is distinct from 'approved')
  execute function app.calendar_posts_on_version_approved();

-- Trabalho cancelado: o que ainda era proposta sai do calendário.
create function app.calendar_posts_on_work_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calendar_posts p
  set status = 'cancelled'
  where p.workspace_id = new.workspace_id and p.work_item_id = new.id and p.status = 'draft';
  return new;
end;
$$;

create trigger work_items_calendar_cancelled
  after update of status on public.work_items
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function app.calendar_posts_on_work_cancelled();

revoke all on function
  app.calendar_posts_on_version_approved(),
  app.calendar_posts_on_work_cancelled()
  from public, anon, authenticated, service_role;
