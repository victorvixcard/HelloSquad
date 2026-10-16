-- S1a: isolamento das tabelas do núcleo entre Miolo, Vitta e Pedro (sem membership), e nenhuma escrita
-- direta para authenticated. Cada workspace ganha, dentro da transação, uma linha em cada tabela.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(12);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta;
grant select on fx to public;

create temporary table fx_rows (ws text, tbl text, id uuid);
grant select on fx_rows to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

-- Uma linha em cada uma das 13 tabelas do núcleo, ligadas entre si como no uso real.
create function pg_temp.make_graph(p_ws uuid, p_tag text) returns void
language plpgsql as $$
declare
  v_project uuid; v_conversation uuid; v_participant uuid; v_run uuid; v_message uuid; v_item uuid;
  v_step uuid; v_delivery uuid; v_version uuid; v_file uuid; v_approval uuid; v_run_step uuid; v_event uuid;
begin
  insert into public.projects (workspace_id, name) values (p_ws, 'Projeto ' || p_tag) returning id into v_project;
  insert into public.conversations (workspace_id, kind, primary_agent_id, title)
    values (p_ws, 'agent_direct', 'otto', 'Conversa ' || p_tag) returning id into v_conversation;
  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, agent_id)
    values (p_ws, v_conversation, 'agent', 'otto') returning id into v_participant;
  insert into public.runs (workspace_id, conversation_id, agent_id, idempotency_key)
    values (p_ws, v_conversation, 'otto', 'teste:' || p_tag) returning id into v_run;
  insert into public.messages (workspace_id, conversation_id, author_type, author_agent_id, run_id, body)
    values (p_ws, v_conversation, 'agent', 'otto', v_run, 'Mensagem ' || p_tag) returning id into v_message;
  insert into public.work_items (workspace_id, project_id, conversation_id, origin_message_id, title, delivery_type, status, primary_agent_id)
    values (p_ws, v_project, v_conversation, v_message, 'Trabalho ' || p_tag, '04.01', 'needs_you', 'otto')
    returning id into v_item;
  insert into public.work_item_steps (workspace_id, work_item_id, seq, title, agent_id)
    values (p_ws, v_item, 1, 'Escrever', 'otto') returning id into v_step;
  insert into public.deliveries (workspace_id, work_item_id, kind) values (p_ws, v_item, 'caption') returning id into v_delivery;
  insert into public.delivery_versions (workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id, run_id)
    values (p_ws, v_delivery, 1, '{"texto": "fictício"}', 'agent', 'otto', v_run) returning id into v_version;
  insert into public.delivery_files (workspace_id, version_id, storage_path, mime, size_bytes)
    values (p_ws, v_version, p_ws || '/deliveries/' || v_delivery || '/1/legenda.txt', 'text/plain', 10)
    returning id into v_file;
  insert into public.approvals (workspace_id, work_item_id, delivery_version_id, run_id, kind, requested_by_agent_id)
    values (p_ws, v_item, v_version, v_run, 'review', 'otto') returning id into v_approval;
  insert into public.run_steps (workspace_id, run_id, seq, kind) values (p_ws, v_run, 1, 'llm_call') returning id into v_run_step;
  insert into public.run_events (workspace_id, run_id, seq, type) values (p_ws, v_run, 1, 'run.started') returning id into v_event;

  insert into fx_rows values
    (p_tag, 'approvals', v_approval), (p_tag, 'conversation_participants', v_participant),
    (p_tag, 'conversations', v_conversation), (p_tag, 'deliveries', v_delivery),
    (p_tag, 'delivery_files', v_file), (p_tag, 'delivery_versions', v_version), (p_tag, 'messages', v_message),
    (p_tag, 'projects', v_project), (p_tag, 'run_events', v_event), (p_tag, 'run_steps', v_run_step),
    (p_tag, 'runs', v_run), (p_tag, 'work_item_steps', v_step), (p_tag, 'work_items', v_item);
end;
$$;

-- Tabelas (em ordem) em que a linha do workspace p_tag fica visível para o papel atual.
create function pg_temp.visible(p_tag text) returns text[]
language plpgsql as $$
declare
  r record;
  v_found boolean;
  v_out text[] := '{}';
begin
  for r in select tbl, id from fx_rows where ws = p_tag order by tbl loop
    execute format('select exists (select 1 from public.%I where id = $1)', r.tbl) into v_found using r.id;
    if v_found then
      v_out := v_out || r.tbl;
    end if;
  end loop;
  return v_out;
end;
$$;

