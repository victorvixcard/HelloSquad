-- SA4a — Consumo por cliente, Qualidade das entregas e Saúde das APIs (API).
-- economic_alert_rules: faixas de referência dos alertas econômicos, versionadas e marcadas como proposta
-- (protótipo SA0, a definir com o Vic). Alerta é leitura: a API compara os números com a faixa e avisa;
-- nada no banco reage a ele (sem gatilho, sem job, sem mudança de plano, crédito ou estado da conta).
-- provider_balance_reports: saldo lido à mão no painel do provedor (valor, moeda, data, motivo), só
-- inserção, gravado por app.admin_provider_balance_report com audit_events; provider_health guarda o último.
-- v_consumo_por_cliente ganha turnos (runs com chamada de IA) e o custo deles, para a tendência do custo
-- por turno; chamada de IA passa a contar a autoverificação (kind = 'check' também chama o modelo).
-- v_qualidade_itens: uma linha por trabalho decidido, com a versão do prompt do especialista (SA3a) e os
-- erros do agente; v_qualidade_entregas passa a agregar dela (mesmas colunas + agent_errors no fim).

-- ---------------------------------------------------------------------------------------------------
-- Faixas de referência dos alertas econômicos (proposta, versionadas)
-- ---------------------------------------------------------------------------------------------------

create table public.economic_alert_rules (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  comparison text not null,
  threshold numeric(12, 4) not null,
  credit_reference_brl numeric(12, 4),
  window_days integer,
  proposal boolean not null default true,
  source text not null,
  valid_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint economic_alert_rules_version_key unique (metric, valid_from),
  constraint economic_alert_rules_metric_values check (
    metric in ('ai_cost_per_credit_brl', 'gross_margin', 'cost_per_turn_trend')
  ),
  constraint economic_alert_rules_comparison_values check (comparison in ('max', 'min')),
  constraint economic_alert_rules_credit_reference check (
    (metric = 'gross_margin') = (credit_reference_brl is not null) and coalesce(credit_reference_brl, 1) > 0
  ),
  constraint economic_alert_rules_window check (
    (metric = 'cost_per_turn_trend') = (window_days is not null) and coalesce(window_days, 1) between 1 and 90
  )
);
comment on table public.economic_alert_rules is 'Faixas de referência dos alertas econômicos do Consumo por cliente. proposal = true até o Vic decidir. Só avisa: nada muda automaticamente.';
comment on column public.economic_alert_rules.comparison is 'max = OK até o limite (acima, atenção); min = OK a partir do limite (abaixo, atenção).';
comment on column public.economic_alert_rules.credit_reference_brl is 'Valor de referência do crédito em R$ para a margem bruta estimada (exemplo do protótipo, provisório).';
comment on column public.economic_alert_rules.window_days is 'Tendência: últimos N dias contra os N anteriores, terminando no fim do período.';
create trigger economic_alert_rules_immutable
  before update on public.economic_alert_rules
  for each row execute function app.versioned_row_immutable();

insert into public.economic_alert_rules (metric, comparison, threshold, credit_reference_brl, window_days, proposal, source, valid_from)
values
  ('ai_cost_per_credit_brl', 'max', 0.15, null, null, true,
   'Protótipo SA0 (design/super-admin-proto/app/data.js, faixas): OK até R$ 0,15 por crédito cobrado', timestamptz '2026-10-16 00:00:00-03'),
  ('gross_margin', 'min', 0.65, 0.50, null, true,
   'Protótipo SA0: OK a partir de 65% com o crédito a R$ 0,50 (exemplo)', timestamptz '2026-10-16 00:00:00-03'),
  ('cost_per_turn_trend', 'max', 0.10, null, 7, true,
   'Protótipo SA0: OK até +10% do custo por turno nos últimos 7 dias contra os 7 anteriores', timestamptz '2026-10-16 00:00:00-03');

-- ---------------------------------------------------------------------------------------------------
-- Saldo informado por provedor (histórico só de inserção; o último fica em provider_health)
-- ---------------------------------------------------------------------------------------------------

