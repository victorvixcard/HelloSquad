-- SA1 — Super Admin: identidade de plataforma, papel privilegiado só nas rotas /admin/*, tabelas de
-- operação (catálogo, recargas, regras de negócio, referências, preços de modelo, regras por tarefa, saúde
-- dos provedores) e as views de consumo, qualidade e fila. Plano: docs/SUPER_ADMIN.md §3–§4 e
-- docs/PLANO_DE_ACAO_SA.md (linha SA1).
--
-- Segurança:
--   * Super Admin é papel de plataforma (`platform_admins`), fora de `memberships`.
--   * `hellosquad_admin` é NOLOGIN, NOINHERIT e sem BYPASSRLS. A API (`hellosquad_api`) só o assume com
--     SET LOCAL ROLE dentro da transação de uma rota /admin/*, depois de conferir `app.is_platform_admin()`.
--     Toda leitura passa por políticas `to hellosquad_admin using (app.is_platform_admin())`: o papel sem o
--     JWT de um Super Admin não lê nada.
--   * `anon`, `authenticated` e `service_role` não recebem GRANT em nada daqui: a Data API não expõe o SA.
--   * Escrita do SA (fatias seguintes) só por `app.admin_audit`, que grava `audit_events`.
--   * Preço e créditos por último (dono, 16/10): tudo que é valor nasce provisório e fora de venda.

-- ---------------------------------------------------------------------------------------------------
-- Papel do painel
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_role pg_catalog.pg_roles;
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'hellosquad_admin') then
    create role hellosquad_admin with nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
  select * into v_role from pg_catalog.pg_roles where rolname = 'hellosquad_admin';
  if v_role.rolsuper or v_role.rolbypassrls or v_role.rolreplication or v_role.rolcreaterole
     or v_role.rolcreatedb or v_role.rolinherit or v_role.rolcanlogin then
    raise exception 'hellosquad_admin existe com atributos inesperados; corrija com um superusuário antes de migrar.';
  end if;
end;
$$;

grant hellosquad_admin to hellosquad_api with inherit false, set true;
grant usage on schema app to hellosquad_admin;

-- ---------------------------------------------------------------------------------------------------
-- Quem é Super Admin
-- ---------------------------------------------------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mfa_enforced boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.platform_admins is 'Super Admin da plataforma (docs/SUPER_ADMIN.md §1). Fora de memberships: não é papel de workspace.';
comment on column public.platform_admins.mfa_enforced is 'Verificação em duas etapas exigida. Desligada até a Fase 5; o painel avisa enquanto estiver false.';
create index platform_admins_created_by_idx on public.platform_admins (created_by);

create function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  )
$$;
comment on function app.is_platform_admin() is 'true quando o usuário do JWT da transação está em platform_admins.';
revoke all on function app.is_platform_admin() from public, anon, service_role;
grant execute on function app.is_platform_admin() to authenticated, hellosquad_admin;

-- Escrita do painel (SA3a em diante): todo gesto do Super Admin vira audit_events, com o papel e o
-- motivo. Nesta fatia só a rota de detalhe da conta grava (acesso de leitura do suporte).
create function app.admin_audit(
  p_action text,
  p_workspace_id uuid default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin grava pelo painel.';
  end if;
  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', (select auth.uid())::text, p_action, p_entity_type, p_entity_id,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('platform_admin', true)
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function app.admin_audit(text, uuid, text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function app.admin_audit(text, uuid, text, text, jsonb) to hellosquad_admin;

-- Membros e nomes vêm de auth.users, que nenhum papel da API lê: só o Super Admin, por estas funções.
create function app.admin_workspace_members(p_workspace_id uuid)
returns table (
  user_id uuid, email text, full_name text, role public.workspace_role,
  member_since timestamptz, last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin lê membros de qualquer conta.';
  end if;
  return query
    select m.user_id, u.email::text, (u.raw_user_meta_data ->> 'full_name')::text, m.role, m.created_at, u.last_sign_in_at
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = p_workspace_id
    order by case m.role when 'owner' then 0 when 'admin' then 1 when 'editor' then 2 else 3 end, m.created_at;
end;
$$;
revoke all on function app.admin_workspace_members(uuid) from public, anon, authenticated, service_role;
grant execute on function app.admin_workspace_members(uuid) to hellosquad_admin;

create function app.admin_user_labels(p_user_ids uuid[])
returns table (user_id uuid, email text, full_name text, is_platform_admin boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin lê nomes de usuários.';
  end if;
  return query
    select u.id, u.email::text, (u.raw_user_meta_data ->> 'full_name')::text,
           exists (select 1 from public.platform_admins pa where pa.user_id = u.id)
    from auth.users u
    where u.id = any (p_user_ids);
end;
$$;
revoke all on function app.admin_user_labels(uuid[]) from public, anon, authenticated, service_role;
grant execute on function app.admin_user_labels(uuid[]) to hellosquad_admin;

-- ---------------------------------------------------------------------------------------------------
-- Sessão de suporte ("entrar no ambiente do cliente"): a escrita entra na SA6; aqui só a tabela
-- ---------------------------------------------------------------------------------------------------

create table public.support_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.platform_admins (user_id) on delete restrict,
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  reason text not null,
  mode text not null default 'read_only',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint support_access_log_reason_length check (char_length(btrim(reason)) between 10 and 500),
  constraint support_access_log_mode_values check (mode in ('read_only')),
  constraint support_access_log_expires_after_start check (expires_at > started_at),
  constraint support_access_log_ended_after_start check (ended_at is null or ended_at >= started_at)
);
comment on table public.support_access_log is 'Sessões de suporte no ambiente do cliente: motivo obrigatório, tempo limitado, também em audit_events. Só leitura até o dono decidir (pergunta 1 do SA0).';
create index support_access_log_workspace_idx on public.support_access_log (workspace_id, started_at desc);
create index support_access_log_admin_idx on public.support_access_log (admin_id, started_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Venda: planos e recargas (valores provisórios, nada à venda)
-- ---------------------------------------------------------------------------------------------------

alter table public.plans add column for_sale boolean not null default false;
comment on column public.plans.for_sale is '"À venda" (SUPER_ADMIN.md §2). Desmarcado até o dono aprovar preço (16/10: preço e créditos por último).';

-- Identidade das recargas avulsas. Valores e versões ficam em topup_packs (S2e), que a cobrança já usa:
-- topup_versions é a leitura versionada dessa mesma tabela, para não haver duas fontes de preço.
create table public.topups (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  for_sale boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  constraint topups_slug_key unique (slug),
  constraint topups_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint topups_name_length check (char_length(btrim(name)) between 1 and 80)
);
comment on table public.topups is 'Recargas avulsas (SPOT): nome e "à venda". Créditos, preço e validade versionados em topup_packs.';
comment on column public.topups.for_sale is '"À venda". Desmarcado até o dono aprovar preço (16/10).';

insert into public.topups (slug, name, note)
values ('recarga-50', 'Recarga 50', 'Valores provisórios (S2e); nada à venda.');

create view public.topup_versions
with (security_invoker = true)
as
select t.id as topup_id,
       t.slug,
       t.name,
       p.id as pack_id,
       row_number() over (partition by p.slug order by p.valid_from, p.id)::integer as version,
       p.credits,
       p.validity_days,
       p.amount,
       p.currency,
       p.provisional,
       p.approved_commercially,
       t.for_sale,
       p.valid_from,
       p.created_at
from public.topup_packs p
join public.topups t on t.slug = p.slug;
comment on view public.topup_versions is 'Versões das recargas: topup_packs (S2e) com o nome e o "à venda" de topups.';

-- ---------------------------------------------------------------------------------------------------
-- Catálogo das 46 deliveries (Documento Mestre, Anexo A; handoff V4.6)
-- ---------------------------------------------------------------------------------------------------

create table public.delivery_catalog (
  delivery_type text primary key,
  agent_id public.agent_id not null,
  name text not null,
  result text not null,
  depth public.delivery_depth not null,
  depth_source text not null default 'inferred',
  integrations text,
  prerequisites text,
  catalog_status text not null,
  homologation_status text not null default 'not_started',
  for_sale boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint delivery_catalog_type_format check (
    delivery_type ~ '^[0-9]{2}\.[0-9]{2}$' and app.delivery_type_agent(delivery_type) = agent_id
  ),
  constraint delivery_catalog_depth_source_values check (depth_source in ('inferred', 'confirmed')),
  constraint delivery_catalog_homologation_values check (
    homologation_status in ('not_started', 'in_homologation', 'awaiting_integration', 'awaiting_engine', 'homologated')
  ),
  constraint delivery_catalog_sort_order_key unique (sort_order)
);
comment on table public.delivery_catalog is 'As 46 deliveries dos sete agentes. Preço em créditos versionado em delivery_prices.';
comment on column public.delivery_catalog.depth_source is 'inferred = profundidade inferida no protótipo SA0 (pergunta 6 ao dono, aberta).';
comment on column public.delivery_catalog.catalog_status is 'Estado no catálogo do handoff ("A validar").';
comment on column public.delivery_catalog.homologation_status is 'in_homologation = skill escrita em squad/, aguardando validação do dono; awaiting_engine = Kaia, aguarda o motor de imagem do dono; homologated só com o dono.';
comment on column public.delivery_catalog.for_sale is '"À venda". Desmarcado: preço aprovado e homologação concluída vêm antes (pergunta 5 do SA0).';
create index delivery_catalog_agent_idx on public.delivery_catalog (agent_id, sort_order);

insert into public.delivery_catalog (
  delivery_type, agent_id, name, result, depth, integrations, prerequisites, catalog_status, homologation_status, sort_order
) values
  ('01.01', 'nexo', 'Qualificar pedido e organizar briefing', 'Recebe objetivo, contexto e restrições; encaminha ao especialista certo sem perda de informação.', 'orientar', 'LLM API (escolher) + Supabase Auth/Postgres + Memória', 'Orquestração e memória compartilhada', 'A validar', 'in_homologation', 1),
  ('01.02', 'nexo', 'Coordenar projeto com múltiplos agentes', 'Uma campanha vira projeto único, com etapas, responsáveis, decisões e entregas rastreáveis.', 'produzir', 'LLM/orquestração + Supabase Postgres + fila/execução', 'Projetos, estados e especialistas', 'A validar', 'in_homologation', 2),
  ('01.03', 'nexo', 'Acompanhar entregas e pedir aprovações', 'Exibe andamento, próxima decisão, histórico e bloqueios; não executa ação sensível sem autorização.', 'orientar', 'Supabase Postgres/RLS + Storage + notificações', 'Motor de trabalhos e permissões', 'A validar', 'not_started', 3),
  ('01.04', 'nexo', 'Delegar responsabilidade recorrente', 'Cria, pausa e acompanha ao menos uma rotina real, com registro por execução e falhas.', 'otimizar', 'Supabase Cron/Edge Functions + fila de jobs + Postgres', 'Agendador, histórico e limites', 'A validar', 'not_started', 4),
  ('02.01', 'bia', 'Diagnóstico inicial de marketing', 'Entrega avaliação objetiva do negócio com lacunas, oportunidades e premissas identificadas.', 'orientar', 'LLM API + Supabase memória + Google Business Profile/GA4 (quando conectados)', 'Onboarding e memória de marca', 'A validar', 'in_homologation', 5),
  ('02.02', 'bia', 'Posicionamento, público e objetivos', 'Gera direcionamento documentado, coerente com o negócio e ajustável em conversa.', 'orientar', 'LLM API + Supabase memória de marca', 'Contexto da marca', 'A validar', 'in_homologation', 6),
  ('02.03', 'bia', 'Plano de marketing com prioridades', 'Apresenta ações priorizadas, responsáveis sugeridos e horizonte de execução.', 'produzir', 'LLM API + Supabase memória e projetos', 'Diagnóstico e contexto', 'A validar', 'in_homologation', 7),
  ('02.04', 'bia', 'Estratégia para campanhas integradas', 'Cria conceito, público e prioridades que alimentam Kaia, Otto e Kiwi no mesmo projeto.', 'produzir', 'LLM API + orquestração Nexo + Supabase projetos', 'Orquestração Nexo', 'A validar', 'in_homologation', 8),
  ('02.05', 'bia', 'Diagnóstico de presença digital e reputação', 'Avalia site, presença digital, avaliações, canais e oportunidades de posicionamento; estratégias de SEO ficam com Kiwi.', 'orientar', 'Google Business Profile + GA4 + pesquisa web + insights do Kiwi (SEO)', 'Bia conduz diagnóstico estratégico; Kiwi lidera recomendações e execução de SEO.', 'A validar', 'not_started', 9),
  ('02.06', 'bia', 'Leitura de avaliações e voz do cliente', 'Agrupa temas recorrentes em avaliações e comentários, identifica percepções e sugere ações de marketing.', 'orientar', 'Google Business Profile API (reviews) + LLM + memória', 'Acesso autorizado; análise qualitativa sem garantir representatividade.', 'A validar', 'not_started', 10),
  ('02.07', 'bia', 'Pesquisa de concorrentes e tendências', 'Apresenta fontes, datas e hipóteses; distingue pesquisa real de sugestão sem validação.', 'orientar', 'API de busca web (Tavily/Brave/SerpAPI — escolher) + GBP + fonte de tendências', 'Pesquisa web/serviço de dados', 'A validar', 'in_homologation', 11),
  ('03.01', 'kaia', 'Peça estática de marketing', 'Gera imagem e arquivo final no padrão da marca, com prévia, revisão e versão.', 'produzir', 'API de geração de imagem (escolher) + Supabase Storage', 'Motor de imagem e biblioteca', 'A validar', 'awaiting_engine', 12),
  ('03.02', 'kaia', 'Carrossel para redes sociais', 'Gera conjunto de slides coerente; permite revisão do conjunto e exportação.', 'produzir', 'API de geração de imagem + editor/compositor + Storage', 'Motor de imagem e templates', 'A validar', 'awaiting_engine', 13),
  ('03.03', 'kaia', 'Variações de formato e adaptações', 'Adapta peças aprovadas sem perder identidade, histórico ou consistência.', 'produzir', 'API de imagem/edição + Storage + versionamento', 'Motor visual, versões', 'A validar', 'awaiting_engine', 14),
  ('03.04', 'kaia', 'Logo, identidade e brandbook', 'Fluxo completo com escolhas, aplicações e arquivo utilizável; só lançar após validação de qualidade.', 'produzir', 'API de imagem + gerador de PDF/brandbook + Storage', 'Motor visual e critérios de qualidade', 'A validar', 'awaiting_engine', 15),
  ('03.05', 'kaia', 'Materiais promocionais e design de embalagens', 'Cria propostas visuais de materiais promocionais, rótulos e embalagens com mockup, revisão e arquivo exportável.', 'produzir', 'API de imagem/edição + mockups + PDF/arquivo final + Storage', 'Somente design de marketing; não inclui fabricação ou engenharia do produto.', 'A validar', 'awaiting_engine', 16),
  ('03.06', 'kaia', 'Edição de fotos e criativos com referências da marca', 'Usa fotos do cliente e referências aprovadas para composições, variações e ajustes com versões preservadas.', 'produzir', 'API de edição de imagem + upload/Storage + memória de marca', 'Respeitar fidelidade a produtos, direito de imagem e aprovações.', 'A validar', 'awaiting_engine', 17),
  ('03.07', 'kaia', 'Motion, vídeo e peças avançadas', 'Gera entregável audiovisual revisável e compatível com o canal; escopo/preço a validar.', 'produzir', 'API de geração de vídeo (escolher) + Storage/encoding', 'Motor de vídeo e custo', 'A validar', 'awaiting_engine', 18),
  ('04.01', 'otto', 'Textos e legendas de marketing', 'Produz copy revisável por canal, objetivo e tom de voz da marca.', 'produzir', 'LLM API + Supabase memória de marca', 'Modelo de texto e memória', 'A validar', 'in_homologation', 19),
  ('04.02', 'otto', 'Calendário editorial e pauta semanal', 'Organiza datas, canais, formatos, temas e responsáveis em um calendário persistente.', 'produzir', 'Supabase Postgres + Cron/Edge Functions + calendário', 'Motor de trabalhos e rotinas', 'A validar', 'in_homologation', 20),
  ('04.03', 'otto', 'Posts e roteiros multicanal', 'Cria roteiros e versões de conteúdo coerentes com a estratégia e com Kaia.', 'produzir', 'LLM API + motor visual da Kaia + Storage', 'Bia, Kaia e biblioteca', 'A validar', 'in_homologation', 21),
  ('04.04', 'otto', 'Agendar e publicar com autorização', 'Programa/publica apenas após conexão válida e aprovação; registra sucesso/falha.', 'executar', 'Instagram Graph API + Facebook Pages API + Meta OAuth + Cron', 'Meta Graph API, OAuth, permissões', 'A validar', 'not_started', 22),
  ('04.05', 'otto', 'Conteúdo para Perfil da Empresa no Google', 'Produz posts e ofertas para perfil local; permite revisão, agendamento e publicação autorizada.', 'executar', 'Google Business Profile API (posts/localPosts; validar disponibilidade) + OAuth', 'Testar permissões e suporte por tipo de perfil; não pressupor API liberada.', 'A validar', 'not_started', 23),
  ('04.06', 'otto', 'Rascunhos de respostas a comentários públicos', 'Lê comentários autorizados e sugere respostas da marca, com revisão e aprovação antes de publicar.', 'produzir', 'Facebook Pages Graph API (comments) + LLM + permissões', 'Somente interação pública de marketing; não assumir SAC nem atendimento de vendas.', 'A validar', 'not_started', 24),
  ('04.07', 'otto', 'Artigos e conteúdo otimizado para buscadores', 'Cria artigos e conteúdos com briefing, temas, palavras-chave e diretrizes SEO do Kiwi; revisão e exportação/publicação.', 'produzir', 'LLM API + Search Console via Kiwi + CMS/Blog API (WordPress/Shopify)', 'Kiwi lidera estratégia e performance SEO; Otto executa produção editorial.', 'A validar', 'not_started', 25),
  ('05.01', 'kiwi', 'Plano de mídia e recomendação de orçamento', 'Define objetivos, canais, limites propostos e hipóteses sem executar investimento.', 'orientar', 'Meta Ads MCP oficial (leitura) + LLM API + memória', 'Estratégia da Bia', 'A validar', 'in_homologation', 26),
  ('05.02', 'kiwi', 'Públicos e testes de anúncios', 'Desenha segmentações, mensagens, variações e plano de testes para aprovação.', 'produzir', 'Meta Ads MCP/Marketing API (públicos) + Kaia', 'Bia e Kaia', 'A validar', 'in_homologation', 27),
  ('05.03', 'kiwi', 'Leitura e análise de campanhas existentes', 'Interpreta métricas reais autorizadas, com período, origem e limitações identificados.', 'orientar', 'Meta Ads MCP oficial (Insights) + Meta Marketing API', 'Meta Marketing API', 'A validar', 'not_started', 28),
  ('05.04', 'kiwi', 'Auditoria de campanhas e conta de anúncios', 'Analisa estrutura, segmentações, criativos e oportunidades de melhoria na conta conectada.', 'orientar', 'Meta Ads MCP (leitura) + Meta Marketing API + LLM', 'Validar escopos e acesso; diagnóstico não autoriza alteração.', 'A validar', 'not_started', 29),
  ('05.05', 'kiwi', 'Otimização contínua de campanhas autorizadas', 'Executa ciclos de análise, propõe ajustes e só altera orçamento/segmentação dentro de limites aprovados.', 'otimizar', 'Meta Ads MCP (gestão a validar) + Marketing API + Cron + auditoria', 'Confirmar escopos financeiros e limites; nenhuma mudança sem política aprovada.', 'A validar', 'not_started', 30),
  ('05.06', 'kiwi', 'Criar, ativar ou alterar anúncios', 'Só aplica mudanças após permissão explícita, teto aprovado e trilha de auditoria.', 'executar', 'Meta Ads MCP oficial (escrita) + Marketing API + autorizações/auditoria', 'Meta Ads, autorização financeira', 'A validar', 'not_started', 31),
  ('05.07', 'kiwi', 'Diagnóstico e estratégia SEO (site e SEO local)', 'Audita busca orgânica, aspectos técnicos/on-page, palavras-chave e oportunidades locais; entrega plano priorizado.', 'orientar', 'Google Search Console API + GA4 + Google Business Profile + pesquisa web; LLM', 'Acesso autorizado às propriedades; Kiwi lidera SEO, Otto produz o conteúdo orientado.', 'A validar', 'not_started', 32),
  ('05.08', 'kiwi', 'Otimização de conversão (CRO) e funil de aquisição', 'Analisa etapas de conversão, abandono, páginas e CTAs; prioriza melhorias mensuráveis e define testes.', 'otimizar', 'GA4 Data API + eventos do site + dados de pedidos/leads + ferramentas de teste (a definir)', 'Não inventar taxas; acesso a eventos e configuração de metas/atribuição.', 'A validar', 'not_started', 33),
  ('05.09', 'kiwi', 'Experimentos de Growth multicanal', 'Estrutura hipóteses, testes de aquisição orgânica/paga, critérios de sucesso e rotina de otimização.', 'otimizar', 'GA4 + Search Console + Meta Ads MCP/Marketing API + banco de experimentos e jobs', 'Kiwi coordena testes de crescimento, com produção via Kaia/Otto e leitura com Íris.', 'A validar', 'not_started', 34),
  ('06.01', 'max', 'Planejar campanha de reativação/fidelização', 'Entrega objetivo, segmentação proposta, oferta e calendário revisáveis.', 'orientar', 'CRM/CSV + Supabase contatos + LLM API', 'Bia e contexto de negócio', 'A validar', 'in_homologation', 35),
  ('06.02', 'max', 'Sequências de e-mail e mensagens', 'Cria textos e etapas de comunicação para revisão antes de qualquer envio.', 'produzir', 'LLM API + API de e-mail marketing + WhatsApp Cloud API (templates)', 'Otto e diretrizes de marca', 'A validar', 'in_homologation', 36),
  ('06.03', 'max', 'Segmentação de base de clientes', 'Organiza segmentos com origem dos dados e verificação de consentimento.', 'produzir', 'Importação CSV / API CRM (RD/HubSpot a definir) + Supabase/RLS', 'Importação/CRM, LGPD', 'A validar', 'in_homologation', 37),
  ('06.04', 'max', 'Jornadas de relacionamento multietapas', 'Desenha jornada e gatilhos; diferencia fluxo planejado de automação ativa.', 'produzir', 'Supabase Postgres + Cron/fila + e-mail/WhatsApp', 'Segmentos e estados', 'A validar', 'not_started', 38),
  ('06.05', 'max', 'Captação de leads com consentimento e origem', 'Propõe formulários de captação e conecta contatos consentidos a segmentos com origem e opt-in.', 'produzir', 'Formulário/landing + webhook + Supabase/CRM + consentimento LGPD', 'Marketing de aquisição/relacionamento; não negociar nem gerir vendas.', 'A validar', 'not_started', 39),
  ('06.06', 'max', 'Disparo efetivo via e-mail/WhatsApp', 'Envia apenas a contatos elegíveis, autorizados e com integração operacional.', 'executar', 'WhatsApp Business Cloud API + e-mail marketing API + opt-in/opt-out', 'Plataforma de envio, WhatsApp, consentimento', 'A validar', 'not_started', 40),
  ('07.01', 'iris', 'Consolidar métricas disponíveis', 'Mostra indicadores com origem, período, unidade e ausência de dados quando aplicável.', 'orientar', 'GA4 Data API + Search Console + GBP Performance + Meta Ads MCP + Instagram Insights + pedidos/site', 'Fontes disponíveis/planilha', 'A validar', 'not_started', 41),
  ('07.02', 'iris', 'Análise qualitativa de desempenho', 'Explica variações sem afirmar causalidade sem evidência; gera leitura útil e contextual.', 'orientar', 'LLM API + métricas consolidadas em Supabase', 'Dados e modelo de análise', 'A validar', 'in_homologation', 42),
  ('07.03', 'iris', 'Comparação entre períodos e relatório', 'Cria relatório claro, revisável e vinculado ao histórico do negócio.', 'produzir', 'GA4/Meta Ads/Instagram/GBP + Supabase séries históricas', 'Séries temporais confiáveis', 'A validar', 'in_homologation', 43),
  ('07.04', 'iris', 'Recomendações priorizadas a partir dos dados', 'Transforma achados em ações discutíveis com Nexo/especialistas.', 'orientar', 'LLM API + Nexo/orquestração + Supabase projetos', 'Orquestração e insights', 'A validar', 'in_homologation', 44),
  ('07.05', 'iris', 'Relatório executivo recorrente do marketing', 'Entrega resumo semanal automático por canal, variações, hipóteses e decisões sugeridas, com dados de origem.', 'produzir', 'GA4 + Instagram Insights + Meta Ads MCP + GBP + LLM + agendador', 'Somente métricas conectadas; relatório não substitui evidências nem inventa dados.', 'A validar', 'not_started', 45),
  ('07.06', 'iris', 'Monitoramento proativo de indicadores', 'Executa leituras recorrentes e alertas apenas com dados atualizados e confiáveis.', 'otimizar', 'Supabase Cron/jobs + APIs de dados + notificações', 'Integrações de dados + agendador', 'A validar', 'not_started', 46)
;

-- ---------------------------------------------------------------------------------------------------
-- Regras de negócio escritas e exibidas (marcação por parágrafo; versão nova a cada gravação)
-- ---------------------------------------------------------------------------------------------------

create table public.business_rule_docs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  in_prompt boolean not null default false,
  created_at timestamptz not null default now(),
  constraint business_rule_docs_slug_key unique (slug),
  constraint business_rule_docs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint business_rule_docs_title_length check (char_length(btrim(title)) between 1 and 120)
);
comment on column public.business_rule_docs.in_prompt is 'true = entra no prompt (regras compartilhadas, SA3a); false = referência interna.';

create table public.business_rule_doc_versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.business_rule_docs (id) on delete cascade,
  version integer not null,
  paragraphs jsonb not null,
  author text not null,
  change_note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_rule_doc_versions_doc_version_key unique (doc_id, version),
  constraint business_rule_doc_versions_version_positive check (version > 0),
  constraint business_rule_doc_versions_paragraphs_array check (
    jsonb_typeof(paragraphs) = 'array' and jsonb_array_length(paragraphs) > 0
  )
);
comment on column public.business_rule_doc_versions.paragraphs is 'Lista de {"mark": decided|current_base|pending|proposal, "text", "source"}. pending nunca é aplicado.';
create index business_rule_doc_versions_created_by_idx on public.business_rule_doc_versions (created_by);
create trigger business_rule_doc_versions_immutable
  before update on public.business_rule_doc_versions
  for each row execute function app.versioned_row_immutable();

with doc as (
  insert into public.business_rule_docs (slug, title, in_prompt)
  values ('diretrizes-do-dono', 'Diretrizes do dono', false)
  returning id
)
insert into public.business_rule_doc_versions (doc_id, version, paragraphs, author, change_note)
select doc.id, 1, jsonb_agg(jsonb_build_object('mark', 'decided', 'text', p.text, 'source', p.source) order by p.n),
       'Vic', 'Versão inicial: docs/DIRETRIZES_DO_DONO.md (16/10/2026).'
from doc,
(values
  (1, 'Tudo é testado localmente primeiro. Só publicamos (Supabase cloud, Railway, Vercel) depois de todos os testes validados.', 'Vic, 15/10/2026'),
  (2, 'Todo dado de teste é fictício. Clientes, usuários, contatos, métricas e marcas de teste nunca são reais.', 'Vic, 15/10/2026'),
  (3, 'Infra aprovada: Vercel (web) + Railway (api, worker, scheduler) + Supabase (Auth, Postgres+RLS, pgvector, pgmq, cron, Storage, Realtime).', 'Vic, 15/10/2026'),
  (4, 'Kiwi é Growth Marketing em todo o fluxo. Tratamento: "a Kiwi".', 'Vic, 15/10/2026'),
  (5, 'Repositório oficial: github.com/victorvixcard/HelloSquad, público. Nenhum segredo, chave, token ou .env entra no repositório.', 'Vic, 15/10/2026'),
  (6, 'Sete agentes com nomes, cores e papéis do handoff; definição em squad/. Mudança em agent.yaml ou SOUL.md gera versão nova, nunca edição silenciosa.', 'Vic, 15/10/2026'),
  (7, 'Preço e créditos ficam por último. Agora é teste; a prioridade é a ferramenta funcionar. O mecanismo de créditos existe com valores provisórios marcados como provisórios; nenhuma tela de preço, paywall ou cobrança real até o Vic definir.', 'Vic, 16/10/2026'),
  (8, 'Pagamento recorrente é requisito. Integrações previstas: Asaas e Mercado Pago, atrás de uma interface única de provedor. Stripe sai.', 'Vic, 16/10/2026'),
  (9, 'Motor de geração de imagem é do Vic. Kaia fica atrás de um adaptador de imagem; nenhuma delivery visual é implementada até o motor chegar. Ninguém escolhe fornecedor de imagem.', 'Vic, 16/10/2026'),
  (10, 'Idiomas: português, inglês e espanhol; desenvolver primeiro em pt-BR. Nenhum texto fixo em código; os agentes respondem no idioma do cliente.', 'Vic, 16/10/2026'),
  (11, 'Sistema só para nós: a Data API automática do Supabase fica desligada em produção. A única porta de entrada é a nossa API.', 'Vic, 16/10/2026'),
  (12, 'Compra de créditos no mobile e na web.', 'Vic, 16/10/2026'),
  (13, 'Conversas: quem está logado no negócio vê as conversas com qualquer agente e com todos, com histórico completo. Outra empresa nunca vê.', 'Vic, 16/10/2026 08:55'),
  (14, 'Quem aprova é o dono da conta: só o usuário que se cadastrou e tem o plano ativo aprova ou reprova qualquer entrega dos agentes, e autoriza ações externas (publicar, enviar, investir).', 'Vic, 16/10/2026 08:55'),
  (15, 'Rejeitar uma entrega tem duas saídas, as duas existem: cancelar o trabalho ou pedir nova proposta ao agente.', 'Vic, 16/10/2026 08:55'),
  (16, 'Trabalho agendado que a plataforma confirmou como publicado vira Concluído sozinho.', 'Vic, 16/10/2026 08:55'),
  (17, 'Nexo é o coordenador: a maioria dos pedidos entra por ele e ele delega; o usuário pode falar com os outros agentes.', 'Vic, 16/10/2026 08:55'),
  (18, 'Painel Super Admin entra no escopo e faz parte do mesmo ecossistema: mesma aplicação (/admin), mesma API, mesmo banco. Controla pagamento, contas, a estrutura dos agentes, regras de negócio e o motor de imagem em texto editável.', 'Vic, 16/10/2026 09:15'),
  (19, 'Nenhum agente muda deliberadamente nada do que foi combinado: botão, cor, front, backend, UX, UI, regra de negócio, contrato de API. Dúvida vai ao Vic; só o Vic decide.', 'Vic, 16/10/2026'),
  (20, 'Segue todas as regras do protótipo sempre. Onde faltar botão ou tela, mantém o que foi feito.', 'Vic, 16/10/2026 10:20'),
  (21, 'Sempre tem que estar tudo commitado: commit e push a cada item, nunca mais de 5 minutos sem commit.', 'Vic, 16/10/2026 10:30'),
  (22, 'Decisão comercial pendente (preço, créditos, planos, paywall) não vira regra fixa no código: vai para tabela configurável com valor provisório marcado como provisório.', 'Documento Mestre (vale como decisão do dono)'),
  (23, 'Aprovar conteúdo não autoriza publicar, enviar, investir ou alterar campanha. Cada ação externa tem autorização própria verificada no backend.', 'Documento Mestre (vale como decisão do dono)'),
  (24, 'Nada vira regra da Memória da Marca sem confirmação do usuário.', 'Documento Mestre (vale como decisão do dono)'),
  (25, 'Dados isolados por workspace em banco (RLS), storage e ferramentas. Teste automatizado de isolamento é obrigatório.', 'Documento Mestre (vale como decisão do dono)'),
  (26, 'Não inventar dado, métrica ou resultado. Estado vazio honesto.', 'Documento Mestre (vale como decisão do dono)')
) as p (n, text, source)
group by doc.id;

-- ---------------------------------------------------------------------------------------------------
-- Referências (brandbooks, fontes, moods): a tela entra na SA5, com o motor de imagem; nasce vazia
-- ---------------------------------------------------------------------------------------------------

create table public.reference_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  kind text not null,
  name text not null,
  status text not null default 'draft',
  lessons jsonb not null default '[]'::jsonb,
  used_in jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reference_items_kind_values check (kind in ('brandbook', 'font', 'mood')),
  constraint reference_items_status_values check (status in ('draft', 'active', 'inactive')),
  constraint reference_items_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint reference_items_lessons_array check (jsonb_typeof(lessons) = 'array'),
  constraint reference_items_used_in_array check (jsonb_typeof(used_in) = 'array')
);
comment on column public.reference_items.workspace_id is 'Nulo = repertório da plataforma; preenchido = material de um cliente (pergunta 18 do SA0, aberta).';
comment on column public.reference_items.used_in is 'Onde a IA usa: lista de {"agent_id", "delivery_type"}.';
create index reference_items_workspace_idx on public.reference_items (workspace_id) where workspace_id is not null;
create trigger reference_items_set_updated_at
  before update on public.reference_items
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- Modelos e custos
-- ---------------------------------------------------------------------------------------------------

create table public.model_pricing (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  display_name text not null,
  input_usd_per_mtok numeric(10, 4) not null,
  output_usd_per_mtok numeric(10, 4) not null,
  cache_read_usd_per_mtok numeric(10, 4) not null,
  cache_write_usd_per_mtok numeric(10, 4) not null,
  usd_brl numeric(10, 4) not null,
  fx_date date not null,
  fx_source text not null,
  checked_at date not null,
  source text not null,
  provisional boolean not null default true,
  valid_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint model_pricing_version_key unique (model, valid_from),
  constraint model_pricing_non_negative check (
    input_usd_per_mtok >= 0 and output_usd_per_mtok >= 0 and cache_read_usd_per_mtok >= 0
    and cache_write_usd_per_mtok >= 0 and usd_brl > 0
  )
);
comment on table public.model_pricing is 'Preço por milhão de tokens e câmbio, versionado por valid_from. Conferido no provedor em checked_at; câmbio informado à mão.';
create trigger model_pricing_immutable
  before update on public.model_pricing
  for each row execute function app.versioned_row_immutable();

insert into public.model_pricing (
  model, display_name, input_usd_per_mtok, output_usd_per_mtok, cache_read_usd_per_mtok, cache_write_usd_per_mtok,
  usd_brl, fx_date, fx_source, checked_at, source, provisional, valid_from
)
select v.model, v.display_name, v.input, v.output, v.cache_read, v.cache_write,
       5.40, date '2026-10-16', 'informado à mão (exemplo)', date '2026-10-16',
       'API Anthropic (apps/backend/src/hellosquad/llm/pricing.py)', true, timestamptz '2026-10-16 00:00:00-03'
from (values
  ('claude-opus-5-5', 'Opus 5.5', 4, 20, 0.20, 5),
  ('claude-haiku-4-5', 'Haiku 4.5', 1, 5, 0.10, 1.25),
  ('claude-sonnet-5-5', 'Sonnet 5.5', 2, 10, 0.20, 2.50),
  ('claude-opus-5', 'Opus 5', 5, 25, 0.50, 6.25),
  ('claude-opus-4-8', 'Opus 4.8', 5, 25, 0.50, 6.25)
) as v (model, display_name, input, output, cache_read, cache_write);

create table public.task_model_rules (
  id uuid primary key default gen_random_uuid(),
  agent_id public.agent_id not null,
  task text not null,
  steps text[] not null,
  model text not null,
  effort text,
  thinking text not null,
  thinking_budget integer,
  source text not null,
  valid_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint task_model_rules_version_key unique (agent_id, task, valid_from),
  constraint task_model_rules_task_values check (task in ('default', 'triage')),
  constraint task_model_rules_effort_values check (effort in ('low', 'medium', 'high', 'xhigh', 'max')),
  constraint task_model_rules_thinking_values check (thinking in ('adaptive', 'budget')),
  constraint task_model_rules_thinking_budget check ((thinking = 'budget') = (thinking_budget is not null))
);
comment on table public.task_model_rules is 'Etapa → modelo e esforço, como o runtime faz hoje (agent.yaml + squad/flow.py). Versionado; o runtime passa a ler daqui na SA3a.';
comment on column public.task_model_rules.steps is 'Etapas de squad/flow.py cobertas: triage; default = produce, check, revise, plan, reply e reflect.';
create trigger task_model_rules_immutable
  before update on public.task_model_rules
  for each row execute function app.versioned_row_immutable();

insert into public.task_model_rules (agent_id, task, steps, model, effort, thinking, thinking_budget, source, valid_from)
select v.agent_id, v.task, v.steps, v.model, v.effort, v.thinking, v.budget, v.source, timestamptz '2026-10-16 00:00:00-03'
from (values
  ('nexo', 'triage', array['triage'], 'claude-haiku-4-5', null, 'budget', 1024, 'squad/nexo/agent.yaml (modelo.triagem) + flow.py TRIAGE_THINKING_BUDGET'),
  ('nexo', 'default', array['plan', 'reply', 'reflect'], 'claude-opus-5-5', 'high', 'adaptive', null, 'squad/nexo/agent.yaml'),
  ('bia', 'default', array['produce', 'check', 'revise', 'reply', 'reflect'], 'claude-opus-5-5', 'high', 'adaptive', null, 'squad/bia/agent.yaml'),
  ('kaia', 'default', array['produce', 'check', 'revise', 'reply', 'reflect'], 'claude-opus-5-5', 'medium', 'adaptive', null, 'squad/kaia/agent.yaml'),
  ('otto', 'default', array['produce', 'check', 'revise', 'reply', 'reflect'], 'claude-opus-5-5', 'medium', 'adaptive', null, 'squad/otto/agent.yaml'),
  ('kiwi', 'default', array['produce', 'check', 'revise', 'reply', 'reflect'], 'claude-opus-5-5', 'high', 'adaptive', null, 'squad/kiwi/agent.yaml'),
  ('max', 'default', array['produce', 'check', 'revise', 'reply', 'reflect'], 'claude-opus-5-5', 'medium', 'adaptive', null, 'squad/max/agent.yaml'),
  ('iris', 'default', array['produce', 'check', 'revise', 'reply', 'reflect'], 'claude-opus-5-5', 'high', 'adaptive', null, 'squad/iris/agent.yaml')
) as v (agent_id, task, steps, model, effort, thinking, budget, source);

-- ---------------------------------------------------------------------------------------------------
-- Saúde dos provedores. Nunca guarda chave: "configurada"/"ausente" é calculado pela API a partir do .env
-- ---------------------------------------------------------------------------------------------------

create table public.provider_health (
  provider text primary key,
  display_name text not null,
  purpose text not null,
  status text not null,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_text text,
  last_balance_refusal_at timestamptz,
  reported_balance numeric(12, 2),
  reported_balance_currency text,
  reported_balance_at timestamptz,
  alert_below numeric(12, 2),
  note text,
  sort_order integer not null,
  updated_at timestamptz not null default now(),
  constraint provider_health_provider_values check (provider in ('anthropic', 'image_engine', 'asaas', 'mercadopago', 'email')),
  constraint provider_health_status_values check (
    status in ('working', 'failing', 'simulated', 'local_only', 'not_integrated', 'account_not_created')
  ),
  constraint provider_health_currency_format check (reported_balance_currency ~ '^[A-Z]{3}$'),
  constraint provider_health_balance_pair check ((reported_balance is null) = (reported_balance_at is null)),
  constraint provider_health_failure_text_length check (char_length(last_failure_text) <= 300)
);
comment on column public.provider_health.reported_balance is 'Saldo lido à mão no painel do provedor (SA4 grava). Gasto e chamadas vêm de run_steps.';
create trigger provider_health_set_updated_at
  before update on public.provider_health
  for each row execute function app.set_updated_at();

insert into public.provider_health (provider, display_name, purpose, status, note, sort_order) values
  ('anthropic', 'Anthropic', 'Modelos de linguagem dos sete agentes', 'simulated',
   'Runtime em modo simulado até a chave da API chegar (LLM_PROVIDER).', 1),
  ('image_engine', 'Motor de imagem', 'Peças da Kaia (03.01 a 03.07)', 'not_integrated',
   'Motor do Vic, em integração. Nenhum fornecedor escolhido por aqui.', 2),
  ('asaas', 'Asaas', 'Assinaturas e recargas (PaymentProvider)', 'account_not_created',
   'Conta ainda não criada; adaptador pronto e testado contra servidor falso (S2e).', 3),
  ('mercadopago', 'Mercado Pago', 'Assinaturas e recargas (PaymentProvider)', 'account_not_created',
   'Conta ainda não criada; adaptador pronto e testado contra servidor falso (S2e).', 4),
  ('email', 'E-mail transacional', 'Convite, "Precisa de você", entrega pronta, pagamento, senha', 'local_only',
   'Só local: Mailpit (S2f). Provedor de produção não escolhido.', 5);

-- ---------------------------------------------------------------------------------------------------
-- Views do painel (security_invoker: valem as políticas do papel que lê, nunca as do dono da view)
-- ---------------------------------------------------------------------------------------------------

-- Consumo por conta e dia (America/Sao_Paulo). Entregas = runs ligados a um trabalho; conversa = runs sem
-- trabalho (conversa não cobra crédito, mas custa). Créditos cobrados = capturas do extrato.
create view public.v_consumo_por_cliente
with (security_invoker = true)
as
with requests as (
  select w.workspace_id, (w.created_at at time zone 'America/Sao_Paulo')::date as day, count(*)::integer as requests
  from public.work_items w
  group by 1, 2
),
credits as (
  select l.workspace_id, (l.created_at at time zone 'America/Sao_Paulo')::date as day,
         (-sum(l.amount))::numeric(12, 2) as credits_charged
  from public.credit_ledger l
  where l.entry_type = 'capture'
  group by 1, 2
),
ai as (
  select s.workspace_id, (s.created_at at time zone 'America/Sao_Paulo')::date as day,
         count(*) filter (where s.kind = 'llm_call')::integer as llm_calls,
         count(*) filter (where s.kind = 'llm_call' and r.work_item_id is null)::integer as conversation_calls,
         sum(s.input_tokens)::bigint as input_tokens,
         sum(s.cache_read_tokens)::bigint as cache_read_tokens,
         sum(s.cache_write_tokens)::bigint as cache_write_tokens,
         sum(s.output_tokens)::bigint as output_tokens,
         coalesce(sum(s.cost_usd) filter (where r.work_item_id is not null), 0)::numeric(14, 6) as ai_cost_deliveries_usd,
         coalesce(sum(s.cost_usd) filter (where r.work_item_id is null), 0)::numeric(14, 6) as ai_cost_conversation_usd
  from public.run_steps s
  join public.runs r on r.workspace_id = s.workspace_id and r.id = s.run_id
  group by 1, 2
)
select workspace_id,
       day,
       coalesce(requests.requests, 0) as requests,
       coalesce(credits.credits_charged, 0)::numeric(12, 2) as credits_charged,
       coalesce(ai.llm_calls, 0) as llm_calls,
       coalesce(ai.conversation_calls, 0) as conversation_calls,
       coalesce(ai.input_tokens, 0) as input_tokens,
       coalesce(ai.cache_read_tokens, 0) as cache_read_tokens,
       coalesce(ai.cache_write_tokens, 0) as cache_write_tokens,
       coalesce(ai.output_tokens, 0) as output_tokens,
       coalesce(ai.ai_cost_deliveries_usd, 0)::numeric(14, 6) as ai_cost_deliveries_usd,
       coalesce(ai.ai_cost_conversation_usd, 0)::numeric(14, 6) as ai_cost_conversation_usd
from requests
full join credits using (workspace_id, day)
full join ai using (workspace_id, day);
comment on view public.v_consumo_por_cliente is 'Consumo por conta e dia: solicitações (trabalhos criados), créditos cobrados (capturas), chamadas, tokens e custo de IA de entregas e de conversa (run_steps).';

-- Qualidade por conta, mês (da primeira decisão) e tipo de entrega. Primeira decisão aprovada = aprovada de
-- primeira; ajuste = pedir ajuste ou rejeitar pedindo nova proposta; não aprovada = rejeitar e cancelar.
create view public.v_qualidade_entregas
with (security_invoker = true)
as
with decided as (
  select a.workspace_id, a.work_item_id, a.decision, a.follow_up, a.created_at,
         row_number() over (partition by a.work_item_id order by a.decided_at, a.id) as n
  from public.approvals a
  where a.kind in ('review', 'approve') and a.status = 'decided'
),
items as (
  select w.workspace_id, w.id as work_item_id, w.delivery_type,
         date_trunc('month', min(d.created_at) at time zone 'America/Sao_Paulo')::date as month,
         bool_or(d.n = 1 and d.decision = 'approved') as approved_first,
         bool_or(d.decision = 'approved') as approved,
         count(*) filter (
           where d.decision = 'changes_requested' or (d.decision = 'rejected' and d.follow_up = 'revise')
         )::integer as adjustments,
         bool_or(d.decision = 'rejected' and d.follow_up = 'cancel') as not_approved
  from public.work_items w
  join decided d on d.workspace_id = w.workspace_id and d.work_item_id = w.id
  where w.delivery_type is not null
  group by w.workspace_id, w.id, w.delivery_type
),
runs_of as (
  select r.workspace_id, r.work_item_id,
         sum(r.cost_usd)::numeric(14, 6) as cost_usd,
         count(*) filter (where r.status = 'failed')::integer as failed_runs
  from public.runs r
  where r.work_item_id is not null
  group by 1, 2
),
steps_of as (
  select r.workspace_id, r.work_item_id, count(*)::integer as failed_steps
  from public.run_steps s
  join public.runs r on r.workspace_id = s.workspace_id and r.id = s.run_id
  where s.status = 'failed' and r.work_item_id is not null
  group by 1, 2
)
select i.workspace_id,
       i.month,
       i.delivery_type,
       count(*)::integer as deliveries,
       count(*) filter (where i.approved_first)::integer as approved_first_time,
       count(*) filter (where i.approved)::integer as approved,
       sum(i.adjustments)::integer as adjustments,
       count(*) filter (where i.not_approved)::integer as not_approved,
       coalesce(sum(ro.cost_usd), 0)::numeric(14, 6) as ai_cost_usd,
       coalesce(sum(ro.cost_usd) filter (where i.approved), 0)::numeric(14, 6) as ai_cost_approved_usd,
       coalesce(sum(ro.failed_runs), 0)::integer as failed_runs,
       coalesce(sum(so.failed_steps), 0)::integer as failed_steps
from items i
left join runs_of ro on ro.workspace_id = i.workspace_id and ro.work_item_id = i.work_item_id
left join steps_of so on so.workspace_id = i.workspace_id and so.work_item_id = i.work_item_id
group by i.workspace_id, i.month, i.delivery_type;
comment on view public.v_qualidade_entregas is 'Qualidade por conta, mês e tipo: aprovadas de primeira, ajustes, não aprovadas, custo de IA (total e das aprovadas), runs e etapas com falha.';

-- Fila: cada run com a mensagem pgmq correspondente (quando ainda está na fila), tentativas, posse e erro.
create view public.v_fila
with (security_invoker = true)
as
with queued as (
  select 'runs_interactive'::text as queue_name, q.msg_id, q.read_ct, q.enqueued_at, q.vt,
         (q.message ->> 'run_id')::uuid as run_id
  from pgmq.q_runs_interactive q
  union all
  select 'runs_scheduled'::text, q.msg_id, q.read_ct, q.enqueued_at, q.vt, (q.message ->> 'run_id')::uuid
  from pgmq.q_runs_scheduled q
)
select r.id as run_id,
       r.workspace_id,
       r.work_item_id,
       w.title as work_title,
       w.delivery_type,
       r.agent_id,
       r.kind,
       r.status,
       r.attempts,
       r.created_at,
       r.started_at,
       r.finished_at,
       q.queue_name,
       q.msg_id as queue_msg_id,
       q.read_ct as queue_reads,
       q.enqueued_at as queue_enqueued_at,
       case when r.status = 'running' and q.vt > now() then q.vt end as lease_until,
       last_step.step as current_step,
       r.error ->> 'code' as error_code,
       r.error ->> 'message' as error_message
from public.runs r
left join public.work_items w on w.workspace_id = r.workspace_id and w.id = r.work_item_id
left join queued q on q.run_id = r.id
left join lateral (
  select s.payload ->> 'step' as step
  from public.run_steps s
  where s.workspace_id = r.workspace_id and s.run_id = r.id
  order by s.seq desc
  limit 1
) last_step on true;
comment on view public.v_fila is 'Runs com a mensagem da fila pgmq (na fila, posse até, leituras), a etapa atual e o último erro.';

-- Tamanho de cada fila pgmq (todas as do sistema).
create view public.v_fila_filas
with (security_invoker = true)
as
select 'runs_interactive'::text as queue_name, count(*)::integer as queued,
       count(*) filter (where q.vt > now() and q.read_ct > 0)::integer as in_flight, min(q.enqueued_at) as oldest_enqueued_at
from pgmq.q_runs_interactive q
union all
select 'runs_scheduled', count(*)::integer, count(*) filter (where q.vt > now() and q.read_ct > 0)::integer, min(q.enqueued_at)
from pgmq.q_runs_scheduled q
union all
select 'memory_reflect', count(*)::integer, count(*) filter (where q.vt > now() and q.read_ct > 0)::integer, min(q.enqueued_at)
from pgmq.q_memory_reflect q
union all
select 'external_actions', count(*)::integer, count(*) filter (where q.vt > now() and q.read_ct > 0)::integer, min(q.enqueued_at)
from pgmq.q_external_actions q
union all
select 'email_outbox', count(*)::integer, count(*) filter (where q.vt > now() and q.read_ct > 0)::integer, min(q.enqueued_at)
from pgmq.q_email_outbox q;

-- ---------------------------------------------------------------------------------------------------
-- RLS forçada nas tabelas novas; leitura só pelo papel do painel com o JWT de um Super Admin
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'platform_admins', 'support_access_log', 'topups', 'delivery_catalog', 'business_rule_docs',
    'business_rule_doc_versions', 'reference_items', 'model_pricing', 'task_model_rules', 'provider_health'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v_table);
  end loop;

  -- O painel lê estas tabelas do produto (sempre com workspace_id explícito na consulta por cliente).
  foreach v_table in array array[
    'platform_admins', 'support_access_log', 'topups', 'delivery_catalog', 'business_rule_docs',
    'business_rule_doc_versions', 'reference_items', 'model_pricing', 'task_model_rules', 'provider_health',
    'workspaces', 'memberships', 'audit_events', 'plans', 'plan_versions', 'plan_prices', 'delivery_prices',
    'topup_packs', 'credit_accounts', 'credit_grants', 'credit_holds', 'credit_ledger', 'billing_customers',
    'subscriptions', 'payments', 'payment_events', 'work_items', 'approvals', 'runs', 'run_steps', 'run_events'
  ] loop
    execute format('grant select on public.%I to hellosquad_admin', v_table);
    execute format(
      'create policy %I on public.%I for select to hellosquad_admin using ((select app.is_platform_admin()))',
      v_table || '_platform_admin_read', v_table
    );
  end loop;
end;
$$;

do $$
declare
  v_view text;
begin
  foreach v_view in array array[
    'topup_versions', 'v_consumo_por_cliente', 'v_qualidade_entregas', 'v_fila', 'v_fila_filas'
  ] loop
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v_view);
    execute format('grant select on public.%I to hellosquad_admin', v_view);
  end loop;
end;
$$;

-- Filas pgmq: só leitura, só para o painel (o worker continua sendo o único que consome).
grant usage on schema pgmq to hellosquad_admin;
grant select on pgmq.q_runs_interactive, pgmq.q_runs_scheduled, pgmq.q_memory_reflect, pgmq.q_external_actions,
  pgmq.q_email_outbox to hellosquad_admin;

grant execute on function app.credit_balance(uuid, timestamptz) to hellosquad_admin;
grant execute on function app.delivery_type_agent(text) to hellosquad_admin;