-- Linhas visíveis de qualquer workspace diferente de p_ws, em todas as tabelas do núcleo (inclui o seed).
create function pg_temp.foreign_rows(p_ws uuid) returns text[]
language plpgsql as $$
declare
  t text;
  v_n bigint;
  v_out text[] := '{}';
begin
  for t in select distinct tbl from fx_rows order by tbl loop
    execute format('select count(*) from public.%I where workspace_id is distinct from $1', t) into v_n using p_ws;
    if v_n > 0 then
      v_out := v_out || (t || ':' || v_n);
    end if;
  end loop;
  return v_out;
end;
$$;

-- Escritas diretas que NÃO deram permission denied.
create function pg_temp.writable() returns text[]
language plpgsql as $$
declare
  t text;
  op text;
  v_out text[] := '{}';
begin
  for t in select distinct tbl from fx_rows order by tbl loop
    foreach op in array array['insert', 'update', 'delete'] loop
      begin
        execute case op
          when 'insert' then format('insert into public.%I default values', t)
          when 'update' then format('update public.%I set workspace_id = workspace_id where false', t)
          else format('delete from public.%I where false', t)
        end;
        v_out := v_out || (t || ':' || op);
      exception
        when insufficient_privilege then null;
        when others then v_out := v_out || (t || ':' || op || ':' || sqlstate);
      end;
    end loop;
  end loop;
  return v_out;
end;
$$;

select pg_temp.make_graph((select miolo from fx), 'miolo');
select pg_temp.make_graph((select vitta from fx), 'vitta');

select is(
  (select count(distinct tbl) from fx_rows),
  13::bigint,
  'fixture cobre as 13 tabelas do núcleo nos dois workspaces'
);

-- Marina (owner da Miolo)
select pg_temp.act_as((select marina from fx));
select is(pg_temp.visible('miolo'), (select array_agg(tbl order by tbl) from fx_rows where ws = 'miolo'), 'Marina vê a linha da Miolo em todas as tabelas');
select is(pg_temp.visible('vitta'), '{}'::text[], 'Marina não vê nenhuma linha da Vitta');
select is(pg_temp.foreign_rows((select miolo from fx)), '{}'::text[], 'Marina não vê linha de outro workspace em nenhuma tabela do núcleo');
select is(pg_temp.writable(), '{}'::text[], 'Marina não tem INSERT, UPDATE nem DELETE direto em nenhuma tabela do núcleo');

-- Rafael (owner da Vitta)
select pg_temp.act_as((select rafael from fx));
select is(pg_temp.visible('vitta'), (select array_agg(tbl order by tbl) from fx_rows where ws = 'vitta'), 'Rafael vê a linha da Vitta em todas as tabelas');
select is(pg_temp.visible('miolo'), '{}'::text[], 'Rafael não vê nenhuma linha da Miolo');
select is(pg_temp.foreign_rows((select vitta from fx)), '{}'::text[], 'Rafael não vê linha de outro workspace em nenhuma tabela do núcleo');

-- Pedro (autenticado, sem membership)
select pg_temp.act_as((select pedro from fx));
select is(pg_temp.visible('miolo') || pg_temp.visible('vitta'), '{}'::text[], 'Pedro não vê nada da Miolo nem da Vitta');
select is(pg_temp.foreign_rows(null), '{}'::text[], 'Pedro não vê nenhuma linha do núcleo');

-- FK composta: filho não aponta para pai de outro workspace, nem pelo papel privilegiado.
reset role;
select throws_ok(
  format(
    $$insert into public.messages (workspace_id, conversation_id, author_type, author_agent_id, body)
      values (%L, %L, 'agent', 'otto', 'cruzada')$$,
    (select vitta from fx), (select id from fx_rows where ws = 'miolo' and tbl = 'conversations')
  ),
  '23503',
  null,
  'mensagem da Vitta não entra em conversa da Miolo (FK composta)'
);
select throws_ok(
  format(
    $$insert into public.delivery_files (workspace_id, version_id, storage_path, mime, size_bytes)
      values (%L, %L, %L, 'text/plain', 1)$$,
    (select miolo from fx), (select id from fx_rows where ws = 'miolo' and tbl = 'delivery_versions'),
    (select vitta from fx)::text || '/deliveries/' || (select id from fx_rows where ws = 'miolo' and tbl = 'deliveries') || '/1/x.txt'
  ),
  '23514',
  null,
  'arquivo da Miolo não usa caminho de Storage com prefixo de outro workspace'
);

select * from finish();
rollback;