create table public.provider_balance_reports (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.provider_health (provider),
  amount numeric(12, 2) not null,
  currency text not null,
  read_at timestamptz not null,
  alert_below numeric(12, 2),
  reason text not null,
  reported_by uuid not null,
  created_at timestamptz not null default now(),
  constraint provider_balance_reports_amount_non_negative check (amount >= 0),
  constraint provider_balance_reports_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint provider_balance_reports_alert_non_negative check (alert_below >= 0),
  constraint provider_balance_reports_reason_length check (char_length(btrim(reason)) between 10 and 500)
);
comment on table public.provider_balance_reports is 'Saldo lido à mão no painel do provedor, com motivo e autor. Só inserção (app.admin_provider_balance_report).';
comment on column public.provider_balance_reports.alert_below is 'Limiar do alerta na moeda do saldo, vigente depois deste registro.';
create index provider_balance_reports_provider_idx on public.provider_balance_reports (provider, created_at desc);
create trigger provider_balance_reports_immutable
  before update on public.provider_balance_reports
  for each row execute function app.versioned_row_immutable();

-- Grava o saldo informado: histórico + último valor em provider_health + audit_events. p_alert_below nulo
-- mantém o limiar atual. Data da leitura no futuro é recusada (22023).
create function app.admin_provider_balance_report(
  p_provider text,
  p_amount numeric,
  p_currency text,
  p_read_at timestamptz,
  p_alert_below numeric,
  p_reason text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_before public.provider_health;
  v_id uuid;
  v_alert numeric(12, 2);
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin informa saldo.';
  end if;
  select * into v_before from public.provider_health h where h.provider = p_provider for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Provedor desconhecido.';
  end if;
  if p_read_at > now() + interval '5 minutes' then
    raise exception using errcode = 'invalid_parameter_value', message = 'A leitura do saldo não pode estar no futuro.';
  end if;
  v_alert := coalesce(p_alert_below, v_before.alert_below);

  insert into public.provider_balance_reports (provider, amount, currency, read_at, alert_below, reason, reported_by)
  values (p_provider, p_amount, p_currency, p_read_at, v_alert, btrim(p_reason), (select auth.uid()))
  returning id into v_id;

  update public.provider_health h
  set reported_balance = p_amount,
      reported_balance_currency = p_currency,
      reported_balance_at = p_read_at,
      alert_below = v_alert
  where h.provider = p_provider;

  perform app.admin_audit(
    'admin.provider_balance_reported', null, 'provider_health', p_provider,
    jsonb_build_object(
      'report_id', v_id, 'amount', p_amount, 'currency', p_currency, 'read_at', p_read_at,
      'alert_below', v_alert, 'reason', btrim(p_reason),
      'previous', jsonb_build_object(
        'amount', v_before.reported_balance, 'currency', v_before.reported_balance_currency,
        'read_at', v_before.reported_balance_at, 'alert_below', v_before.alert_below
      )
    )
  );
  return v_id;
end;
$$;
revoke all on function app.admin_provider_balance_report(text, numeric, text, timestamptz, numeric, text)
  from public, anon, authenticated, service_role;
grant execute on function app.admin_provider_balance_report(text, numeric, text, timestamptz, numeric, text)
  to hellosquad_admin;

-- E-mail transacional: só contagens (o painel não lê destinatário nem conteúdo).
create function app.admin_email_activity()
returns table (
  calls_24h integer,
  failures_24h integer,
  last_success_at timestamptz,
  last_failure_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) filter (where m.updated_at > now() - interval '24 hours' and m.status in ('sent', 'failed', 'refused'))::integer,
         count(*) filter (where m.updated_at > now() - interval '24 hours' and m.status in ('failed', 'refused'))::integer,
         max(m.sent_at) filter (where m.status = 'sent'),
         max(m.updated_at) filter (where m.status in ('failed', 'refused'))
  from public.email_messages m
  where app.is_platform_admin();
$$;
revoke all on function app.admin_email_activity() from public, anon, authenticated, service_role;
grant execute on function app.admin_email_activity() to hellosquad_admin;

-- ---------------------------------------------------------------------------------------------------
-- Consumo: turnos e custo por turno (mesma view, colunas novas no fim)
-- ---------------------------------------------------------------------------------------------------

create or replace view public.v_consumo_por_cliente
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
         count(*) filter (where s.kind in ('llm_call', 'check'))::integer as llm_calls,
         count(*) filter (where s.kind in ('llm_call', 'check') and r.work_item_id is null)::integer as conversation_calls,
         sum(s.input_tokens)::bigint as input_tokens,
         sum(s.cache_read_tokens)::bigint as cache_read_tokens,
         sum(s.cache_write_tokens)::bigint as cache_write_tokens,
         sum(s.output_tokens)::bigint as output_tokens,
         coalesce(sum(s.cost_usd) filter (where r.work_item_id is not null), 0)::numeric(14, 6) as ai_cost_deliveries_usd,
         coalesce(sum(s.cost_usd) filter (where r.work_item_id is null), 0)::numeric(14, 6) as ai_cost_conversation_usd
  from public.run_steps s
  join public.runs r on r.workspace_id = s.workspace_id and r.id = s.run_id
  group by 1, 2
),
turns as (
  select r.workspace_id, (r.created_at at time zone 'America/Sao_Paulo')::date as day,
         count(*)::integer as turns,
         count(*) filter (where r.work_item_id is null)::integer as conversation_turns,
         sum(t.cost_usd)::numeric(14, 6) as turn_cost_usd
  from public.runs r
  join (
    select s.workspace_id, s.run_id, sum(s.cost_usd) as cost_usd
    from public.run_steps s
    group by 1, 2
    having count(*) filter (where s.kind in ('llm_call', 'check')) > 0
  ) t on t.workspace_id = r.workspace_id and t.run_id = r.id
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
       coalesce(ai.ai_cost_conversation_usd, 0)::numeric(14, 6) as ai_cost_conversation_usd,
       coalesce(turns.turns, 0) as turns,
       coalesce(turns.conversation_turns, 0) as conversation_turns,
       coalesce(turns.turn_cost_usd, 0)::numeric(14, 6) as turn_cost_usd
from requests
full join credits using (workspace_id, day)
full join ai using (workspace_id, day)
full join turns using (workspace_id, day);
comment on view public.v_consumo_por_cliente is 'Consumo por conta e dia (Brasília): solicitações (trabalhos criados), créditos cobrados (capturas), chamadas de IA (inclui autoverificação), tokens, custo de IA de entregas e de conversa, turnos (runs com chamada de IA, no dia em que o run nasceu) e o custo deles (run_steps).';

-- ---------------------------------------------------------------------------------------------------
-- Qualidade: uma linha por trabalho decidido; a view mensal agrega dela
-- ---------------------------------------------------------------------------------------------------

-- Aprovada de primeira = primeira decisão aprovada; ajuste = pedir ajuste ou rejeitar pedindo nova
-- proposta; não aprovada = rejeitar e cancelar. Versão do prompt = a do primeiro run do trabalho que
-- registrou versão (o que produziu a v1). Erro do agente = autoverificação reprovada ou resposta fora do
-- formato. Chamada com falha = etapa com falha (inclusive as que deram certo na nova tentativa).
create view public.v_qualidade_itens
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
         min(d.created_at) as first_decided_at,
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
  select r.workspace_id, r.work_item_id, count(*) filter (where r.status = 'failed')::integer as failed_runs
  from public.runs r
  where r.work_item_id is not null
  group by 1, 2
),
steps_of as (
  select r.workspace_id, r.work_item_id,
         sum(s.cost_usd)::numeric(14, 6) as cost_usd,
         count(*) filter (where s.status = 'failed')::integer as failed_steps,
         count(*) filter (
           where (s.kind = 'check' and s.status = 'succeeded' and s.payload ->> 'approved' = 'false')
              or (s.status = 'failed' and s.payload -> 'error' ->> 'code' = 'llm_invalid_output')
         )::integer as agent_errors
  from public.run_steps s
  join public.runs r on r.workspace_id = s.workspace_id and r.id = s.run_id
  where r.work_item_id is not null
  group by 1, 2
),
version_of as (
  select distinct on (r.workspace_id, r.work_item_id)
         r.workspace_id, r.work_item_id, r.agent_id, r.prompt_version
  from public.runs r
  where r.work_item_id is not null and r.prompt_version is not null
  order by r.workspace_id, r.work_item_id, r.created_at, r.id
)
select i.workspace_id,
       i.work_item_id,
       i.delivery_type,
       (i.first_decided_at at time zone 'America/Sao_Paulo')::date as decided_on,
       date_trunc('month', i.first_decided_at at time zone 'America/Sao_Paulo')::date as month,
       v.agent_id,
       v.prompt_version,
       i.approved_first,
       i.approved,
       i.adjustments,
       i.not_approved,
       coalesce(so.cost_usd, 0)::numeric(14, 6) as ai_cost_usd,
       coalesce(ro.failed_runs, 0) as failed_runs,
       coalesce(so.failed_steps, 0) as failed_steps,
       coalesce(so.agent_errors, 0) as agent_errors
from items i
left join runs_of ro on ro.workspace_id = i.workspace_id and ro.work_item_id = i.work_item_id
left join steps_of so on so.workspace_id = i.workspace_id and so.work_item_id = i.work_item_id
left join version_of v on v.workspace_id = i.workspace_id and v.work_item_id = i.work_item_id;
comment on view public.v_qualidade_itens is 'Qualidade por trabalho decidido: dia e mês da primeira decisão (Brasília), versão do prompt do especialista, aprovada de primeira, ajustes, não aprovada, custo de IA (run_steps), runs e etapas com falha, erros do agente.';

create or replace view public.v_qualidade_entregas
with (security_invoker = true)
as
select q.workspace_id,
       q.month,
       q.delivery_type,
       count(*)::integer as deliveries,
       count(*) filter (where q.approved_first)::integer as approved_first_time,
       count(*) filter (where q.approved)::integer as approved,
       sum(q.adjustments)::integer as adjustments,
       count(*) filter (where q.not_approved)::integer as not_approved,
       coalesce(sum(q.ai_cost_usd), 0)::numeric(14, 6) as ai_cost_usd,
       coalesce(sum(q.ai_cost_usd) filter (where q.approved), 0)::numeric(14, 6) as ai_cost_approved_usd,
       coalesce(sum(q.failed_runs), 0)::integer as failed_runs,
       coalesce(sum(q.failed_steps), 0)::integer as failed_steps,
       coalesce(sum(q.agent_errors), 0)::integer as agent_errors
from public.v_qualidade_itens q
group by q.workspace_id, q.month, q.delivery_type;
comment on view public.v_qualidade_entregas is 'Qualidade por conta, mês e tipo (agrega v_qualidade_itens): aprovadas de primeira, ajustes, não aprovadas, custo de IA (total e das aprovadas), runs e etapas com falha, erros do agente.';

-- ---------------------------------------------------------------------------------------------------
-- RLS forçada nas tabelas novas; leitura só pelo papel do painel com o JWT de um Super Admin
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array['economic_alert_rules', 'provider_balance_reports'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v_table);
    execute format('grant select on public.%I to hellosquad_admin', v_table);
    execute format(
      'create policy %I on public.%I for select to hellosquad_admin using ((select app.is_platform_admin()))',
      v_table || '_platform_admin_read', v_table
    );
  end loop;
end;
$$;

revoke all on public.v_qualidade_itens from public, anon, authenticated, service_role;
grant select on public.v_qualidade_itens to hellosquad_admin;
revoke all on public.v_consumo_por_cliente, public.v_qualidade_entregas from public, anon, authenticated, service_role;
grant select on public.v_consumo_por_cliente, public.v_qualidade_entregas to hellosquad_admin;
