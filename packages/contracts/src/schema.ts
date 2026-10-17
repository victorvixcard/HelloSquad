// Gerado por packages/contracts/scripts/generate.ts (openapi-typescript) a partir de
// packages/contracts/openapi.json. Não edite à mão: rode pnpm --filter contracts generate.

export interface paths {
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Usuário autenticado e os workspaces dele, com o saldo de créditos de cada um */
        get: operations["get_me_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Workspaces de que o usuário participa */
        get: operations["list_workspaces_workspaces_get"];
        put?: never;
        /**
         * Cria um workspace; quem cria vira owner e recebe as boas-vindas do Nexo
         * @description Na mesma transação: o negócio, o idioma (`locale`, opcional) e a conversa direta "Boas-vindas" com a primeira fala do Nexo e a pergunta do objetivo, no idioma do negócio.
         */
        post: operations["create_workspace_workspaces_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Um workspace de que o usuário participa */
        get: operations["get_workspace_workspaces__workspace_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Muda o idioma do negócio (owner ou admin) */
        patch: operations["update_workspace_workspaces__workspace_id__patch"];
        trace?: never;
    };
    "/workspaces/{workspace_id}/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Conversas ativas do workspace (paginação por cursor) */
        get: operations["list_conversations_workspaces__workspace_id__conversations_get"];
        put?: never;
        /**
         * Abre uma conversa (Sala do Squad e conversa de objeto são reutilizadas)
         * @description 201 quando cria; 200 com a conversa existente quando a Sala do Squad do workspace ou a conversa do objeto já existe. Exige papel editor ou acima.
         */
        post: operations["create_conversation_workspaces__workspace_id__conversations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/conversations/unread": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Não lidas da pessoa logada: total, Sala do Squad e por especialista (ambiente) */
        get: operations["unread_summary_workspaces__workspace_id__conversations_unread_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/conversations/{conversation_id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Marca a conversa como lida pela pessoa logada (qualquer membro, até viewer) */
        post: operations["mark_read_conversations__conversation_id__read_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/conversations/{conversation_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Uma conversa, com participantes e o objeto de contexto */
        get: operations["get_conversation_conversations__conversation_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/conversations/{conversation_id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Mensagens da conversa em ordem cronológica (paginação por cursor)
         * @description Sem `before`, a primeira página é a das mensagens mais antigas e `cursor` avança para as mais novas. Com `before=latest`, a primeira página é a das mais recentes e `before` recua para as mais antigas. Nos dois sentidos, `next_cursor` continua a leitura no mesmo parâmetro.
         */
        get: operations["list_messages_conversations__conversation_id__messages_get"];
        put?: never;
        /** Envia uma mensagem na conversa (editor ou acima) */
        post: operations["post_message_conversations__conversation_id__messages_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messages/{message_id}/reply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pede a resposta do squad a uma mensagem da pessoa (um especialista por vez)
         * @description Põe na fila o run de resposta (sem trabalho) de quem responde: `@Nome` de um participante direciona; na conversa em grupo, sem menção, o especialista mais ligado ao pedido (palavras do protótipo) e, sem nenhuma, o Nexo se participa, senão o primeiro; na Sala do Squad, o Nexo; nas outras, quem está à frente. 201 quando cria; 200 com o mesmo run ao repetir. Mensagem que virou trabalho responde 409. Exige papel editor ou acima.
         */
        post: operations["request_reply_messages__message_id__reply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Projetos ativos do workspace (paginação por cursor) */
        get: operations["list_projects_workspaces__workspace_id__projects_get"];
        put?: never;
        /**
         * Cria um projeto com datas e equipe (editor ou acima)
         * @description Quem conduz (`owner_agent_id`, o Nexo por padrão) entra na equipe sozinho.
         */
        post: operations["create_project_workspaces__workspace_id__projects_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messages/{message_id}/work-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Transforma uma mensagem em trabalho e enfileira o run (editor ou acima)
         * @description Cria o trabalho (`draft`), o run `queued` e a mensagem na fila `runs_interactive` na mesma transação. Repetir com a mesma `idempotency_key` (ou, sem chave, a mesma mensagem com o mesmo `delivery_type`) responde 200 com o mesmo trabalho e o mesmo run. Chave já usada em outra mensagem responde 409 `idempotency_key_reused`.
         */
        post: operations["create_work_item_messages__message_id__work_items_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/work-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Trabalhos do workspace para o quadro e a lista (paginação por cursor) */
        get: operations["list_work_items_workspaces__workspace_id__work_items_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{work_item_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Um trabalho com etapas, entregas (versões e arquivos), aprovações, runs e histórico */
        get: operations["get_work_item_work_items__work_item_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/projects/{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Um projeto com a equipe, os marcos e quantos trabalhos foram pedidos nele */
        get: operations["get_project_projects__project_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Altera nome, objetivo, estado, quem conduz ou as datas (editor ou acima)
         * @description Só os campos enviados mudam; `null` em objective, starts_at e ends_at apaga.
         */
        patch: operations["update_project_projects__project_id__patch"];
        trace?: never;
    };
    "/projects/{project_id}/participants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Troca a equipe do projeto (editor ou acima)
         * @description Quem conduz continua na equipe, mesmo fora da lista.
         */
        put: operations["set_participants_projects__project_id__participants_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/projects/{project_id}/milestones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Acrescenta um marco ao roadmap do projeto (editor ou acima) */
        post: operations["add_milestone_projects__project_id__milestones_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/milestones/{milestone_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Altera um marco; `done: true` conclui, `false` reabre (editor ou acima) */
        patch: operations["update_milestone_milestones__milestone_id__patch"];
        trace?: never;
    };
    "/workspaces/{workspace_id}/milestones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** "Próximos marcos": os de todos os projetos que vencem nos próximos dias */
        get: operations["upcoming_milestones_workspaces__workspace_id__milestones_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/needs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * "Precisa de você": o que depende da pessoa agora e o que vem "Em seguida"
         * @description `count` conta só as pendências que dependem da pessoa agora (as adiadas por "Agora não" ficam em `deferred_count`). Os itens `next` são marcos com decisão sua nos próximos 10 dias que ainda não viraram pendência: vêm depois e não entram na contagem.
         */
        get: operations["needs_workspaces__workspace_id__needs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/squad/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Status vivo dos sete especialistas, derivado dos runs e das pendências
         * @description Modos da V4.6 (`idle`, `work`, `wait`, `live`, `sleep`; `monitor` chega com as rotinas) com o rótulo curto ("escrevendo", "aguarda você") e a frase da conversa ("Otto · criando a primeira versão"). Mesma regra do status ao vivo do web: serve para abrir a tela já com o estado certo antes dos eventos do Realtime.
         */
        get: operations["squad_status_workspaces__workspace_id__squad_status_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/calendar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Calendário editorial no período (propostas e pauta; cancelados ficam de fora) */
        get: operations["list_calendar_workspaces__workspace_id__calendar_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/approvals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Decisões do workspace; `status=pending` é a faixa "Precisa de você" */
        get: operations["list_approvals_workspaces__workspace_id__approvals_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/approvals/{approval_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decide uma aprovação (idempotente: repetir devolve o estado atual)
         * @description A primeira decisão vale; repetir (clique duplo, retry) responde 200 com o mesmo estado, sem erro e sem efeito novo. Revisar/aprovar com `approved` aprova a versão e o trabalho; `changes_requested` e `rejected` com `follow_up=revise` devolvem o trabalho ao agente (novo run na fila); `rejected` com `follow_up=cancel` cancela o trabalho; `answered` (responder) devolve ao agente com a resposta. Só o owner decide.
         */
        post: operations["decide_approval_approvals__approval_id__decision_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/approvals/{approval_id}/defer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * "Agora não": adia a autorização sem decidir nem rejeitar (só o owner)
         * @description A autorização continua pendente, sem decisão, e sai de "Precisa de você"; o trabalho não muda de estado, nenhum run nasce e nada é cobrado. Repetir devolve o mesmo estado. Só para `authorize`; decidida responde 409.
         */
        post: operations["defer_approval_approvals__approval_id__defer_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/approvals/{approval_id}/resume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * "Decidir agora": a autorização adiada volta a pedir a decisão (só o owner)
         * @description Volta para "Precisa de você". Sem adiamento, devolve o estado atual.
         */
        post: operations["resume_approval_approvals__approval_id__resume_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Um run (estado da execução de um agente) */
        get: operations["get_run_runs__run_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runs/{run_id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Eventos do run depois de `after` (fallback do Realtime) */
        get: operations["list_run_events_runs__run_id__events_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dossiê da Memória da Marca: por área e assunto, com estado, fonte e quem usa */
        get: operations["get_memory_workspaces__workspace_id__memory_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** "<Agente> percebeu": sugestões do squad, mais recente primeiro */
        get: operations["list_suggestions_workspaces__workspace_id__memory_suggestions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/suggestions/{suggestion_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirmar, corrigir ou descartar uma sugestão (idempotente; só o owner)
         * @description A primeira decisão vale; repetir (clique duplo, retry) responde 200 com o mesmo estado, sem efeito novo. `confirm` e `correct` criam o conhecimento Confirmado (se o mesmo assunto e chave já existem, viram a versão nova dele); `discard` não cria conhecimento e a mesma sugestão não volta. Só o owner decide.
         */
        post: operations["decide_suggestion_memory_suggestions__suggestion_id__decision_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/facts/{fact_id}/correct": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Corrigir um conhecimento: versão nova, Confirmado; a anterior fica no histórico
         * @description Nunca edita: a versão corrigida sai de uso (`superseded_at`) e a nova passa a valer para o squad no próximo run. Repetir o mesmo texto sobre a versão antiga devolve a nova. Descartado não se corrige; em conflito, a correção é pelo conflito. Só o owner corrige.
         */
        post: operations["correct_fact_memory_facts__fact_id__correct_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/facts/{fact_id}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Versões de um conhecimento e as sugestões que o originaram */
        get: operations["fact_history_memory_facts__fact_id__history_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Busca textual nos conhecimentos atuais (chave, valor e assunto)
         * @description Busca do Postgres na configuração do idioma do workspace (ADR-0009): palavras em qualquer ordem, com radical ("palavras" acha "palavra"); aspas para frase exata e `or` para alternativas. Traz todos os estados; Descartado e Não usado vêm marcados pelo estado.
         */
        get: operations["search_memory_workspaces__workspace_id__memory_search_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** "De onde vem": fontes da memória com estado e permissões */
        get: operations["list_sources_workspaces__workspace_id__memory_sources_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/conflicts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Conflitos: duas versões em uso que dizem coisas diferentes */
        get: operations["list_conflicts_workspaces__workspace_id__memory_conflicts_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/conflicts/{conflict_id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Resolver um conflito: "Vale este" ou "Nenhum dos dois: corrigir" (só o owner)
         * @description `keep_fact_id` confirma a versão escolhida; `content` cria uma versão nova Confirmado. A outra sai da memória como Descartado (o registro fica). Repetir devolve o conflito já resolvido.
         */
        post: operations["resolve_conflict_memory_conflicts__conflict_id__resolve_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/facts/{fact_id}/state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Não usar mais, voltar a usar, confirmar ou "continua valendo" (só o owner)
         * @description Muda o estado sem criar versão: `stop_using` guarda o estado de antes e põe Não usado; `resume_using` devolve esse estado; `confirm` vale para Da fonte e Observado; `keep` devolve o Desatualizado a Da fonte. Repetir responde 200 com o mesmo estado; ação que não cabe no estado atual responde 409. Só o owner decide.
         */
        post: operations["change_fact_state_memory_facts__fact_id__state_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/facts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Adicionar conhecimento: declarado por você, já confirmado (só o owner)
         * @description Entra como Confirmado na fonte "Declarado por você" e todo o squad passa a usar. Sem assunto, vai para o primeiro assunto da área; sem chave, "Contado por você" (no idioma do workspace). Com `kind: objective`, a API nomeia o assunto e a chave do objetivo e o Nexo responde na conversa de boas-vindas.
         */
        post: operations["add_fact_workspaces__workspace_id__memory_facts_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/suggestions/{suggestion_id}/seen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Marca "<Agente> percebeu" como visto (aberto → visto; só o owner) */
        post: operations["mark_suggestion_seen_memory_suggestions__suggestion_id__seen_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Descrição do negócio no dossiê (só o owner); a síntese é do squad */
        put: operations["update_profile_workspaces__workspace_id__memory_profile_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/memory/learnings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Aprendizados do squad com este negócio (versão em vigor, mais recente primeiro) */
        get: operations["list_learnings_workspaces__workspace_id__memory_learnings_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/memory/learnings/{learning_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Promover, descartar ou "continua valendo" um aprendizado (idempotente; só o owner)
         * @description Só o owner decide. Repetir a mesma ação responde 200 com o mesmo estado. `keep` vale só para aprendizado promovido (senão 409); versão já substituída responde 409.
         */
        post: operations["decide_learning_memory_learnings__learning_id__decision_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/credits/estimate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Quanto uma entrega custa em créditos antes de pedir (valores provisórios) */
        post: operations["estimate_credits_credits_estimate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/contacts/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Importa contatos de um CSV (só com consentimento; nada é enviado) */
        post: operations["import_contacts_workspaces__workspace_id__contacts_imports_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/contacts/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Resumo da base: total, quem aceita mensagem por canal e de onde vieram os contatos */
        get: operations["contact_summary_workspaces__workspace_id__contacts_summary_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/contacts/consents/revocations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Revoga o consentimento de um contato (owner ou admin; vira histórico e auditoria) */
        post: operations["revoke_consent_workspaces__workspace_id__contacts_consents_revocations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Métricas diárias por canal no período, com unidade, origem e dias sem dado */
        get: operations["list_metrics_workspaces__workspace_id__metrics_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/email-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Avisos por e-mail que a pessoa recebe (os opcionais; sem escolha gravada, recebe) */
        get: operations["list_email_preferences_me_email_preferences_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/email-preferences/{template}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Liga ou desliga um aviso opcional por e-mail da própria pessoa */
        put: operations["set_email_preference_me_email_preferences__template__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/billing/webhooks/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Webhook de pagamento (Asaas, Mercado Pago, simulado): idempotente por event_id
         * @description Sem token de usuário: a origem é verificada pela assinatura do provedor (Asaas: `asaas-access-token`; Mercado Pago: `x-signature` e `x-request-id`; simulado: `x-mock-signature`). Evento repetido responde 200 com `duplicate: true` e não repete efeito.
         */
        post: operations["receive_webhook_billing_webhooks__provider__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/billing/subscription": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Estado da assinatura e próximo ciclo (só o owner; sem valores em dinheiro) */
        get: operations["get_subscription_workspaces__workspace_id__billing_subscription_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspaces/{workspace_id}/billing/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Histórico de pagamentos (só o owner; créditos e estado, sem valores em dinheiro) */
        get: operations["list_payments_workspaces__workspace_id__billing_payments_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Super Admin conectado (nome, e-mail e se a verificação em duas etapas é exigida) */
        get: operations["admin_me_admin_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Contas: lista com plano, saldo e membros, e os totais dos cartões */
        get: operations["list_accounts_admin_accounts_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/accounts/{workspace_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Conta: membros, créditos, extrato, acessos do suporte, uso em 30 dias e assinatura
         * @description Cada leitura fica em audit_events como acesso do suporte (`support.account_viewed`).
         */
        get: operations["get_account_admin_accounts__workspace_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Catálogo das 46 deliveries com o preço provisório em vigor e a homologação */
        get: operations["get_catalog_admin_catalog_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Planos e recargas na versão em vigor (valores provisórios, nada à venda) */
        get: operations["get_plans_admin_plans_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Pagamentos: provedores, assinaturas, cobranças e eventos de webhook */
        get: operations["get_payments_admin_payments_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Auditoria: tudo o que aconteceu, com filtros por autor, conta, tipo e período */
        get: operations["get_audit_admin_audit_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Fila de trabalhos: filas pgmq, contagem por estado e runs (tentativas, posse, erro) */
        get: operations["get_queue_admin_queue_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/queue/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Run com passos (modelo, tokens, custo) e eventos */
        get: operations["get_queue_run_admin_queue_runs__run_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Modelos e custos: preços e câmbio (provisórios), regras por tarefa e custo por modelo */
        get: operations["get_models_admin_models_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/consumption": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consumo por cliente e período: solicitações, créditos, custo de IA e alertas
         * @description Conversa não cobra crédito, mas custa: aparece em `ai_cost_conversation_usd`. Reais pelo câmbio informado em Modelos e custos (provisório). Alertas econômicos comparam IA por crédito, margem bruta estimada (crédito ao valor de referência da faixa, exemplo) e tendência do custo por turno com as faixas de `alert_rules` (proposta); só avisam, nada muda automaticamente. `series` agrupa o conjunto filtrado por dia, semana (começa na segunda) ou mês; balde sem atividade não aparece.
         */
        get: operations["get_consumption_admin_consumption_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Alertas ativos: contas com leitura econômica fora da faixa e saldos abaixo do limiar
         * @description As faixas são proposta (`alert_rules[].proposal`). Alerta só avisa: nenhuma conta, plano, crédito ou provedor muda por causa dele.
         */
        get: operations["get_alerts_admin_alerts_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/quality": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Qualidade das entregas por tipo, por mês e por versão do prompt, com o "como ler"
         * @description Mês e dia da primeira decisão (Brasília). `by_prompt_version` liga cada trabalho à versão do prompt do especialista que produziu a v1 (`runs.prompt_version` → `agent_prompt_versions`, com as versões do painel em `sources`).
         */
        get: operations["get_quality_admin_quality_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/quality/compare": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Comparar a qualidade de dois períodos (mede mudança de prompt ou modelo)
         * @description Período = dia da primeira decisão (Brasília). Contagens viram taxa: não aprovadas e aprovadas de primeira em fração das entregas, ajustes por entrega, erros do agente e chamadas com falha por 100 entregas. `delta` = b − a. Cada período lista as versões de prompt que produziram as entregas dele.
         */
        get: operations["compare_quality_admin_quality_compare_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Saúde das APIs: estado, chave configurada ou ausente, chamadas, falhas, gasto e saldo
         * @description Chamadas, falhas e gasto vêm de `run_steps` (Anthropic: chamadas e autoverificações; motor de imagem: `imagem.gerar`); e-mail só conta envios e falhas, sem custo; Asaas e Mercado Pago sem atividade até a conta existir. Saldo é o último informado à mão; `balance_alert` liga abaixo de `alert_below`. Chave nunca sai: só `configured`/`missing`.
         */
        get: operations["get_providers_admin_providers_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/providers/{provider}/balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Informar o saldo lido no painel do provedor (valor, moeda, data, motivo; auditado)
         * @description Grava o histórico, atualiza o último saldo e, se vier, o limiar do alerta (na moeda do saldo; nulo mantém o atual). Fica em `audit_events` (`admin.provider_balance_reported`) com o Super Admin como autor. Nada mais muda: é o número que o painel mostra.
         */
        patch: operations["report_provider_balance_admin_providers__provider__balance_patch"];
        trace?: never;
    };
    "/admin/squad": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Squad: os sete com versão da Alma e do agent.yaml, rascunhos e custo médio */
        get: operations["get_squad_admin_squad_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/agents/{agent_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Agente: Alma por seção, agent.yaml e skills (ativa e rascunho) */
        get: operations["get_agent_admin_squad_agents__agent_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/agents/{agent_id}/skills/{delivery_type}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Skill de uma delivery: procedimento, formato e critérios (ativa e rascunho) */
        get: operations["get_skill_admin_squad_agents__agent_id__skills__delivery_type__get"];
        /** Editar a skill de uma delivery (arquivo inteiro, com front matter): grava no rascunho */
        put: operations["edit_skill_admin_squad_agents__agent_id__skills__delivery_type__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/shared/{doc}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regras compartilhadas (README.md), conversa.md ou reflexao.md (ativa e rascunho) */
        get: operations["get_shared_admin_squad_shared__doc__get"];
        /** Editar README.md (regras compartilhadas), conversa.md ou reflexao.md: grava rascunho */
        put: operations["edit_shared_admin_squad_shared__doc__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Histórico de versões de uma unidade (SOUL, skill, agent.yaml ou regra compartilhada) */
        get: operations["list_versions_admin_squad_versions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/versions/{version_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Conteúdo de uma versão, como o export grava o arquivo */
        get: operations["get_version_admin_squad_versions__version_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Comparar duas versões da mesma unidade */
        get: operations["diff_versions_admin_squad_diff_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/agents/{agent_id}/prompt": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** O que ele lê: system prompt montado com contexto de exemplo e tokens estimados */
        get: operations["get_prompt_admin_squad_agents__agent_id__prompt_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/agents/{agent_id}/soul/sections/{section}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Editar uma seção da Alma: grava no rascunho (versão nova, não ativa até publicar) */
        put: operations["edit_soul_section_admin_squad_agents__agent_id__soul_sections__section__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/agents/{agent_id}/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Editar ferramentas e limites (agent.yaml): grava no rascunho */
        put: operations["edit_config_admin_squad_agents__agent_id__config_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/versions/{version_id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publicar o rascunho: vira a versão ativa; o próximo run usa */
        post: operations["publish_version_admin_squad_versions__version_id__publish_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/versions/{version_id}/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Descartar o rascunho (fica no histórico como descartado) */
        post: operations["discard_version_admin_squad_versions__version_id__discard_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/squad/versions/{version_id}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Voltar versão: cria uma versão nova, já ativa, com o conteúdo desta */
        post: operations["restore_version_admin_squad_versions__version_id__restore_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regras de negócio: documentos, versão atual, marcações e se entram no prompt */
        get: operations["list_rules_admin_rules_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/rules/{doc_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Documento de regras: parágrafos marcados, versões e o que entra no prompt */
        get: operations["get_rule_doc_admin_rules__doc_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/rules/{doc_id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Gravar versão nova das regras; o que entra no prompt vira rascunho do README.md */
        post: operations["save_rule_doc_admin_rules__doc_id__versions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness: o processo está de pé. Não consulta banco nem serviço externo.
         */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AccountAlerts */
        AccountAlerts: {
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Workspace Name */
            workspace_name: string;
            /** Alerts */
            alerts: components["schemas"]["EconomicAlert"][];
        };
        /** AccountCredits */
        AccountCredits: {
            /** Balance */
            balance: string;
            /** Reserved */
            reserved: string;
            /** Available */
            available: string;
        };
        /** AccountDetail */
        AccountDetail: {
            account: components["schemas"]["AccountSummary"];
            /** Members */
            members: components["schemas"]["AccountMember"][];
            credits: components["schemas"]["AccountCredits"];
            /**
             * Ledger
             * @description Últimos 20 lançamentos do extrato.
             */
            ledger: components["schemas"]["LedgerEntry"][];
            /** Support Accesses */
            support_accesses: components["schemas"]["SupportAccess"][];
            usage_30d: components["schemas"]["UsageTotals"];
            subscription: components["schemas"]["AccountSubscription"] | null;
            /**
             * Audit Event Id
             * Format: uuid
             * @description Registro desta leitura em audit_events (acesso do suporte).
             */
            audit_event_id: string;
        };
        /** AccountMember */
        AccountMember: {
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
            /** Email */
            email: string | null;
            /** Full Name */
            full_name: string | null;
            /** Role */
            role: string;
            /**
             * Member Since
             * Format: date-time
             */
            member_since: string;
            /** Last Sign In At */
            last_sign_in_at: string | null;
        };
        /** AccountPage */
        AccountPage: {
            totals: components["schemas"]["AccountTotals"];
            /** Items */
            items: components["schemas"]["AccountSummary"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /** AccountPlan */
        AccountPlan: {
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /** Provisional */
            provisional: boolean;
        };
        /** AccountSubscription */
        AccountSubscription: {
            /** Status */
            status: string;
            /** Plan */
            plan: string;
            /** Provisional */
            provisional: boolean;
            /** Provider */
            provider: string;
            /** Method */
            method: string;
            /** Current Period End */
            current_period_end: string | null;
        };
        /** AccountSummary */
        AccountSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /** Locale */
            locale: string;
            /**
             * Status
             * @enum {string}
             */
            status: "active" | "deleted";
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            plan: components["schemas"]["AccountPlan"] | null;
            /** Credits Balance */
            credits_balance: string;
            /** Member Count */
            member_count: number;
            /** Owner Email */
            owner_email: string | null;
        };
        /** AccountTotals */
        AccountTotals: {
            /** Accounts */
            accounts: number;
            /** Paid Plans */
            paid_plans: number;
            /** Free Plans */
            free_plans: number;
            /** Credits Balance */
            credits_balance: string;
        };
        /** AdminMe */
        AdminMe: {
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
            /** Email */
            email: string | null;
            /** Full Name */
            full_name: string | null;
            /**
             * Mfa Enforced
             * @description Verificação em duas etapas exigida. false até a Fase 5: o painel avisa.
             */
            mfa_enforced: boolean;
        };
        /** AdminPayment */
        AdminPayment: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Workspace Name */
            workspace_name: string;
            /** Kind */
            kind: string;
            /** Provider */
            provider: string;
            /** Method */
            method: string;
            /** Status */
            status: string;
            /** Amount */
            amount: string;
            /** Currency */
            currency: string;
            /** Credits */
            credits: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Confirmed At */
            confirmed_at: string | null;
        };
        /** AdminSubscription */
        AdminSubscription: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Workspace Name */
            workspace_name: string;
            /** Plan */
            plan: string;
            /** Provisional */
            provisional: boolean;
            /** Provider */
            provider: string;
            /** Method */
            method: string;
            /** Status */
            status: string;
            /** Current Period End */
            current_period_end: string | null;
            /** Amount */
            amount: string | null;
            /** Currency */
            currency: string | null;
        };
        /** AdminWebhookEvent */
        AdminWebhookEvent: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Provider */
            provider: string;
            /** Event Id */
            event_id: string;
            /** Event Type */
            event_type: string;
            /** Workspace Id */
            workspace_id: string | null;
            /** Workspace Name */
            workspace_name: string | null;
            /** Outcome */
            outcome: string | null;
            /** Note */
            note: string | null;
            /**
             * Received At
             * Format: date-time
             */
            received_at: string;
            /** Processed At */
            processed_at: string | null;
        };
        /** AgentDetail */
        AgentDetail: {
            agent: components["schemas"]["SquadAgentSummary"];
            soul: components["schemas"]["SoulVersion"] | null;
            soul_draft: components["schemas"]["SoulVersion"] | null;
            config: components["schemas"]["ConfigVersion"] | null;
            config_draft: components["schemas"]["ConfigVersion"] | null;
            /** Skills */
            skills: components["schemas"]["SkillSummary"][];
        };
        /**
         * AgentId
         * @enum {string}
         */
        AgentId: "nexo" | "bia" | "kaia" | "otto" | "kiwi" | "max" | "iris";
        /** AgentLearning */
        AgentLearning: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            agent_id: components["schemas"]["AgentId"];
            /**
             * Delivery Type
             * @description Delivery do catálogo em que o agente aprendeu, ex.: 04.01.
             */
            delivery_type: string;
            /**
             * Topic
             * @description Assunto do aprendizado (ex.: Vocabulário, Tratamento).
             */
            topic: string;
            /** Learning */
            learning: string;
            /**
             * Evidence Refs
             * @description De onde veio: `correction` (o que a pessoa pediu, com a nota), `version` (versão entregue) e `decision` (decisão final), cada uma com o trabalho de origem.
             */
            evidence_refs: {
                [key: string]: unknown;
            }[];
            /** Confidence */
            confidence: number;
            /** @description `candidate` fica fora do contexto até o owner promover; `promoted` entra no contexto do agente nesta delivery; `discarded` não volta. */
            status: components["schemas"]["AgentLearningStatus"];
            /**
             * Promotion Rule
             * @description `explicit_correction` a pessoa corrigiu com as próprias palavras; `repeated` a mesma lição em trabalhos diferentes; `owner` o owner promoveu.
             */
            promotion_rule: ("explicit_correction" | "repeated" | "owner") | null;
            /** Version */
            version: number;
            /** Supersedes Id */
            supersedes_id: string | null;
            /** Work Item Id */
            work_item_id: string | null;
            /** Decided At */
            decided_at: string | null;
            /**
             * Reviewed At
             * @description Último "continua valendo" do owner.
             */
            reviewed_at: string | null;
            /**
             * Stale
             * @description Promovido sem "continua valendo" há LEARNING_REVIEW_DAYS dias: entra no contexto marcado para o agente revisar.
             */
            stale: boolean;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * AgentLearningDecisionCreate
         * @example {
         *       "action": "promote"
         *     }
         */
        AgentLearningDecisionCreate: {
            /**
             * Action
             * @description `promote` "Promover" (entra no contexto do agente); `discard` "Descartar" (sai e não volta); `keep` "Continua valendo" (só promovido; renova a revisão). Repetir devolve o mesmo estado.
             * @enum {string}
             */
            action: "promote" | "discard" | "keep";
        };
        /** AgentLearningList */
        AgentLearningList: {
            /** Items */
            items: components["schemas"]["AgentLearning"][];
        };
        /**
         * AgentLearningStatus
         * @enum {string}
         */
        AgentLearningStatus: "candidate" | "promoted" | "discarded";
        /** AgentStatus */
        AgentStatus: {
            agent_id: components["schemas"]["AgentId"];
            /**
             * Mode
             * @enum {string}
             */
            mode: "idle" | "work" | "wait" | "live" | "monitor" | "sleep";
            /**
             * Status Short
             * @description Rótulo curto (`_shortNow`).
             * @example escrevendo
             */
            status_short: string;
            /**
             * Status Label
             * @description Frase da conversa.
             * @example Otto · criando a primeira versão
             */
            status_label: string | null;
            /** Run Id */
            run_id?: string | null;
            /** Work Item Id */
            work_item_id?: string | null;
            /** Conversation Id */
            conversation_id?: string | null;
            /** Approval Id */
            approval_id?: string | null;
        };
        /** AgentUnread */
        AgentUnread: {
            /** Conversations */
            conversations: number;
            /** Messages */
            messages: number;
            agent_id: components["schemas"]["AgentId"];
        };
        /** AlertRule */
        AlertRule: {
            /**
             * Metric
             * @enum {string}
             */
            metric: "ai_cost_per_credit_brl" | "gross_margin" | "cost_per_turn_trend";
            /**
             * Comparison
             * @description max = OK até o limite (acima, atenção); min = OK a partir do limite.
             * @enum {string}
             */
            comparison: "max" | "min";
            /**
             * Threshold
             * @description R$ por crédito, ou fração (0,65 = 65%; 0,10 = +10%).
             */
            threshold: string;
            /**
             * Credit Reference Brl
             * @description Valor do crédito em R$ usado na margem (exemplo do protótipo, provisório).
             */
            credit_reference_brl: string | null;
            /** Window Days */
            window_days: number | null;
            /**
             * Proposal
             * @description Faixa ainda é proposta; o Vic decide.
             */
            proposal: boolean;
            /** Source */
            source: string;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
        };
        /** AlertsResponse */
        AlertsResponse: {
            /**
             * Since
             * Format: date
             */
            since: string;
            /**
             * Until
             * Format: date
             */
            until: string;
            /**
             * Accounts
             * @description Só as contas com alguma leitura fora da faixa.
             */
            accounts: components["schemas"]["AccountAlerts"][];
            /**
             * Providers
             * @description Saldo informado abaixo do limiar.
             */
            providers: components["schemas"]["ProviderBalanceAlert"][];
            /** Alert Rules */
            alert_rules: components["schemas"]["AlertRule"][];
        };
        /** Approval */
        Approval: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** @description `review` revisar, `approve` aprovar, `authorize` autorizar ação externa, `confirm` confirmar, `reconnect` reconectar, `respond` responder, `decide` decidir (escolher entre opções). Só o owner decide. */
            kind: components["schemas"]["ApprovalKind"];
            status: components["schemas"]["ApprovalStatus"];
            decision: components["schemas"]["ApprovalDecision"] | null;
            /**
             * Follow Up
             * @description Saída da rejeição: `cancel` cancela o trabalho; `revise` pede nova proposta.
             */
            follow_up: ("cancel" | "revise") | null;
            requested_by_agent_id: components["schemas"]["AgentId"];
            /** Delivery Version Id */
            delivery_version_id: string | null;
            /** Delivery Version No */
            delivery_version_no: number | null;
            /** Run Id */
            run_id: string | null;
            /** Decided By */
            decided_by: string | null;
            /** Decided At */
            decided_at: string | null;
            /** Note */
            note: string | null;
            /** Due At */
            due_at: string | null;
            /**
             * Deferred
             * @description "Agora não": pendente, mas fora de "Precisa de você" até decidir de novo.
             * @default false
             */
            deferred: boolean;
            /** Deferred At */
            deferred_at?: string | null;
            /**
             * Deferred Until
             * @description Até quando fica adiada; nulo = até a pessoa decidir.
             */
            deferred_until?: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            work_item: components["schemas"]["ApprovalWorkItem"];
        };
        /**
         * ApprovalDecision
         * @enum {string}
         */
        ApprovalDecision: "approved" | "rejected" | "changes_requested" | "answered";
        /**
         * ApprovalDecisionCreate
         * @example {
         *       "decision": "approved"
         *     }
         * @example {
         *       "decision": "changes_requested",
         *       "note": "Troque o horário para 7h."
         *     }
         * @example {
         *       "decision": "rejected",
         *       "follow_up": "revise",
         *       "note": "Quero outra abordagem."
         *     }
         * @example {
         *       "decision": "rejected",
         *       "follow_up": "cancel"
         *     }
         */
        ApprovalDecisionCreate: {
            /** @description `review`/`approve`: approved, changes_requested ou rejected. `authorize`/`confirm`/`reconnect`: approved ou rejected. `respond` e `decide`: answered (a escolha vai em `note`). */
            decision: components["schemas"]["ApprovalDecision"];
            /**
             * Note
             * @description Observação de quem decide (até 2.000 caracteres).
             */
            note?: string | null;
            /**
             * Follow Up
             * @description Obrigatório ao rejeitar uma entrega (`review`/`approve`): `cancel` cancela o trabalho; `revise` devolve ao agente para uma nova proposta. Não vale para outras decisões.
             */
            follow_up?: ("cancel" | "revise") | null;
        };
        /**
         * ApprovalDefer
         * @example {}
         */
        ApprovalDefer: {
            /**
             * Until
             * @description Quando voltar a pedir; sem data, fica para quando a pessoa quiser.
             */
            until?: string | null;
        };
        /**
         * ApprovalKind
         * @enum {string}
         */
        ApprovalKind: "review" | "approve" | "authorize" | "confirm" | "reconnect" | "respond" | "decide";
        /** ApprovalPage */
        ApprovalPage: {
            /**
             * Items
             * @description Mais antiga primeiro.
             */
            items: components["schemas"]["Approval"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /**
         * ApprovalStatus
         * @enum {string}
         */
        ApprovalStatus: "pending" | "decided" | "expired";
        /** ApprovalWorkItem */
        ApprovalWorkItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Title
             * @example Legenda do post de sábado: pão de fermentação longa
             */
            title: string;
            status: components["schemas"]["WorkItemStatus"];
            /**
             * Delivery Type
             * @example 04.01
             */
            delivery_type: string | null;
            primary_agent_id: components["schemas"]["AgentId"];
        };
        /** AuditItem */
        AuditItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Actor
             * @enum {string}
             */
            actor: "platform_admin" | "customer" | "system";
            /** Actor Type */
            actor_type: string;
            /** Actor Id */
            actor_id: string | null;
            /** Actor Email */
            actor_email: string | null;
            /** Actor Name */
            actor_name: string | null;
            /** Workspace Id */
            workspace_id: string | null;
            /** Workspace Name */
            workspace_name: string | null;
            /** Category */
            category: string;
            /** Action */
            action: string;
            /** Entity Type */
            entity_type: string | null;
            /** Entity Id */
            entity_id: string | null;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
        };
        /** AuditPage */
        AuditPage: {
            /** Items */
            items: components["schemas"]["AuditItem"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /** BalanceReport */
        BalanceReport: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Amount */
            amount: string;
            /** Currency */
            currency: string;
            /**
             * Read At
             * Format: date-time
             */
            read_at: string;
            /** Alert Below */
            alert_below: string | null;
            /** Reason */
            reason: string;
            /**
             * Reported By
             * Format: uuid
             */
            reported_by: string;
            /** Reported By Email */
            reported_by_email: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** BalanceUpdate */
        BalanceUpdate: {
            /** Amount */
            amount: number | string;
            /** Currency */
            currency: string;
            /**
             * Read At
             * Format: date-time
             * @description Quando o saldo foi lido no painel do provedor.
             */
            read_at: string;
            /** Reason */
            reason: string;
            /**
             * Alert Below
             * @description Nulo mantém o limiar atual.
             */
            alert_below?: number | string | null;
        };
        /** BrandFact */
        BrandFact: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** @description `business` Meu negócio, `brand` Minha marca, `audience` Meu público, `knowledge` Conhecimento e aprendizados. */
            area: components["schemas"]["MemoryArea"];
            /**
             * Topic
             * @description Assunto dentro da área.
             * @example Tom de voz
             */
            topic: string;
            /**
             * Key
             * @example Palavra proibida
             */
            key: string;
            /**
             * Content
             * @example Não usar a palavra 'artesanal' nas legendas
             */
            content: string;
            /** Content Json */
            content_json: unknown | null;
            /** @description `confirmed` Confirmado, `decision` Decisão sua, `from_source` Da fonte, `observed` Observado, `suggested` Sugerido, `outdated` Desatualizado, `discarded` Descartado, `conflicting` Em conflito, `unused` Não usado. O squad usa só Confirmado e Decisão sua como orientação. */
            state: components["schemas"]["BrandFactState"];
            source_type: components["schemas"]["FactSourceKind"];
            /** Source Id */
            source_id: string | null;
            /**
             * Origin
             * @example Contado por você no cadastro
             */
            origin: string | null;
            /**
             * Used By Agents
             * @description Agentes que usam este conhecimento.
             */
            used_by_agents: components["schemas"]["AgentId"][];
            /** @description Quem percebeu ("<Agente> percebeu"). */
            perceived_by_agent_id: components["schemas"]["AgentId"] | null;
            /** Confidence */
            confidence: number | null;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /** Version */
            version: number;
            /**
             * Supersedes Id
             * @description Versão anterior que esta corrigiu.
             */
            supersedes_id: string | null;
            /**
             * Superseded At
             * @description Nulo = versão atual.
             */
            superseded_at: string | null;
            /** Confirmed By */
            confirmed_by: string | null;
            /** Confirmed At */
            confirmed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /** @description Estado antes de "Não usar mais" ("Voltar a usar" volta para ele). */
            unused_from?: components["schemas"]["BrandFactState"] | null;
        };
        /**
         * BrandFactCorrection
         * @example {
         *       "content": "Acolhedor, direto e com humor leve."
         *     }
         */
        BrandFactCorrection: {
            /**
             * Content
             * @description O valor certo. Vira uma versão nova, Confirmado.
             */
            content: string;
        };
        /**
         * BrandFactCreate
         * @example {
         *       "area": "business",
         *       "content": "Aos domingos a loja fecha às 13h"
         *     }
         */
        BrandFactCreate: {
            area: components["schemas"]["MemoryArea"];
            /**
             * Content
             * @description "O que o squad precisa saber?"
             */
            content: string;
            /**
             * Topic
             * @description Assunto; sem ele, o primeiro assunto da área.
             */
            topic?: string | null;
            /**
             * Key
             * @description Chave; sem ela, "Contado por você".
             */
            key?: string | null;
            /**
             * Kind
             * @description `objective`: o objetivo contado ao Nexo no primeiro acesso. A API nomeia assunto e chave no idioma do negócio ("Objetivos" · "Objetivo atual") e o Nexo responde na conversa de boas-vindas. Vale só em `business`, sem `topic` nem `key`.
             */
            kind?: "objective" | null;
        };
        /** BrandFactHistory */
        BrandFactHistory: {
            /**
             * Fact Id
             * Format: uuid
             */
            fact_id: string;
            /**
             * Versions
             * @description Da versão mais nova para a mais antiga.
             */
            versions: components["schemas"]["BrandFact"][];
            /**
             * Suggestions
             * @description Sugestões ("<Agente> percebeu") que deram origem a alguma versão.
             */
            suggestions: components["schemas"]["MemorySuggestion"][];
        };
        /**
         * BrandFactState
         * @enum {string}
         */
        BrandFactState: "confirmed" | "decision" | "from_source" | "observed" | "suggested" | "outdated" | "discarded" | "conflicting" | "unused";
        /**
         * BrandFactStateChange
         * @example {
         *       "action": "stop_using"
         *     }
         */
        BrandFactStateChange: {
            /**
             * Action
             * @description `stop_using` "Não usar mais" (Confirmado, Decisão sua, Da fonte, Observado, Desatualizado → Não usado); `resume_using` "Voltar a usar" (Não usado → o estado de antes); `confirm` "Confirmar" (Da fonte ou Observado → Confirmado); `keep` "Continua valendo" (Desatualizado → Da fonte). Repetir devolve o mesmo estado.
             * @enum {string}
             */
            action: "stop_using" | "resume_using" | "confirm" | "keep";
        };
        /** BrandProfile */
        BrandProfile: {
            /**
             * Description
             * @description Descrição do negócio, escrita pelo dono.
             */
            description: string | null;
            /**
             * Squad Summary
             * @description "O que o squad sabe": síntese do squad.
             */
            squad_summary: string | null;
            summary_agent_id: components["schemas"]["AgentId"] | null;
            /** Summary Updated At */
            summary_updated_at: string | null;
        };
        /** BrandProfileUpdate */
        BrandProfileUpdate: {
            /**
             * Description
             * @description Vazio ou nulo apaga.
             */
            description: string | null;
        };
        /** CalendarPage */
        CalendarPage: {
            /** Items */
            items: components["schemas"]["CalendarPost"][];
        };
        /** CalendarPost */
        CalendarPost: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Scheduled On
             * Format: date
             */
            scheduled_on: string;
            /** Scheduled Time */
            scheduled_time: string | null;
            /**
             * Channel
             * @description Id do canal; o web traduz.
             * @example instagram
             */
            channel: string;
            /**
             * Format
             * @description Id do formato; o web traduz.
             * @example reels
             */
            format: string;
            /**
             * Theme
             * @example Bastidores da fermentação longa
             */
            theme: string;
            /** @description Responsável no squad. */
            owner_agent_id: components["schemas"]["AgentId"];
            /**
             * Status
             * @description `draft` (proposta na versão em revisão), `planned` (pauta aprovada), `scheduled` e `published` (Fase 3).
             * @example planned
             */
            status: string;
            /** Notes */
            notes: string | null;
            /**
             * Work Item Id
             * @description Trabalho da 04.02 que propôs o post.
             */
            work_item_id: string | null;
            /** Delivery Version Id */
            delivery_version_id: string | null;
            /**
             * Version No
             * @description Número da versão da 04.02 que propôs o post.
             */
            version_no?: number | null;
            /**
             * Work Item Title
             * @description Título do trabalho.
             * @example Calendário da semana 43
             */
            work_item_title?: string | null;
            /**
             * Objective
             * @description Objetivo do post na entrega que o propôs.
             */
            objective?: string | null;
        };
        /** CardAction */
        CardAction: {
            /**
             * Id
             * @description Botão do cartão, traduzido pelo catálogo do web (`approve`, `request_changes`, `answer`, `choose`, `open`).
             * @example approve
             */
            id: string;
            /** @description Decisão que o botão manda em `POST /approvals/{id}/decision`. */
            decision?: components["schemas"]["ApprovalDecision"] | null;
        };
        /** CardMember */
        CardMember: {
            agent_id: components["schemas"]["AgentId"];
            /**
             * Responsibility
             * @example estratégia e conceito
             */
            responsibility?: string | null;
        };
        /** CardOption */
        CardOption: {
            /** Id */
            id: string;
            /**
             * Label
             * @example Nos dois
             */
            label: string;
        };
        /** CatalogItem */
        CatalogItem: {
            /** Delivery Type */
            delivery_type: string;
            /** Agent Id */
            agent_id: string;
            /** Name */
            name: string;
            /** Result */
            result: string;
            /** Depth */
            depth: string;
            /**
             * Depth Source
             * @enum {string}
             */
            depth_source: "inferred" | "confirmed";
            /** Integrations */
            integrations: string | null;
            /** Prerequisites */
            prerequisites: string | null;
            /** Catalog Status */
            catalog_status: string;
            /** Homologation Status */
            homologation_status: string;
            /** For Sale */
            for_sale: boolean;
            price: components["schemas"]["CatalogPrice"] | null;
        };
        /** CatalogPrice */
        CatalogPrice: {
            /** Credits */
            credits: string;
            /** Revision Credits */
            revision_credits: string | null;
            /** Provisional */
            provisional: boolean;
            /** Approved Commercially */
            approved_commercially: boolean;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
            /** Versions */
            versions: number;
        };
        /** CatalogResponse */
        CatalogResponse: {
            /** Items */
            items: components["schemas"]["CatalogItem"][];
        };
        /** ConfigEdit */
        ConfigEdit: {
            /**
             * Yaml
             * @description agent.yaml inteiro.
             */
            yaml?: string | null;
            /**
             * Tools
             * @description Ferramentas permitidas; mantém os comentários das que ficam no agent.yaml.
             */
            tools?: string[] | null;
            /** Max Autonomy */
            max_autonomy?: ("analisar" | "preparar" | "executar") | null;
            /** Note */
            note?: string | null;
        };
        /** ConfigFields */
        ConfigFields: {
            /** Tools */
            tools: string[];
            /**
             * Tool Notes
             * @description Comentário de cada ferramenta no agent.yaml (condição de uso).
             */
            tool_notes: {
                [key: string]: string;
            };
            /** Collaborators */
            collaborators: string[];
            /** Max Autonomy */
            max_autonomy: string | null;
            /** Model */
            model: {
                [key: string]: unknown;
            };
            /** Memory */
            memory: {
                [key: string]: unknown;
            };
            /** Deliveries */
            deliveries: string[];
        };
        /** ConfigVersion */
        ConfigVersion: {
            ref: components["schemas"]["VersionRef"];
            /** Yaml */
            yaml: string;
            fields: components["schemas"]["ConfigFields"];
        };
        /** ConsentCounts */
        ConsentCounts: {
            /** Email */
            email: number;
            /** Whatsapp */
            whatsapp: number;
            /**
             * Any Channel
             * @description Aceitam receber mensagens em ao menos um canal.
             */
            any_channel: number;
        };
        /** ConsentRevocation */
        ConsentRevocation: {
            /**
             * Contact Id
             * Format: uuid
             */
            contact_id: string;
            /**
             * Revoked
             * @description Canais revogados agora (vazio quando já não havia consentimento vigente).
             */
            revoked: ("email" | "whatsapp")[];
            /**
             * Consents
             * @description Consentimento vigente do contato por canal.
             */
            consents: components["schemas"]["ConsentState"][];
        };
        /** ConsentRevocationRequest */
        ConsentRevocationRequest: {
            /**
             * Email
             * @description E-mail do contato (este ou o telefone).
             */
            email?: string | null;
            /**
             * Phone
             * @description Telefone do contato, com DDD (este ou o e-mail).
             */
            phone?: string | null;
            /**
             * Channel
             * @description Canal revogado; sem ele, todos.
             */
            channel?: ("email" | "whatsapp") | null;
            /**
             * Source
             * @description Origem do pedido de revogação, registrada com ela.
             * @example Pedido da cliente no balcão
             */
            source: string;
        };
        /** ConsentState */
        ConsentState: {
            /**
             * Channel
             * @enum {string}
             */
            channel: "email" | "whatsapp";
            /**
             * Status
             * @enum {string}
             */
            status: "granted" | "revoked";
            /**
             * Given At
             * Format: date
             * @description Data do consentimento ou da revogação vigente.
             */
            given_at: string;
        };
        /** ConsumptionBucket */
        ConsumptionBucket: {
            /**
             * Period Start
             * Format: date
             */
            period_start: string;
            /** Requests */
            requests: number;
            /** Credits Charged */
            credits_charged: string;
            /** Llm Calls */
            llm_calls: number;
            /** Ai Cost Deliveries Usd */
            ai_cost_deliveries_usd: string;
            /** Ai Cost Conversation Usd */
            ai_cost_conversation_usd: string;
            /** Ai Cost Usd */
            ai_cost_usd: string;
            /** Ai Cost Brl */
            ai_cost_brl: string | null;
            /** Turns */
            turns: number;
            /** Turn Cost Usd */
            turn_cost_usd: string;
            /** Ai Cost Per Credit Brl */
            ai_cost_per_credit_brl: string | null;
            /** Gross Margin */
            gross_margin: string | null;
            /** Cost Per Turn Usd */
            cost_per_turn_usd: string | null;
        };
        /** ConsumptionResponse */
        ConsumptionResponse: {
            /**
             * Since
             * Format: date
             */
            since: string;
            /**
             * Until
             * Format: date
             */
            until: string;
            /** Usd Brl */
            usd_brl: string | null;
            /** Items */
            items: components["schemas"]["ConsumptionRow"][];
            totals: components["schemas"]["UsageTotals"];
            /**
             * Granularity
             * @enum {string}
             */
            granularity: "day" | "week" | "month";
            /**
             * Series
             * @description Conjunto filtrado (todas as contas ou `workspace_id`) por dia, semana ou mês.
             */
            series: components["schemas"]["ConsumptionBucket"][];
            /** @description Leituras do conjunto filtrado. */
            economics: components["schemas"]["EconomicReadings"];
            /** Alert Rules */
            alert_rules: components["schemas"]["AlertRule"][];
            margin_basis: components["schemas"]["MarginBasis"];
        };
        /** ConsumptionRow */
        ConsumptionRow: {
            /** Requests */
            requests: number;
            /** Credits Charged */
            credits_charged: string;
            /** Llm Calls */
            llm_calls: number;
            /** Conversation Calls */
            conversation_calls: number;
            /** Input Tokens */
            input_tokens: number;
            /** Cache Read Tokens */
            cache_read_tokens: number;
            /** Cache Write Tokens */
            cache_write_tokens: number;
            /** Output Tokens */
            output_tokens: number;
            /** Ai Cost Deliveries Usd */
            ai_cost_deliveries_usd: string;
            /** Ai Cost Conversation Usd */
            ai_cost_conversation_usd: string;
            /** Ai Cost Usd */
            ai_cost_usd: string;
            /**
             * Turns
             * @description Runs com chamada de IA (cada resposta de um agente).
             */
            turns: number;
            /** Conversation Turns */
            conversation_turns: number;
            /** Turn Cost Usd */
            turn_cost_usd: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Workspace Name */
            workspace_name: string;
            /** Ai Cost Brl */
            ai_cost_brl: string | null;
            /** Ai Cost Per Credit Brl */
            ai_cost_per_credit_brl: string | null;
            economics: components["schemas"]["EconomicReadings"];
        };
        /** ContactImport */
        ContactImport: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** File Name */
            file_name: string;
            /** Source */
            source: string;
            /** Total Rows */
            total_rows: number;
            /** Accepted Rows */
            accepted_rows: number;
            /** Refused Rows */
            refused_rows: number;
            /**
             * Revoked Rows
             * @description Linhas de contatos que já estavam na base e revogaram o consentimento ("não" explícito, nenhum "sim").
             * @default 0
             */
            revoked_rows: number;
            /**
             * Refused
             * @description Linhas recusadas: número e motivo, sem o dado.
             */
            refused: components["schemas"]["RefusedLine"][];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ContactImportRequest */
        ContactImportRequest: {
            /**
             * File Name
             * @example clientes-balcao.csv
             */
            file_name: string;
            /**
             * Source
             * @description Origem dos dados, registrada em cada contato e consentimento.
             * @example Planilha de clientes do balcão
             */
            source: string;
            /**
             * Csv
             * @description Conteúdo do CSV (vírgula ou ponto e vírgula), com cabeçalho: nome, email, telefone, consentimento_email, consentimento_whatsapp (sim/não), data_consentimento (AAAA-MM-DD ou DD/MM/AAAA) e, opcionais, ultima_compra e compras.
             */
            csv: string;
        };
        /** ContactSource */
        ContactSource: {
            /** Source */
            source: string;
            /** Contacts */
            contacts: number;
        };
        /** ContactSummary */
        ContactSummary: {
            /** Total */
            total: number;
            consented: components["schemas"]["ConsentCounts"];
            /**
             * Without Consent
             * @description Não recebem mensagem em canal nenhum.
             */
            without_consent: number;
            /** Sources */
            sources: components["schemas"]["ContactSource"][];
            /** Last Import At */
            last_import_at: string | null;
        };
        /** ContentEdit */
        ContentEdit: {
            /** Content */
            content: string;
            /** Note */
            note?: string | null;
        };
        /** ContextRef */
        ContextRef: {
            /** @description Tipo do objeto de onde a conversa foi aberta. */
            type: components["schemas"]["ContextType"];
            /**
             * Id
             * @description Id do objeto, no mesmo workspace: `project`, `work_item`, `delivery`, `memory_fact`, `insight` ("<Agente> percebeu") e `calendar_post` (post do calendário editorial; o post que ainda não mora no banco continua vindo pela chave).
             */
            id?: string | null;
            /**
             * Key
             * @description Chave do objeto que ainda não mora no banco: `calendar_post`, `metric`, `opportunity`, `responsibility`, `segment`, `document`, `capability` (o código da delivery, ex.: `04.01`) e `environment` (o agente do ambiente, ex.: `bia`; uma conversa por ambiente, com o agente do ambiente à frente). Exclusiva com `id`.
             * @example 04.01
             */
            key?: string | null;
            /**
             * Title
             * @description Título no cartão. Obrigatório para objeto que vem pela chave.
             */
            title?: string | null;
            /**
             * Status
             * @description Estado do objeto que vem pela chave.
             */
            status?: string | null;
            /** Summary */
            summary?: string | null;
            /**
             * Period
             * @description Período da página de onde a conversa abriu.
             * @example Semana 42
             */
            period?: string | null;
            /**
             * Origin
             * @description De onde a pessoa abriu.
             * @example Calendário · semana
             */
            origin?: string | null;
        };
        /**
         * ContextType
         * @enum {string}
         */
        ContextType: "project" | "work_item" | "delivery" | "memory_fact" | "insight" | "calendar_post" | "metric" | "opportunity" | "responsibility" | "segment" | "document" | "capability" | "environment";
        /** Conversation */
        Conversation: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            kind: components["schemas"]["ConversationKind"];
            primary_agent_id: components["schemas"]["AgentId"] | null;
            /** Context Type */
            context_type: string | null;
            /** Context Id */
            context_id: string | null;
            /** Context Key */
            context_key?: string | null;
            /**
             * Title
             * @example Conversa com o Otto
             */
            title: string | null;
            /**
             * Topic
             * @description Tópico da Sala do Squad; nulo = "Pedidos grandes".
             * @example Campanha de Natal
             */
            topic?: string | null;
            /**
             * Agent Ids
             * @description Especialistas que participam, na ordem do squad.
             * @example [
             *       "bia",
             *       "kaia"
             *     ]
             */
            agent_ids?: components["schemas"]["AgentId"][];
            /** Created By */
            created_by: string | null;
            /** Last Message At */
            last_message_at: string | null;
            /** Archived At */
            archived_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Last Read At
             * @description Até onde a pessoa logada leu.
             */
            last_read_at?: string | null;
            /**
             * Unread Count
             * @description Mensagens de outros (agentes, sistema, outras pessoas) depois de `last_read_at`.
             * @default 0
             */
            unread_count: number;
        };
        /** ConversationContext */
        ConversationContext: {
            /**
             * Type
             * @example work_item
             */
            type: string;
            /**
             * Id
             * @description Id do objeto que mora no banco.
             */
            id: string | null;
            /**
             * Key
             * @description Chave do objeto que ainda não mora no banco.
             */
            key?: string | null;
            /**
             * Title
             * @description Título do objeto (nulo se o objeto não existe mais).
             * @example Legenda do post de sábado: pão de fermentação longa
             */
            title: string | null;
            /**
             * Status
             * @description Estado do objeto, quando ele tem estado.
             */
            status: string | null;
            /** Summary */
            summary?: string | null;
            /**
             * Period
             * @description Período, quando há.
             * @example Semana 42
             */
            period?: string | null;
            /**
             * Origin
             * @description De onde a pessoa abriu.
             * @example Calendário · semana
             */
            origin?: string | null;
        };
        /**
         * ConversationCreate
         * @example {
         *       "kind": "agent_direct",
         *       "primary_agent_id": "otto"
         *     }
         * @example {
         *       "kind": "squad_room"
         *     }
         * @example {
         *       "agent_ids": [
         *         "bia",
         *         "kaia",
         *         "otto"
         *       ],
         *       "kind": "group"
         *     }
         * @example {
         *       "context": {
         *         "id": "5eed0000-0000-4000-8000-000000000301",
         *         "type": "work_item"
         *       },
         *       "kind": "object"
         *     }
         * @example {
         *       "context": {
         *         "key": "alcance:semana",
         *         "origin": "Resultados · semana",
         *         "period": "Semana 42",
         *         "title": "Alcance da semana",
         *         "type": "metric"
         *       },
         *       "kind": "object",
         *       "primary_agent_id": "iris"
         *     }
         */
        ConversationCreate: {
            /** @description `squad_room`: Sala do Squad (uma por workspace, reutilizada). `agent_direct`: conversa direta com um agente (sempre nova). `object`: conversa de um objeto (uma por objeto, reutilizada; `capability` abre uma por pedido). `group`: conversa em grupo com 2 a 6 especialistas (uma por conjunto, reutilizada; responde um especialista por vez). */
            kind: components["schemas"]["ConversationKind"];
            /** @description Agente à frente. Obrigatório em `agent_direct`; na Sala do Squad o padrão é o Nexo; na conversa de objeto, o responsável pelo objeto. */
            primary_agent_id?: components["schemas"]["AgentId"] | null;
            /** @description Só em `kind = object`. */
            context?: components["schemas"]["ContextRef"] | null;
            /**
             * Agent Ids
             * @description Só em `kind = group`: os especialistas escolhidos no Início, de 2 a 6.
             */
            agent_ids?: components["schemas"]["AgentId"][] | null;
            /** Title */
            title?: string | null;
        };
        /** ConversationDetail */
        ConversationDetail: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            kind: components["schemas"]["ConversationKind"];
            primary_agent_id: components["schemas"]["AgentId"] | null;
            /** Context Type */
            context_type: string | null;
            /** Context Id */
            context_id: string | null;
            /** Context Key */
            context_key?: string | null;
            /**
             * Title
             * @example Conversa com o Otto
             */
            title: string | null;
            /**
             * Topic
             * @description Tópico da Sala do Squad; nulo = "Pedidos grandes".
             * @example Campanha de Natal
             */
            topic?: string | null;
            /**
             * Agent Ids
             * @description Especialistas que participam, na ordem do squad.
             * @example [
             *       "bia",
             *       "kaia"
             *     ]
             */
            agent_ids?: components["schemas"]["AgentId"][];
            /** Created By */
            created_by: string | null;
            /** Last Message At */
            last_message_at: string | null;
            /** Archived At */
            archived_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Last Read At
             * @description Até onde a pessoa logada leu.
             */
            last_read_at?: string | null;
            /**
             * Unread Count
             * @description Mensagens de outros (agentes, sistema, outras pessoas) depois de `last_read_at`.
             * @default 0
             */
            unread_count: number;
            /** Participants */
            participants: components["schemas"]["Participant"][];
            /** @description Cartão do objeto (só em `object`). */
            context: components["schemas"]["ConversationContext"] | null;
            /** @description Só na conversa do ambiente (`environment`): a primeira fala do agente e as sugestões do ambiente, calculadas a cada leitura. */
            opening?: components["schemas"]["ConversationOpening"] | null;
        };
        /**
         * ConversationKind
         * @enum {string}
         */
        ConversationKind: "squad_room" | "agent_direct" | "object" | "group";
        /** ConversationOpening */
        ConversationOpening: {
            agent_id: components["schemas"]["AgentId"];
            /**
             * Message
             * @description Primeira fala do agente do ambiente (V4.6 `_cxEnvFirst`), no idioma do workspace e com o estado de agora.
             * @example Oi, eu sou a Bia. Disponível. O que você precisa?
             */
            message: string;
            /**
             * Suggestions
             * @description Sugestões de pergunta ("Pergunte à Bia"); somem depois da primeira mensagem da pessoa.
             * @example [
             *       "Onde a Miolo pode crescer até o Natal?"
             *     ]
             */
            suggestions: string[];
        };
        /** ConversationPage */
        ConversationPage: {
            /**
             * Items
             * @description Conversas ativas, a de atividade mais recente antes.
             */
            items: components["schemas"]["Conversation"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /** ConversationRead */
        ConversationRead: {
            /**
             * Conversation Id
             * Format: uuid
             */
            conversation_id: string;
            /**
             * Last Read At
             * Format: date-time
             */
            last_read_at: string;
            /** Unread Count */
            unread_count: number;
        };
        /** CreditBalance */
        CreditBalance: {
            /**
             * Plan
             * @description Nome do plano da conta.
             * @example Squad
             */
            plan: string | null;
            /**
             * Provisional
             * @description Valores provisórios (dono, 16/10): ainda não são regra comercial.
             */
            provisional: boolean;
            /**
             * Balance
             * @description Soma do extrato dos grants válidos (inclui o reservado).
             */
            balance: number;
            /**
             * Reserved
             * @description Reservado pelos runs em andamento.
             */
            reserved: number;
            /**
             * Available
             * @description Disponível para novas entregas: saldo − reservado.
             */
            available: number;
            /**
             * Cycle Credits
             * @description Créditos do ciclo do plano vigente (barra créditos do mês).
             * @example 100
             */
            cycle_credits: number;
            /**
             * Cycle Used
             * @description Usado no ciclo do plano vigente.
             * @example 64
             */
            cycle_used: number;
            /**
             * Cycle Ends At
             * @description Fim do ciclo vigente. Nulo = não vence.
             */
            cycle_ends_at: string | null;
        };
        /** CreditEstimate */
        CreditEstimate: {
            /**
             * Delivery Type
             * @example 04.01
             */
            delivery_type: string;
            depth: components["schemas"]["DeliveryDepth"];
            /**
             * Credits
             * @description Quanto o run reserva ao começar e cobra se entregar.
             */
            credits: number;
            /**
             * Revision
             * @description Nova versão de um trabalho que já tem entrega.
             */
            revision: boolean;
            /**
             * Provisional
             * @description Valores provisórios (dono, 16/10): ainda não são regra comercial.
             */
            provisional: boolean;
            /**
             * Available
             * @description Disponível no workspace agora.
             */
            available: number;
            /**
             * Sufficient
             * @description O disponível cobre a estimativa.
             */
            sufficient: boolean;
        };
        /** CreditEstimateRequest */
        CreditEstimateRequest: {
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /**
             * Delivery Type
             * @description Delivery do catálogo.
             * @example 04.01
             */
            delivery_type: string;
            /**
             * Work Item Id
             * @description Trabalho que já tem versão entregue: a estimativa é de uma nova versão (ajuste ou nova proposta), com o preço de revisão.
             */
            work_item_id?: string | null;
        };
        /** CurrentVersionSummary */
        CurrentVersionSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Version No */
            version_no: number;
            status: components["schemas"]["DeliveryVersionStatus"];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** @description Última decisão sobre esta versão; vazio enquanto ninguém decidiu. */
            decision: components["schemas"]["ApprovalDecision"] | null;
        };
        /** Delivery */
        Delivery: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Kind
             * @example caption
             */
            kind: string;
            /** Current Version Id */
            current_version_id: string | null;
            /**
             * Step Id
             * @description Etapa do trabalho coordenado.
             */
            step_id?: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Versions
             * @description Da primeira à mais recente.
             */
            versions: components["schemas"]["DeliveryVersion"][];
        };
        /**
         * DeliveryDepth
         * @enum {string}
         */
        DeliveryDepth: "orientar" | "produzir" | "executar" | "otimizar";
        /** DeliveryFile */
        DeliveryFile: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Storage Path
             * @description Caminho no bucket privado `deliveries`.
             */
            storage_path: string;
            /** Mime */
            mime: string;
            /** Size Bytes */
            size_bytes: number;
        };
        /** DeliveryVersion */
        DeliveryVersion: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Version No */
            version_no: number;
            status: components["schemas"]["DeliveryVersionStatus"];
            /**
             * Content
             * @example {
             *       "canal": "instagram",
             *       "legenda": "Sábado tem pão de fermentação longa…"
             *     }
             */
            content: {
                [key: string]: unknown;
            };
            created_by_type: components["schemas"]["PrincipalType"];
            /** Created By User Id */
            created_by_user_id: string | null;
            created_by_agent_id: components["schemas"]["AgentId"] | null;
            /** Run Id */
            run_id: string | null;
            /** Change Note */
            change_note: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Files */
            files: components["schemas"]["DeliveryFile"][];
        };
        /**
         * DeliveryVersionStatus
         * @enum {string}
         */
        DeliveryVersionStatus: "draft" | "approved" | "superseded";
        /** DiffLine */
        DiffLine: {
            /**
             * Op
             * @enum {string}
             */
            op: " " | "+" | "-";
            /** Text */
            text: string;
        };
        /** EconomicAlert */
        EconomicAlert: {
            /**
             * Metric
             * @enum {string}
             */
            metric: "ai_cost_per_credit_brl" | "gross_margin" | "cost_per_turn_trend";
            /** Value */
            value: string;
            /** Threshold */
            threshold: string;
            /**
             * Comparison
             * @enum {string}
             */
            comparison: "max" | "min";
            /** Proposal */
            proposal: boolean;
        };
        /**
         * EconomicReadings
         * @description As três leituras econômicas; alerta só avisa, nada muda automaticamente.
         */
        EconomicReadings: {
            /**
             * Ai Cost Per Credit Brl
             * @description Custo de IA (entregas e conversa) em R$ ÷ créditos cobrados.
             */
            ai_cost_per_credit_brl: string | null;
            /**
             * Gross Margin
             * @description 1 − custo de IA em R$ ÷ (créditos × valor de referência do crédito).
             */
            gross_margin: string | null;
            /**
             * Cost Per Turn Usd
             * @description Custo dos turnos ÷ turnos, no período.
             */
            cost_per_turn_usd: string | null;
            /**
             * Cost Per Turn Trend
             * @description Custo por turno nos últimos N dias ÷ nos N anteriores − 1 (N da faixa).
             */
            cost_per_turn_trend: string | null;
            /** Alerts */
            alerts: components["schemas"]["EconomicAlert"][];
        };
        /** EmailPreference */
        EmailPreference: {
            /**
             * Template
             * @enum {string}
             */
            template: "approval_pending" | "delivery_ready" | "payment_confirmed" | "payment_problem";
            /** Enabled */
            enabled: boolean;
        };
        /** EmailPreferenceList */
        EmailPreferenceList: {
            /** Items */
            items: components["schemas"]["EmailPreference"][];
        };
        /** EmailPreferenceUpdate */
        EmailPreferenceUpdate: {
            /** Enabled */
            enabled: boolean;
        };
        /** ErrorBody */
        ErrorBody: {
            /**
             * Code
             * @description Identificador estável do erro, em inglês.
             */
            code: string;
            /**
             * Message
             * @description Explicação para quem usa, no idioma da pessoa (sem idioma escolhido, no do negócio da rota; sem negócio, pt-BR).
             */
            message: string;
            /** Details */
            details?: components["schemas"]["ErrorDetail"][];
        };
        /** ErrorDetail */
        ErrorDetail: {
            /**
             * Field
             * @description Campo com problema, quando houver.
             */
            field?: string | null;
            /** Message */
            message: string;
        };
        /** ErrorResponse */
        ErrorResponse: {
            error: components["schemas"]["ErrorBody"];
        };
        /** ExchangeRate */
        ExchangeRate: {
            /** Usd Brl */
            usd_brl: string;
            /**
             * Fx Date
             * Format: date
             */
            fx_date: string;
            /** Fx Source */
            fx_source: string;
        };
        /** FactSource */
        FactSource: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            kind: components["schemas"]["FactSourceKind"];
            /**
             * Name
             * @example Instagram
             */
            name: string;
            /** @description `declared` Declarado por você, `connected` Conectada, `outdated` Desatualizada, `needs_reconnect` Precisa reconectar, `not_connected` Não conectada, `unavailable` Indisponível. */
            state: components["schemas"]["FactSourceState"];
            /**
             * Permissions
             * @example [
             *       "Ler posts e métricas"
             *     ]
             */
            permissions: string[];
            /** Last Sync At */
            last_sync_at: string | null;
            /**
             * Fact Count
             * @description Conhecimentos atuais que vieram desta fonte.
             */
            fact_count: number;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /**
         * FactSourceKind
         * @enum {string}
         */
        FactSourceKind: "onboarding" | "conversation" | "correction" | "approval" | "file" | "connection" | "agent_observation";
        /** FactSourceList */
        FactSourceList: {
            /** Items */
            items: components["schemas"]["FactSource"][];
        };
        /**
         * FactSourceState
         * @enum {string}
         */
        FactSourceState: "declared" | "connected" | "outdated" | "needs_reconnect" | "not_connected" | "unavailable";
        /** Health */
        Health: {
            /**
             * Status
             * @default ok
             * @constant
             */
            status: "ok";
            /** Version */
            version: string;
            /** Environment */
            environment: string;
        };
        /** HowToRead */
        HowToRead: {
            /** Key */
            key: string;
            /** Title */
            title: string;
            /** Text */
            text: string;
        };
        /** LedgerEntry */
        LedgerEntry: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Entry Type */
            entry_type: string;
            /** Amount */
            amount: string;
            /** Note */
            note: string | null;
            /** Run Id */
            run_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * MarginBasis
         * @description Com que preços a margem foi estimada; tudo provisório até o Vic decidir preço e créditos.
         */
        MarginBasis: {
            /**
             * Credit Reference Brl
             * @description Valor do crédito em R$ na faixa da margem (exemplo do protótipo).
             */
            credit_reference_brl: string | null;
            /** @description Câmbio de Modelos e custos. */
            exchange_rate: components["schemas"]["ExchangeRate"] | null;
            /**
             * Provisional
             * @description Verdadeiro enquanto a faixa for proposta ou o preço/câmbio for provisório.
             */
            provisional: boolean;
        };
        /** Me */
        Me: {
            user: components["schemas"]["User"];
            /**
             * Memberships
             * @description Workspaces ativos de que você participa.
             */
            memberships: components["schemas"]["Membership"][];
        };
        /** Membership */
        Membership: {
            workspace: components["schemas"]["WorkspaceSummary"];
            role: components["schemas"]["WorkspaceRole"];
            /** @description Créditos do workspace (valores provisórios). */
            credits: components["schemas"]["CreditBalance"];
        };
        /**
         * MemoryArea
         * @enum {string}
         */
        MemoryArea: "business" | "brand" | "audience" | "knowledge";
        /** MemoryAreaGroup */
        MemoryAreaGroup: {
            area: components["schemas"]["MemoryArea"];
            /** Topics */
            topics: components["schemas"]["MemoryTopic"][];
        };
        /** MemoryConflict */
        MemoryConflict: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            state: components["schemas"]["MemoryConflictState"];
            resolution: components["schemas"]["MemoryConflictResolution"] | null;
            /** Resulting Fact Id */
            resulting_fact_id: string | null;
            /** Resolved By */
            resolved_by: string | null;
            /** Resolved At */
            resolved_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            fact_a: components["schemas"]["BrandFact"];
            fact_b: components["schemas"]["BrandFact"];
        };
        /** MemoryConflictList */
        MemoryConflictList: {
            /**
             * Items
             * @description Mais recente primeiro.
             */
            items: components["schemas"]["MemoryConflict"][];
        };
        /**
         * MemoryConflictResolution
         * @enum {string}
         */
        MemoryConflictResolution: "keep_a" | "keep_b" | "corrected";
        /**
         * MemoryConflictResolve
         * @example {
         *       "keep_fact_id": "5eed0000-0000-4000-8000-000000000811"
         *     }
         * @example {
         *       "content": "Terça a domingo, das 7h às 19h"
         *     }
         */
        MemoryConflictResolve: {
            /**
             * Keep Fact Id
             * @description "Vale este": a versão que fica.
             */
            keep_fact_id?: string | null;
            /**
             * Content
             * @description "Nenhum dos dois: corrigir".
             */
            content?: string | null;
        };
        /**
         * MemoryConflictState
         * @enum {string}
         */
        MemoryConflictState: "open" | "resolved";
        /** MemoryDossier */
        MemoryDossier: {
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /**
             * Brand Name
             * @example Miolo
             */
            brand_name: string;
            /** @description Descrição do negócio e síntese do squad (nulo: ainda não há). */
            profile?: components["schemas"]["BrandProfile"] | null;
            /**
             * Confirmed Count
             * @description Conhecimentos Confirmado e Decisão sua (base da síntese do squad).
             */
            confirmed_count: number;
            pending: components["schemas"]["MemoryPending"];
            /**
             * Sources
             * @description "De onde vem".
             */
            sources: components["schemas"]["FactSource"][];
            /**
             * Areas
             * @description Versões atuais por área e assunto, em todos os estados; a tela esconde Descartado e Não usado até a pessoa pedir.
             */
            areas: components["schemas"]["MemoryAreaGroup"][];
            /**
             * Suggestions
             * @description "O squad percebeu": sugestões abertas.
             */
            suggestions: components["schemas"]["MemorySuggestion"][];
        };
        /** MemoryPending */
        MemoryPending: {
            /**
             * Suggestions
             * @description Sugestões abertas.
             */
            suggestions: number;
            /**
             * Conflicts
             * @description Conflitos abertos.
             */
            conflicts: number;
            /**
             * Outdated
             * @description Conhecimentos desatualizados.
             */
            outdated: number;
        };
        /** MemorySearchHit */
        MemorySearchHit: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** @description `business` Meu negócio, `brand` Minha marca, `audience` Meu público, `knowledge` Conhecimento e aprendizados. */
            area: components["schemas"]["MemoryArea"];
            /**
             * Topic
             * @description Assunto dentro da área.
             * @example Tom de voz
             */
            topic: string;
            /**
             * Key
             * @example Palavra proibida
             */
            key: string;
            /**
             * Content
             * @example Não usar a palavra 'artesanal' nas legendas
             */
            content: string;
            /** Content Json */
            content_json: unknown | null;
            /** @description `confirmed` Confirmado, `decision` Decisão sua, `from_source` Da fonte, `observed` Observado, `suggested` Sugerido, `outdated` Desatualizado, `discarded` Descartado, `conflicting` Em conflito, `unused` Não usado. O squad usa só Confirmado e Decisão sua como orientação. */
            state: components["schemas"]["BrandFactState"];
            source_type: components["schemas"]["FactSourceKind"];
            /** Source Id */
            source_id: string | null;
            /**
             * Origin
             * @example Contado por você no cadastro
             */
            origin: string | null;
            /**
             * Used By Agents
             * @description Agentes que usam este conhecimento.
             */
            used_by_agents: components["schemas"]["AgentId"][];
            /** @description Quem percebeu ("<Agente> percebeu"). */
            perceived_by_agent_id: components["schemas"]["AgentId"] | null;
            /** Confidence */
            confidence: number | null;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /** Version */
            version: number;
            /**
             * Supersedes Id
             * @description Versão anterior que esta corrigiu.
             */
            supersedes_id: string | null;
            /**
             * Superseded At
             * @description Nulo = versão atual.
             */
            superseded_at: string | null;
            /** Confirmed By */
            confirmed_by: string | null;
            /** Confirmed At */
            confirmed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /** @description Estado antes de "Não usar mais" ("Voltar a usar" volta para ele). */
            unused_from?: components["schemas"]["BrandFactState"] | null;
            /**
             * Rank
             * @description Relevância da busca textual (maior primeiro).
             */
            rank: number;
        };
        /** MemorySearchResult */
        MemorySearchResult: {
            /** Query */
            query: string;
            /** Items */
            items: components["schemas"]["MemorySearchHit"][];
        };
        /** MemorySuggestion */
        MemorySuggestion: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** @description Quem percebeu ("<Agente> percebeu"). */
            agent_id: components["schemas"]["AgentId"];
            /**
             * Title
             * @description Leitura curta do agente.
             */
            title: string;
            /** Explanation */
            explanation: string | null;
            /**
             * Question
             * @description Pergunta ao dono; sem ela, a tela usa o conteúdo.
             */
            question: string | null;
            /** Origin */
            origin: string | null;
            area: components["schemas"]["MemoryArea"];
            /** Topic */
            topic: string;
            /** Key */
            key: string;
            /**
             * Content
             * @description O que vira conhecimento se o dono confirmar.
             */
            content: string;
            /**
             * Used By Agents
             * @description Quem vai usar depois do ok do dono.
             */
            used_by_agents: components["schemas"]["AgentId"][];
            /** Source Id */
            source_id: string | null;
            /** Run Id */
            run_id: string | null;
            /** @description `open` aberto, `seen` visto, `done` feito. */
            state: components["schemas"]["MemorySuggestionState"];
            decision: components["schemas"]["MemorySuggestionDecision"] | null;
            /** Decided By */
            decided_by: string | null;
            /** Decided At */
            decided_at: string | null;
            /**
             * Resulting Fact Id
             * @description Conhecimento criado por Confirmar ou Corrigir.
             */
            resulting_fact_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** MemorySuggestionDecided */
        MemorySuggestionDecided: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** @description Quem percebeu ("<Agente> percebeu"). */
            agent_id: components["schemas"]["AgentId"];
            /**
             * Title
             * @description Leitura curta do agente.
             */
            title: string;
            /** Explanation */
            explanation: string | null;
            /**
             * Question
             * @description Pergunta ao dono; sem ela, a tela usa o conteúdo.
             */
            question: string | null;
            /** Origin */
            origin: string | null;
            area: components["schemas"]["MemoryArea"];
            /** Topic */
            topic: string;
            /** Key */
            key: string;
            /**
             * Content
             * @description O que vira conhecimento se o dono confirmar.
             */
            content: string;
            /**
             * Used By Agents
             * @description Quem vai usar depois do ok do dono.
             */
            used_by_agents: components["schemas"]["AgentId"][];
            /** Source Id */
            source_id: string | null;
            /** Run Id */
            run_id: string | null;
            /** @description `open` aberto, `seen` visto, `done` feito. */
            state: components["schemas"]["MemorySuggestionState"];
            decision: components["schemas"]["MemorySuggestionDecision"] | null;
            /** Decided By */
            decided_by: string | null;
            /** Decided At */
            decided_at: string | null;
            /**
             * Resulting Fact Id
             * @description Conhecimento criado por Confirmar ou Corrigir.
             */
            resulting_fact_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            resulting_fact: components["schemas"]["BrandFact"] | null;
        };
        /**
         * MemorySuggestionDecision
         * @enum {string}
         */
        MemorySuggestionDecision: "confirm" | "correct" | "discard";
        /**
         * MemorySuggestionDecisionCreate
         * @example {
         *       "decision": "confirm"
         *     }
         * @example {
         *       "content": "Bastidores do forno uma vez por semana.",
         *       "decision": "correct"
         *     }
         * @example {
         *       "decision": "discard"
         *     }
         */
        MemorySuggestionDecisionCreate: {
            /** @description `confirm` vira conhecimento Confirmado; `correct` vira Confirmado com o seu texto; `discard` fica registrada e não volta. */
            decision: components["schemas"]["MemorySuggestionDecision"];
            /**
             * Content
             * @description Obrigatório ao corrigir.
             */
            content?: string | null;
        };
        /** MemorySuggestionList */
        MemorySuggestionList: {
            /**
             * Items
             * @description Mais recente primeiro.
             */
            items: components["schemas"]["MemorySuggestion"][];
        };
        /**
         * MemorySuggestionState
         * @enum {string}
         */
        MemorySuggestionState: "open" | "seen" | "done";
        /** MemoryTopic */
        MemoryTopic: {
            /** Topic */
            topic: string;
            /** Facts */
            facts: components["schemas"]["BrandFact"][];
        };
        /** Message */
        Message: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Conversation Id
             * Format: uuid
             */
            conversation_id: string;
            author_type: components["schemas"]["MessageAuthorType"];
            /** Author User Id */
            author_user_id: string | null;
            author_agent_id: components["schemas"]["AgentId"] | null;
            /** Run Id */
            run_id: string | null;
            /**
             * Body
             * @example Tom acolhedor e direto, sem gíria.
             */
            body: string;
            /**
             * Body Format
             * @example markdown
             */
            body_format: string;
            /** Attachments */
            attachments: unknown[];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** @description Só em mensagem de agente. */
            card?: components["schemas"]["MessageCard"] | null;
        };
        /**
         * MessageAuthorType
         * @enum {string}
         */
        MessageAuthorType: "user" | "agent" | "system";
        /**
         * MessageCard
         * @description Cartão dentro da mensagem do agente (FLUXOS_DA_V46.md §4.5), sempre ligado ao objeto.
         */
        MessageCard: {
            /**
             * Type
             * @description `work_created` (Trabalho criado), `material` (Material · vN), `approval` (pedido de aprovação ou autorização), `question` (pergunta), `options` (escolher uma opção), `team` (equipe montada), `budget` (orçamento em créditos).
             * @enum {string}
             */
            type: "work_created" | "material" | "approval" | "question" | "options" | "team" | "budget";
            /** Actions */
            actions?: components["schemas"]["CardAction"][];
            /** Work Item Id */
            work_item_id?: string | null;
            /** Delivery Version Id */
            delivery_version_id?: string | null;
            /** Approval Id */
            approval_id?: string | null;
            /** Version No */
            version_no?: number | null;
            /** Options */
            options?: components["schemas"]["CardOption"][] | null;
            /** Agent Ids */
            agent_ids?: components["schemas"]["AgentId"][] | null;
            /**
             * Members
             * @description `team`: cada responsável com a responsabilidade dele na equipe.
             */
            members?: components["schemas"]["CardMember"][] | null;
            /**
             * Project Id
             * @description `team`: o projeto da equipe.
             */
            project_id?: string | null;
            /** Credits */
            credits?: string | null;
            /** @description Estado atual da pendência ligada. */
            approval_status?: components["schemas"]["ApprovalStatus"] | null;
            /** @description Decisão já tomada (o web marca a escolhida e desabilita). */
            decision?: components["schemas"]["ApprovalDecision"] | null;
            /**
             * Answer
             * @description Resposta escrita ou opção escolhida.
             */
            answer?: string | null;
            version_status?: components["schemas"]["DeliveryVersionStatus"] | null;
            work_item_status?: components["schemas"]["WorkItemStatus"] | null;
        };
        /**
         * MessageCreate
         * @example {
         *       "body": "Otto, preciso de uma legenda para o post de sábado sobre o pão de fermentação longa."
         *     }
         */
        MessageCreate: {
            /**
             * Body
             * @description Texto da mensagem (markdown), de 1 a 20.000 caracteres.
             */
            body: string;
        };
        /** MessagePage */
        MessagePage: {
            /**
             * Items
             * @description Em ordem cronológica (mais antiga primeiro), também com `before`.
             */
            items: components["schemas"]["Message"][];
            /**
             * Next Cursor
             * @description Cursor da próxima página no sentido da leitura: sem `before`, das mensagens mais novas (passe em `cursor`); com `before`, das mais antigas (passe em `before`). Nulo quando não há mais.
             */
            next_cursor: string | null;
        };
        /** MetricPoint */
        MetricPoint: {
            /**
             * Day
             * Format: date
             */
            day: string;
            /** Value */
            value: string;
        };
        /** MetricSeries */
        MetricSeries: {
            /**
             * Channel
             * @description Id do canal; o web traduz.
             * @example site
             */
            channel: string;
            /**
             * Metric
             * @description Id da métrica; o web traduz.
             * @example sessions
             */
            metric: string;
            /**
             * Unit
             * @example sessões
             */
            unit: string;
            /**
             * Sources
             * @example [
             *       "fonte_de_teste"
             *     ]
             */
            sources: string[];
            /** Points */
            points: components["schemas"]["MetricPoint"][];
            /**
             * Missing Days
             * @description Dias do período sem dado (não são zero).
             */
            missing_days: string[];
        };
        /** MetricsPage */
        MetricsPage: {
            /**
             * Start
             * Format: date
             */
            start: string;
            /**
             * End
             * Format: date
             */
            end: string;
            /** Items */
            items: components["schemas"]["MetricSeries"][];
        };
        /**
         * MilestoneCreate
         * @example {
         *       "agent_id": "kaia",
         *       "due_at": "2026-10-22T09:00:00-03:00",
         *       "needs_you": true,
         *       "summary": "você aprova cada uma",
         *       "title": "Revisão das peças"
         *     }
         */
        MilestoneCreate: {
            /** Title */
            title: string;
            /** Summary */
            summary?: string | null;
            agent_id?: components["schemas"]["AgentId"] | null;
            /** Due At */
            due_at?: string | null;
            /**
             * Kind
             * @default milestone
             * @enum {string}
             */
            kind: "milestone" | "goal";
            /**
             * Needs You
             * @default false
             */
            needs_you: boolean;
            /**
             * Planned
             * @default false
             */
            planned: boolean;
        };
        /** MilestonePage */
        MilestonePage: {
            /**
             * Items
             * @description Por data, o mais próximo primeiro.
             */
            items: components["schemas"]["ProjectMilestone"][];
        };
        /**
         * MilestoneUpdate
         * @description Só os campos enviados mudam; `done: true` conclui agora, `false` reabre.
         */
        MilestoneUpdate: {
            /** Title */
            title?: string | null;
            /** Summary */
            summary?: string | null;
            agent_id?: components["schemas"]["AgentId"] | null;
            /** Due At */
            due_at?: string | null;
            /** Kind */
            kind?: ("milestone" | "goal") | null;
            /** Needs You */
            needs_you?: boolean | null;
            /** Planned */
            planned?: boolean | null;
            /** Done */
            done?: boolean | null;
        };
        /** ModelCostRow */
        ModelCostRow: {
            /** Model */
            model: string;
            /** Calls */
            calls: number;
            /** Input Tokens */
            input_tokens: number;
            /** Cache Read Tokens */
            cache_read_tokens: number;
            /** Cache Write Tokens */
            cache_write_tokens: number;
            /** Output Tokens */
            output_tokens: number;
            /** Cost Usd */
            cost_usd: string;
        };
        /** ModelPrice */
        ModelPrice: {
            /** Model */
            model: string;
            /** Display Name */
            display_name: string;
            /** Input Usd Per Mtok */
            input_usd_per_mtok: string;
            /** Output Usd Per Mtok */
            output_usd_per_mtok: string;
            /** Cache Read Usd Per Mtok */
            cache_read_usd_per_mtok: string;
            /** Cache Write Usd Per Mtok */
            cache_write_usd_per_mtok: string;
            /** Provisional */
            provisional: boolean;
            /**
             * Checked At
             * Format: date
             */
            checked_at: string;
            /** Source */
            source: string;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
        };
        /** ModelsOverview */
        ModelsOverview: {
            /**
             * Since
             * Format: date
             */
            since: string;
            /**
             * Until
             * Format: date
             */
            until: string;
            /** Prices */
            prices: components["schemas"]["ModelPrice"][];
            exchange_rate: components["schemas"]["ExchangeRate"] | null;
            /** Rules */
            rules: components["schemas"]["TaskRule"][];
            /** Costs By Model */
            costs_by_model: components["schemas"]["ModelCostRow"][];
        };
        /** NeedItem */
        NeedItem: {
            /**
             * Type
             * @description Tipo da linha da faixa: os da pendência ("Para você revisar"…, "Para você decidir") ou `next` ("Em seguida": marco seu que ainda não depende de você).
             * @enum {string}
             */
            type: "review" | "approve" | "authorize" | "confirm" | "reconnect" | "respond" | "decide" | "next";
            /** @description Quem pede. */
            agent_id: components["schemas"]["AgentId"];
            approval?: components["schemas"]["Approval"] | null;
            milestone?: components["schemas"]["ProjectMilestone"] | null;
            project?: components["schemas"]["NeedProject"] | null;
            /** Due At */
            due_at?: string | null;
        };
        /** NeedProject */
        NeedProject: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
        };
        /** NeedsYou */
        NeedsYou: {
            /**
             * Count
             * @description Só o que depende da pessoa agora (sem adiadas e sem `next`).
             */
            count: number;
            /**
             * Deferred Count
             * @description Autorizações adiadas por "Agora não".
             */
            deferred_count: number;
            /**
             * Items
             * @description O que é agora (mais antigo primeiro), depois `next`.
             */
            items: components["schemas"]["NeedItem"][];
        };
        /** Participant */
        Participant: {
            participant_type: components["schemas"]["PrincipalType"];
            /** User Id */
            user_id: string | null;
            agent_id: components["schemas"]["AgentId"] | null;
        };
        /** PaymentItem */
        PaymentItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "subscription_cycle" | "topup";
            /**
             * Method
             * @enum {string}
             */
            method: "card" | "pix";
            /**
             * Status
             * @enum {string}
             */
            status: "pending" | "confirmed" | "overdue" | "failed" | "refunded" | "charged_back" | "cancelled";
            /**
             * Provider
             * @enum {string}
             */
            provider: "asaas" | "mercadopago" | "mock";
            /**
             * Credits
             * @description Créditos que a confirmação concede.
             */
            credits: number;
            /**
             * Credits Revoked
             * @description Créditos retirados por estorno ou contestação.
             */
            credits_revoked: number;
            /**
             * Period Start
             * @description Ciclo coberto (assinatura).
             */
            period_start: string | null;
            /** Period End */
            period_end: string | null;
            /** Confirmed At */
            confirmed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** PaymentPage */
        PaymentPage: {
            /**
             * Items
             * @description O mais novo primeiro. Sem valor em dinheiro: preço e plano ficam em tabela, provisórios (dono, 16/10).
             */
            items: components["schemas"]["PaymentItem"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /** PaymentProviderState */
        PaymentProviderState: {
            /** Provider */
            provider: string;
            /**
             * Selected
             * @description É o PAYMENT_PROVIDER das cobranças novas.
             */
            selected: boolean;
            /**
             * Api Key
             * @enum {string}
             */
            api_key: "configured" | "missing" | "not_applicable";
            /**
             * Webhook Secret
             * @enum {string}
             */
            webhook_secret: "configured" | "missing" | "not_applicable";
        };
        /** PaymentsOverview */
        PaymentsOverview: {
            /** Providers */
            providers: components["schemas"]["PaymentProviderState"][];
            /** Subscriptions */
            subscriptions: components["schemas"]["AdminSubscription"][];
            /**
             * Payments
             * @description Últimas 50 cobranças.
             */
            payments: components["schemas"]["AdminPayment"][];
            /**
             * Webhooks
             * @description Últimos 50 eventos recebidos.
             */
            webhooks: components["schemas"]["AdminWebhookEvent"][];
        };
        /** PendingApprovalSummary */
        PendingApprovalSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            kind: components["schemas"]["ApprovalKind"];
            requested_by_agent_id: components["schemas"]["AgentId"];
            /** Delivery Version No */
            delivery_version_no: number | null;
            /** Due At */
            due_at: string | null;
            /**
             * Deferred
             * @description "Agora não": fora de "Precisa de você" até decidir.
             */
            deferred: boolean;
        };
        /** PlanItem */
        PlanItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /** For Sale */
            for_sale: boolean;
            /** Version */
            version: number;
            /** Cycle */
            cycle: string;
            /** Credits */
            credits: string;
            /** Validity Days */
            validity_days: number | null;
            /** Provisional */
            provisional: boolean;
            /** Approved Commercially */
            approved_commercially: boolean;
            /** Price Amount */
            price_amount: string | null;
            /** Price Currency */
            price_currency: string | null;
            /** Price Provisional */
            price_provisional: boolean | null;
            /** Price Approved Commercially */
            price_approved_commercially: boolean | null;
        };
        /** PlansResponse */
        PlansResponse: {
            /** Plans */
            plans: components["schemas"]["PlanItem"][];
            /** Topups */
            topups: components["schemas"]["TopupItem"][];
        };
        /**
         * PrincipalType
         * @enum {string}
         */
        PrincipalType: "user" | "agent";
        /** Project */
        Project: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /**
             * Name
             * @example Lançamento do pão de fermentação longa
             */
            name: string;
            /** Objective */
            objective: string | null;
            status: components["schemas"]["ProjectStatus"];
            owner_agent_id: components["schemas"]["AgentId"];
            /**
             * Starts At
             * @description Início no roadmap.
             */
            starts_at?: string | null;
            /**
             * Ends At
             * @description Prazo ("20/12"); nulo = sem prazo.
             */
            ends_at?: string | null;
            /** Created By */
            created_by: string | null;
            /** Archived At */
            archived_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /**
         * ProjectCreate
         * @example {
         *       "ends_at": "2026-12-20T18:00:00-03:00",
         *       "name": "Campanha de Natal",
         *       "objective": "Vender mais panetones pelo site e na loja.",
         *       "owner_agent_id": "nexo",
         *       "participants": [
         *         {
         *           "agent_id": "bia",
         *           "responsibility": "estratégia e conceito"
         *         },
         *         {
         *           "agent_id": "kaia",
         *           "responsibility": "peças da campanha"
         *         }
         *       ],
         *       "starts_at": "2026-10-05T09:00:00-03:00"
         *     }
         */
        ProjectCreate: {
            /** Name */
            name: string;
            /** Objective */
            objective?: string | null;
            /**
             * @description Quem conduz.
             * @default nexo
             */
            owner_agent_id: components["schemas"]["AgentId"];
            /** Starts At */
            starts_at?: string | null;
            /** Ends At */
            ends_at?: string | null;
            /** Participants */
            participants?: components["schemas"]["ProjectParticipantIn"][];
        };
        /** ProjectDetail */
        ProjectDetail: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /**
             * Name
             * @example Lançamento do pão de fermentação longa
             */
            name: string;
            /** Objective */
            objective: string | null;
            status: components["schemas"]["ProjectStatus"];
            owner_agent_id: components["schemas"]["AgentId"];
            /**
             * Starts At
             * @description Início no roadmap.
             */
            starts_at?: string | null;
            /**
             * Ends At
             * @description Prazo ("20/12"); nulo = sem prazo.
             */
            ends_at?: string | null;
            /** Created By */
            created_by: string | null;
            /** Archived At */
            archived_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Participants
             * @description Quem conduz primeiro.
             */
            participants: components["schemas"]["ProjectParticipant"][];
            /** @description O dono da conta: participa do projeto e decide cada entrega. */
            owner?: components["schemas"]["ProjectOwner"] | null;
            /**
             * Milestones
             * @description Por data; sem data por último.
             */
            milestones: components["schemas"]["ProjectMilestone"][];
            /**
             * Work Item Count
             * @description "Trabalhos pedidos neste projeto · N".
             */
            work_item_count: number;
        };
        /** ProjectMilestone */
        ProjectMilestone: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Project Id
             * Format: uuid
             */
            project_id: string;
            /**
             * Title
             * @example Revisão das peças
             */
            title: string;
            /**
             * Summary
             * @example você aprova cada uma
             */
            summary: string | null;
            agent_id: components["schemas"]["AgentId"] | null;
            /**
             * Kind
             * @description `goal` é a meta do projeto.
             * @enum {string}
             */
            kind: "milestone" | "goal";
            /**
             * Due At
             * @description Nulo = sem data.
             */
            due_at: string | null;
            /**
             * Needs You
             * @description "decisão sua" no roadmap.
             */
            needs_you: boolean;
            /**
             * Planned
             * @description "previsto" no roadmap.
             */
            planned: boolean;
            /** Done */
            done: boolean;
            /** Done At */
            done_at: string | null;
            /**
             * Work Item Id
             * @description Trabalho pedido dentro do projeto.
             */
            work_item_id: string | null;
            /**
             * Approval Id
             * @description Pendência em que o marco virou decisão.
             */
            approval_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Step Id
             * @description Etapa do trabalho coordenado.
             */
            step_id?: string | null;
        };
        /** ProjectOwner */
        ProjectOwner: {
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
            /**
             * Role
             * @default owner
             * @constant
             */
            role: "owner";
            /**
             * Responsibility
             * @example decide cada entrega
             */
            responsibility: string;
        };
        /** ProjectPage */
        ProjectPage: {
            /**
             * Items
             * @description Projetos ativos, o mais novo primeiro.
             */
            items: components["schemas"]["Project"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /** ProjectParticipant */
        ProjectParticipant: {
            agent_id: components["schemas"]["AgentId"];
            /**
             * Responsibility
             * @example estratégia e conceito
             */
            responsibility: string | null;
        };
        /** ProjectParticipantIn */
        ProjectParticipantIn: {
            agent_id: components["schemas"]["AgentId"];
            /** Responsibility */
            responsibility?: string | null;
        };
        /** ProjectParticipantsSet */
        ProjectParticipantsSet: {
            /**
             * Participants
             * @description A equipe inteira; quem conduz continua nela.
             */
            participants: components["schemas"]["ProjectParticipantIn"][];
        };
        /**
         * ProjectStatus
         * @enum {string}
         */
        ProjectStatus: "draft" | "active" | "paused" | "done" | "cancelled";
        /**
         * ProjectUpdate
         * @description Só os campos enviados mudam; `null` em objective, starts_at e ends_at apaga o valor.
         */
        ProjectUpdate: {
            /** Name */
            name?: string | null;
            /** Objective */
            objective?: string | null;
            status?: components["schemas"]["ProjectStatus"] | null;
            owner_agent_id?: components["schemas"]["AgentId"] | null;
            /** Starts At */
            starts_at?: string | null;
            /** Ends At */
            ends_at?: string | null;
        };
        /** PromptBlock */
        PromptBlock: {
            /**
             * Part
             * @enum {string}
             */
            part: "rules_and_soul" | "skill" | "workspace" | "message";
            /** Text */
            text: string;
            /** Cached */
            cached: boolean;
            /** Chars */
            chars: number;
            /** Tokens Estimated */
            tokens_estimated: number;
        };
        /** PromptPreview */
        PromptPreview: {
            /** Agent Id */
            agent_id: string;
            /**
             * Route
             * @description Delivery (skill), conversa ou reflexao: o que o run lê nessa rota.
             */
            route: string;
            /**
             * Draft
             * @description true: montado com os rascunhos no lugar das versões ativas.
             */
            draft: boolean;
            /**
             * Origin
             * @enum {string}
             */
            origin: "database" | "files";
            /** Content Hash */
            content_hash: string;
            /** Sources */
            sources: {
                [key: string]: unknown;
            }[];
            /** Example Context */
            example_context: {
                [key: string]: string;
            };
            /** Blocks */
            blocks: components["schemas"]["PromptBlock"][];
            /** Chars */
            chars: number;
            /** Tokens Estimated */
            tokens_estimated: number;
            /** Token Estimate Method */
            token_estimate_method: string;
        };
        /** PromptVersionSource */
        PromptVersionSource: {
            /** Kind */
            kind?: string | null;
            /** Key */
            key?: string | null;
            /** Version */
            version?: number | null;
        };
        /** ProviderBalanceAlert */
        ProviderBalanceAlert: {
            /** Provider */
            provider: string;
            /** Display Name */
            display_name: string;
            /** Reported Balance */
            reported_balance: string;
            /** Reported Balance Currency */
            reported_balance_currency: string;
            /**
             * Reported Balance At
             * Format: date-time
             */
            reported_balance_at: string;
            /** Alert Below */
            alert_below: string;
        };
        /** ProviderHealthItem */
        ProviderHealthItem: {
            /** Provider */
            provider: string;
            /** Display Name */
            display_name: string;
            /** Purpose */
            purpose: string;
            /** Status */
            status: string;
            /**
             * Key
             * @enum {string}
             */
            key: "configured" | "missing" | "not_applicable";
            /** Calls 24H */
            calls_24h: number | null;
            /** Failures 24H */
            failures_24h: number | null;
            spend_usd: components["schemas"]["ProviderSpend"] | null;
            /** Last Success At */
            last_success_at: string | null;
            /** Last Failure At */
            last_failure_at: string | null;
            /** Last Failure Text */
            last_failure_text: string | null;
            /** Last Balance Refusal At */
            last_balance_refusal_at: string | null;
            /** Reported Balance */
            reported_balance: string | null;
            /** Reported Balance Currency */
            reported_balance_currency: string | null;
            /** Reported Balance At */
            reported_balance_at: string | null;
            /** Alert Below */
            alert_below: string | null;
            /** Note */
            note: string | null;
            /** Calls 7D */
            calls_7d?: number | null;
            /** Failures 7D */
            failures_7d?: number | null;
            /**
             * Balance Alert
             * @description Saldo informado abaixo do limiar (na moeda do saldo).
             * @default false
             */
            balance_alert: boolean;
            /** Balance History */
            balance_history?: components["schemas"]["BalanceReport"][];
        };
        /** ProviderSpend */
        ProviderSpend: {
            /** H24 */
            h24: string;
            /** D7 */
            d7: string;
            /** D30 */
            d30: string;
            /** Total */
            total: string;
        };
        /** ProvidersResponse */
        ProvidersResponse: {
            /** Items */
            items: components["schemas"]["ProviderHealthItem"][];
        };
        /** QualityComparison */
        QualityComparison: {
            a: components["schemas"]["QualityPeriod"];
            b: components["schemas"]["QualityPeriod"];
            /** @description b − a, nas mesmas unidades das taxas. */
            delta: components["schemas"]["QualityRates"];
        };
        /** QualityPeriod */
        QualityPeriod: {
            /**
             * Since
             * Format: date
             */
            since: string;
            /**
             * Until
             * Format: date
             */
            until: string;
            totals: components["schemas"]["QualityRow"];
            rates: components["schemas"]["QualityRates"];
            /** Prompt Versions */
            prompt_versions: components["schemas"]["QualityPromptVersionRow"][];
        };
        /** QualityPromptVersionRow */
        QualityPromptVersionRow: {
            /**
             * Key
             * @description delivery_type em by_type; AAAA-MM em by_month.
             */
            key: string;
            /** Deliveries */
            deliveries: number;
            /** Approved First Time */
            approved_first_time: number;
            /** Approved */
            approved: number;
            /** Adjustments */
            adjustments: number;
            /** Not Approved */
            not_approved: number;
            /** Ai Cost Usd */
            ai_cost_usd: string;
            /** Ai Cost Per Approved Usd */
            ai_cost_per_approved_usd: string | null;
            /** Failed Runs */
            failed_runs: number;
            /** Failed Steps */
            failed_steps: number;
            /** Agent Errors */
            agent_errors: number;
            /** Agent Id */
            agent_id: string;
            /**
             * Prompt Version
             * @description Hash do prompt montado (runs.prompt_version).
             */
            prompt_version: string;
            /**
             * Origin
             * @description database = versões do painel (SA3a); files = squad/.
             */
            origin: string | null;
            /** Sources */
            sources: components["schemas"]["PromptVersionSource"][];
            /** First Used At */
            first_used_at: string | null;
        };
        /** QualityRates */
        QualityRates: {
            /** Approved First Rate */
            approved_first_rate: string | null;
            /** Adjustments Per Delivery */
            adjustments_per_delivery: string | null;
            /** Not Approved Rate */
            not_approved_rate: string | null;
            /** Ai Cost Per Approved Usd */
            ai_cost_per_approved_usd: string | null;
            /** Agent Errors Per 100 */
            agent_errors_per_100: string | null;
            /** Failed Calls Per 100 */
            failed_calls_per_100: string | null;
        };
        /** QualityResponse */
        QualityResponse: {
            /**
             * Since
             * Format: date
             */
            since: string;
            /**
             * Until
             * Format: date
             */
            until: string;
            /** By Type */
            by_type: components["schemas"]["QualityRow"][];
            /** By Month */
            by_month: components["schemas"]["QualityRow"][];
            /** By Prompt Version */
            by_prompt_version: components["schemas"]["QualityPromptVersionRow"][];
            /** Locale */
            locale: string;
            /** How To Read */
            how_to_read: components["schemas"]["HowToRead"][];
        };
        /** QualityRow */
        QualityRow: {
            /**
             * Key
             * @description delivery_type em by_type; AAAA-MM em by_month.
             */
            key: string;
            /** Deliveries */
            deliveries: number;
            /** Approved First Time */
            approved_first_time: number;
            /** Approved */
            approved: number;
            /** Adjustments */
            adjustments: number;
            /** Not Approved */
            not_approved: number;
            /** Ai Cost Usd */
            ai_cost_usd: string;
            /** Ai Cost Per Approved Usd */
            ai_cost_per_approved_usd: string | null;
            /** Failed Runs */
            failed_runs: number;
            /** Failed Steps */
            failed_steps: number;
            /** Agent Errors */
            agent_errors: number;
        };
        /** QueueOverview */
        QueueOverview: {
            /** Queues */
            queues: components["schemas"]["QueueSize"][];
            /** Status Counts */
            status_counts: {
                [key: string]: number;
            };
            /** Runs */
            runs: components["schemas"]["QueueRun"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /** QueueRun */
        QueueRun: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Workspace Name */
            workspace_name: string;
            /** Work Item Id */
            work_item_id: string | null;
            /** Work Title */
            work_title: string | null;
            /** Delivery Type */
            delivery_type: string | null;
            /** Agent Id */
            agent_id: string | null;
            /** Kind */
            kind: string;
            /** Status */
            status: string;
            /** Attempts */
            attempts: number;
            /** Max Attempts */
            max_attempts: number;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
            /** Queue Name */
            queue_name: string | null;
            /** Lease Until */
            lease_until: string | null;
            /** Current Step */
            current_step: string | null;
            /** Error Code */
            error_code: string | null;
            /** Error Message */
            error_message: string | null;
        };
        /** QueueSize */
        QueueSize: {
            /** Queue Name */
            queue_name: string;
            /** Queued */
            queued: number;
            /** In Flight */
            in_flight: number;
            /** Oldest Enqueued At */
            oldest_enqueued_at: string | null;
        };
        /** ReadCreate */
        ReadCreate: {
            /**
             * Read At
             * @description Hora da última mensagem que a pessoa viu (padrão: agora). Nunca volta para trás.
             */
            read_at?: string | null;
        };
        /** RefusedLine */
        RefusedLine: {
            /**
             * Line
             * @description Linha do arquivo (o cabeçalho é a linha 1).
             */
            line: number;
            /**
             * Reason
             * @enum {string}
             */
            reason: "missing_name" | "missing_address" | "invalid_email" | "email_not_fictitious" | "invalid_phone" | "no_consent" | "invalid_consent" | "consent_without_address" | "missing_consent_date" | "invalid_consent_date" | "invalid_purchase_date" | "invalid_purchases_count" | "duplicate_in_file" | "duplicate_existing";
        };
        /** ReplyRequest */
        ReplyRequest: {
            /**
             * Run Id
             * Format: uuid
             */
            run_id: string;
            /**
             * Conversation Id
             * Format: uuid
             */
            conversation_id: string;
            /**
             * Message Id
             * Format: uuid
             */
            message_id: string;
            /** @description Quem vai responder: um especialista por vez. */
            agent_id: components["schemas"]["AgentId"];
            /**
             * Status
             * @example queued
             */
            status: string;
        };
        /** RestoreRequest */
        RestoreRequest: {
            /** Note */
            note?: string | null;
        };
        /** RuleDocDetail */
        RuleDocDetail: {
            doc: components["schemas"]["RuleDocSummary"];
            current: components["schemas"]["RuleVersion"] | null;
            /** Versions */
            versions: components["schemas"]["RuleVersion"][];
            /**
             * Prompt Paragraphs
             * @description O que entra no prompt: [DECIDIDO] e [BASE ATUAL] de documento no prompt.
             */
            prompt_paragraphs: components["schemas"]["RuleParagraph"][];
        };
        /** RuleDocEdit */
        RuleDocEdit: {
            /** Paragraphs */
            paragraphs: components["schemas"]["RuleParagraph"][];
            /** In Prompt */
            in_prompt?: boolean | null;
            /** Note */
            note?: string | null;
        };
        /** RuleDocList */
        RuleDocList: {
            /** Items */
            items: components["schemas"]["RuleDocSummary"][];
            /** @description Rascunho das regras compartilhadas esperando publicação, se houver. */
            shared_rules_draft: components["schemas"]["VersionRef"] | null;
        };
        /** RuleDocSummary */
        RuleDocSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /** Title */
            title: string;
            /** In Prompt */
            in_prompt: boolean;
            /** Version */
            version: number | null;
            /** Updated At */
            updated_at: string | null;
            /** Author */
            author: string | null;
            /** Marks */
            marks: {
                [key: string]: number;
            };
        };
        /** RuleParagraph */
        RuleParagraph: {
            /**
             * Mark
             * @enum {string}
             */
            mark: "decided" | "current_base" | "pending" | "proposal";
            /** Text */
            text: string;
            /** Source */
            source?: string | null;
        };
        /** RuleSaveResult */
        RuleSaveResult: {
            doc: components["schemas"]["RuleDocSummary"];
            version: components["schemas"]["RuleVersion"];
            /** @description Rascunho novo do README.md (regras compartilhadas) quando o prompt mudou. */
            shared_rules_draft: components["schemas"]["VersionRef"] | null;
        };
        /** RuleVersion */
        RuleVersion: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Version */
            version: number;
            /** Author */
            author: string;
            /** Change Note */
            change_note: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Paragraphs */
            paragraphs: components["schemas"]["RuleParagraph"][];
        };
        /** Run */
        Run: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            agent_id: components["schemas"]["AgentId"];
            kind: components["schemas"]["RunKind"];
            status: components["schemas"]["RunStatus"];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Work Item Id */
            work_item_id: string | null;
            /** Conversation Id */
            conversation_id: string | null;
            /**
             * Model
             * @description Modelo usado (preenchido pelo runtime).
             */
            model: string | null;
            /** Prompt Version */
            prompt_version: string | null;
            /**
             * Error
             * @description Erro já redigido pelo runtime, se falhou.
             */
            error: {
                [key: string]: unknown;
            } | null;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** RunDetail */
        RunDetail: {
            run: components["schemas"]["QueueRun"];
            /** Steps */
            steps: components["schemas"]["RunStepItem"][];
            /** Events */
            events: components["schemas"]["RunEventItem"][];
        };
        /** RunEvent */
        RunEvent: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Run Id
             * Format: uuid
             */
            run_id: string;
            /**
             * Seq
             * @description Ordem do evento no run (1, 2, 3…).
             */
            seq: number;
            /**
             * Type
             * @example run.progress
             */
            type: string;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** RunEventItem */
        RunEventItem: {
            /** Seq */
            seq: number;
            /** Type */
            type: string;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** RunEventPage */
        RunEventPage: {
            /**
             * Items
             * @description Eventos com `seq` maior que `after`, em ordem.
             */
            items: components["schemas"]["RunEvent"][];
            /**
             * Next After
             * @description Use como `after` para buscar o restante; nulo quando não há mais eventos.
             */
            next_after: number | null;
        };
        /**
         * RunKind
         * @enum {string}
         */
        RunKind: "interactive" | "scheduled" | "reflection";
        /**
         * RunStatus
         * @enum {string}
         */
        RunStatus: "queued" | "running" | "waiting_approval" | "succeeded" | "failed" | "cancelled";
        /** RunStepItem */
        RunStepItem: {
            /** Seq */
            seq: number;
            /** Kind */
            kind: string;
            /** Step */
            step: string | null;
            /** Model */
            model: string | null;
            /** Status */
            status: string;
            /** Input Tokens */
            input_tokens: number | null;
            /** Output Tokens */
            output_tokens: number | null;
            /** Cache Read Tokens */
            cache_read_tokens: number | null;
            /** Cache Write Tokens */
            cache_write_tokens: number | null;
            /** Cost Usd */
            cost_usd: string | null;
            /** Latency Ms */
            latency_ms: number | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** RunSummary */
        RunSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            agent_id: components["schemas"]["AgentId"];
            kind: components["schemas"]["RunKind"];
            status: components["schemas"]["RunStatus"];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
        };
        /** SectionEdit */
        SectionEdit: {
            /** Heading */
            heading?: string | null;
            /** Body */
            body?: string | null;
            /** In Prompt */
            in_prompt?: boolean | null;
            /** Note */
            note?: string | null;
        };
        /** SharedDetail */
        SharedDetail: {
            /**
             * Doc
             * @enum {string}
             */
            doc: "README.md" | "conversa.md" | "reflexao.md";
            active: components["schemas"]["VersionRef"] | null;
            /** Active Content */
            active_content: string | null;
            /**
             * Shared Rules
             * @description README.md: a seção de regras compartilhadas que entra no prompt dos sete.
             */
            shared_rules: string | null;
            draft: components["schemas"]["VersionRef"] | null;
            /** Draft Content */
            draft_content: string | null;
        };
        /** SharedUnit */
        SharedUnit: {
            /**
             * Doc
             * @enum {string}
             */
            doc: "README.md" | "conversa.md" | "reflexao.md";
            active: components["schemas"]["VersionRef"] | null;
            draft: components["schemas"]["VersionRef"] | null;
        };
        /** SkillDetail */
        SkillDetail: {
            /** Agent Id */
            agent_id: string;
            /** Delivery Type */
            delivery_type: string;
            active: components["schemas"]["SkillVersion"] | null;
            draft: components["schemas"]["SkillVersion"] | null;
        };
        /** SkillSection */
        SkillSection: {
            /** Title */
            title: string;
            /** Body */
            body: string;
        };
        /** SkillSummary */
        SkillSummary: {
            /** Delivery Type */
            delivery_type: string;
            /** Title */
            title: string | null;
            /** @description Nulo: a delivery ainda não tem skill escrita. */
            active: components["schemas"]["VersionRef"] | null;
            draft: components["schemas"]["VersionRef"] | null;
            /** Chars */
            chars: number | null;
        };
        /** SkillVersion */
        SkillVersion: {
            ref: components["schemas"]["VersionRef"];
            /**
             * Content
             * @description skills/<delivery>.md inteiro, com o front matter.
             */
            content: string;
            /** Meta */
            meta: {
                [key: string]: unknown;
            };
            /** Title */
            title: string | null;
            /**
             * Sections
             * @description Seções ## do corpo (procedimento, formato da entrega, critérios de aceite).
             */
            sections: components["schemas"]["SkillSection"][];
            /** Chars */
            chars: number;
        };
        /** SoulSection */
        SoulSection: {
            /**
             * Section
             * @enum {string}
             */
            section: "identidade" | "o_que_faz" | "como_fala" | "limites" | "memoria" | "nunca_faz";
            /** Position */
            position: number;
            /** Heading */
            heading: string;
            /** Body */
            body: string;
            /** In Prompt */
            in_prompt: boolean;
            /** Words */
            words: number;
            /** Chars */
            chars: number;
            /**
             * Changed In Version
             * @description Versão da SOUL em que texto, título ou flag desta seção mudou por último.
             */
            changed_in_version: number;
        };
        /** SoulVersion */
        SoulVersion: {
            ref: components["schemas"]["VersionRef"];
            /**
             * Title
             * @description Título do agente (seção identidade, nível 1).
             */
            title: string;
            /** Sections */
            sections: components["schemas"]["SoulSection"][];
            /** Sections In Prompt */
            sections_in_prompt: number;
            /**
             * Chars In Prompt
             * @description Caracteres da SOUL que entram no prompt.
             */
            chars_in_prompt: number;
        };
        /** SquadAgentSummary */
        SquadAgentSummary: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Article */
            article: string | null;
            /** Role */
            role: string | null;
            /** Role Full */
            role_full: string | null;
            /** Color */
            color: string | null;
            /** Shape */
            shape: string | null;
            /** Default Model */
            default_model: string | null;
            /** Effort */
            effort: string | null;
            /** Deliveries */
            deliveries: number;
            /** Skills Written */
            skills_written: number;
            /** Soul Version */
            soul_version: number | null;
            /** Config Version */
            config_version: number | null;
            /** Pending Drafts */
            pending_drafts: number;
            /**
             * Last Prompt Hash
             * @description Hash do último prompt usado num run deste agente (agent_prompt_versions).
             */
            last_prompt_hash: string | null;
            /** Runs 30D */
            runs_30d: number;
            /**
             * Avg Cost Usd 30D
             * @description Custo médio de IA por run concluído nos últimos 30 dias; nulo sem run.
             */
            avg_cost_usd_30d: number | null;
        };
        /** SquadOverview */
        SquadOverview: {
            /** Agents */
            agents: components["schemas"]["SquadAgentSummary"][];
            /** Shared */
            shared: components["schemas"]["SharedUnit"][];
            /**
             * Tool Catalog
             * @description Catálogo de ferramentas do squad: a união das listas dos sete agent.yaml.
             */
            tool_catalog: string[];
            /**
             * Fingerprint
             * @description Impressão digital das versões ativas (muda quando algo é publicado).
             */
            fingerprint: string | null;
        };
        /** SquadStatus */
        SquadStatus: {
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /**
             * Agents
             * @description Os sete, na ordem do squad.
             */
            agents: components["schemas"]["AgentStatus"][];
        };
        /** SubscriptionState */
        SubscriptionState: {
            /**
             * Status
             * @description none: sem assinatura; pending: aguardando o primeiro pagamento; past_due: o período pago acabou sem o próximo ciclo confirmado (nada é bloqueado).
             * @enum {string}
             */
            status: "none" | "pending" | "active" | "past_due" | "cancelled";
            /**
             * Plan
             * @description Nome do plano assinado.
             * @example Squad
             */
            plan: string | null;
            /**
             * Provisional
             * @description Sem valor em dinheiro: preço e plano ficam em tabela, provisórios (dono, 16/10).
             */
            provisional: boolean;
            /** Provider */
            provider: ("asaas" | "mercadopago" | "mock") | null;
            /** Method */
            method: ("card" | "pix") | null;
            /** Current Period Start */
            current_period_start: string | null;
            /**
             * Current Period End
             * @description Fim do período pago.
             */
            current_period_end: string | null;
            /**
             * Next Cycle At
             * @description Quando começa o próximo ciclo (nulo se cancelada ou sem assinatura).
             */
            next_cycle_at: string | null;
            /** Past Due Since */
            past_due_since: string | null;
            /** Cancelled At */
            cancelled_at: string | null;
        };
        /** SupportAccess */
        SupportAccess: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Admin Email */
            admin_email: string | null;
            /** Reason */
            reason: string;
            /** Mode */
            mode: string;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Expires At
             * Format: date-time
             */
            expires_at: string;
            /** Ended At */
            ended_at: string | null;
        };
        /** TaskRule */
        TaskRule: {
            /** Agent Id */
            agent_id: string;
            /** Task */
            task: string;
            /** Steps */
            steps: string[];
            /** Model */
            model: string;
            /** Effort */
            effort: string | null;
            /** Thinking */
            thinking: string;
            /** Thinking Budget */
            thinking_budget: number | null;
            /** Source */
            source: string;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
        };
        /** TopupItem */
        TopupItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /** For Sale */
            for_sale: boolean;
            /** Version */
            version: number;
            /** Credits */
            credits: string;
            /** Validity Days */
            validity_days: number | null;
            /** Amount */
            amount: string;
            /** Currency */
            currency: string;
            /** Provisional */
            provisional: boolean;
            /** Approved Commercially */
            approved_commercially: boolean;
        };
        /** UnreadCount */
        UnreadCount: {
            /** Conversations */
            conversations: number;
            /** Messages */
            messages: number;
        };
        /** UnreadSummary */
        UnreadSummary: {
            /**
             * Conversations
             * @description Conversas com mensagem não lida.
             */
            conversations: number;
            /**
             * Messages
             * @description Mensagens não lidas, somadas.
             */
            messages: number;
            /** @description Sala do Squad. */
            squad_room: components["schemas"]["UnreadCount"];
            /**
             * By Agent
             * @description Pelo especialista à frente da conversa (o ambiente dele), fora a Sala do Squad; só os que têm não lida.
             */
            by_agent: components["schemas"]["AgentUnread"][];
        };
        /** UsageTotals */
        UsageTotals: {
            /** Requests */
            requests: number;
            /** Credits Charged */
            credits_charged: string;
            /** Llm Calls */
            llm_calls: number;
            /** Conversation Calls */
            conversation_calls: number;
            /** Input Tokens */
            input_tokens: number;
            /** Cache Read Tokens */
            cache_read_tokens: number;
            /** Cache Write Tokens */
            cache_write_tokens: number;
            /** Output Tokens */
            output_tokens: number;
            /** Ai Cost Deliveries Usd */
            ai_cost_deliveries_usd: string;
            /** Ai Cost Conversation Usd */
            ai_cost_conversation_usd: string;
            /** Ai Cost Usd */
            ai_cost_usd: string;
            /**
             * Turns
             * @description Runs com chamada de IA (cada resposta de um agente).
             */
            turns: number;
            /** Conversation Turns */
            conversation_turns: number;
            /** Turn Cost Usd */
            turn_cost_usd: string;
        };
        /** User */
        User: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Email */
            email: string | null;
            /** Full Name */
            full_name: string | null;
            /**
             * Locale
             * @description Idioma escolhido pela pessoa (cadastro, user_metadata.locale); null usa o do negócio.
             */
            locale?: ("pt-BR" | "en" | "es") | null;
        };
        /** VersionContent */
        VersionContent: {
            ref: components["schemas"]["VersionRef"];
            /**
             * Path
             * @description Arquivo de squad/ que esta versão representa.
             */
            path: string;
            /**
             * Content
             * @description Texto do arquivo como o export grava (a SOUL já montada).
             */
            content: string;
        };
        /** VersionDiff */
        VersionDiff: {
            /** Path */
            path: string;
            from_version: components["schemas"]["VersionRef"];
            to_version: components["schemas"]["VersionRef"];
            /**
             * Unified
             * @description Diff unificado (difflib), vazio quando o conteúdo é igual.
             */
            unified: string;
            /** Lines */
            lines: components["schemas"]["DiffLine"][];
            /**
             * Changed Sections
             * @description Na SOUL: seções com título, texto ou flag diferente.
             */
            changed_sections: string[];
        };
        /** VersionList */
        VersionList: {
            /** Items */
            items: components["schemas"]["VersionRef"][];
        };
        /** VersionRef */
        VersionRef: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "soul" | "skill" | "config" | "shared";
            /** Agent Id */
            agent_id: string | null;
            /** Key */
            key: string;
            /** Version */
            version: number;
            /**
             * Status
             * @enum {string}
             */
            status: "draft" | "active" | "superseded" | "discarded";
            /** Author */
            author: string;
            /** Note */
            note: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Published At */
            published_at: string | null;
            /**
             * Restored From Version
             * @description Voltar versão: a versão cujo conteúdo esta repete.
             */
            restored_from_version?: number | null;
        };
        /** WebhookReceipt */
        WebhookReceipt: {
            /**
             * Received
             * @default true
             * @constant
             */
            received: true;
            /**
             * Result
             * @description Fila do Asaas com apiVersion antiga só aceita resposta com SUCCESS no corpo.
             * @default SUCCESS
             * @constant
             */
            result: "SUCCESS";
            /**
             * Duplicate
             * @description Evento já recebido antes: nada foi aplicado de novo.
             */
            duplicate: boolean;
            /**
             * Outcome
             * @description applied: mudou cobrança, assinatura ou créditos; no_change: estado igual ou fora de ordem; ignored: cobrança ou assinatura que não é desta plataforma; needs_review: conciliação à mão (estorno parcial).
             * @enum {string}
             */
            outcome: "received" | "applied" | "no_change" | "ignored" | "needs_review";
        };
        /** WorkItem */
        WorkItem: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Project Id */
            project_id: string | null;
            /** Conversation Id */
            conversation_id: string | null;
            /** Origin Message Id */
            origin_message_id: string | null;
            /**
             * Title
             * @example Legenda do post de sábado: pão de fermentação longa
             */
            title: string;
            /**
             * Delivery Type
             * @example 04.01
             */
            delivery_type: string | null;
            status: components["schemas"]["WorkItemStatus"];
            primary_agent_id: components["schemas"]["AgentId"];
            /** Collaborator Agent Ids */
            collaborator_agent_ids: components["schemas"]["AgentId"][];
            /** Created By */
            created_by: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Due At
             * @description Prazo do trabalho.
             */
            due_at?: string | null;
            /**
             * Status Label
             * @description Frase viva: a do agente ("Otto criando a primeira versão") ou a do estado ("v1 aguarda sua aprovação"), no idioma do workspace.
             * @example v1 aguarda sua aprovação
             */
            status_label?: string | null;
            /**
             * Next Step
             * @description Próximo passo.
             * @example Aprovar a v1
             */
            next_step?: string | null;
            origin?: components["schemas"]["WorkItemOrigin"] | null;
            /**
             * Awaiting You
             * @description Tem pendência que depende da pessoa agora (não adiada).
             * @default false
             */
            awaiting_you: boolean;
            /** @description A pendência aberta (a que depende de você primeiro). */
            pending_approval?: components["schemas"]["PendingApprovalSummary"] | null;
            /**
             * Step Label
             * @description Trabalho coordenado: a etapa em que está ("etapa 1 de 3").
             * @example etapa 1 de 3
             */
            step_label?: string | null;
            /** @description Versão mais recente da entrega (número, estado, data e decisão). */
            current_version?: components["schemas"]["CurrentVersionSummary"] | null;
        };
        /**
         * WorkItemCreate
         * @example {
         *       "briefing": {
         *         "canal": "instagram",
         *         "tom": "acolhedor, direto, sem gíria"
         *       },
         *       "delivery_type": "04.01",
         *       "idempotency_key": "web:7f6c2a5e-legenda-sabado",
         *       "title": "Legenda do post de sábado: pão de fermentação longa"
         *     }
         */
        WorkItemCreate: {
            /**
             * Delivery Type
             * @description Id da delivery no catálogo (Documento Mestre, Anexo A); define o dono.
             * @example 04.01
             */
            delivery_type?: string | null;
            /** Title */
            title: string;
            /**
             * Briefing
             * @description Objeto JSON livre (até 20.000 caracteres depois de serializado).
             */
            briefing?: {
                [key: string]: unknown;
            };
            /**
             * Idempotency Key
             * @description Chave do cliente para repetir o pedido sem duplicar. Sem ela, a chave é a mensagem mais o tipo de delivery.
             */
            idempotency_key?: string | null;
        };
        /** WorkItemCreated */
        WorkItemCreated: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Project Id */
            project_id: string | null;
            /** Conversation Id */
            conversation_id: string | null;
            /** Origin Message Id */
            origin_message_id: string | null;
            /**
             * Title
             * @example Legenda do post de sábado: pão de fermentação longa
             */
            title: string;
            /**
             * Delivery Type
             * @example 04.01
             */
            delivery_type: string | null;
            status: components["schemas"]["WorkItemStatus"];
            primary_agent_id: components["schemas"]["AgentId"];
            /** Collaborator Agent Ids */
            collaborator_agent_ids: components["schemas"]["AgentId"][];
            /** Created By */
            created_by: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Due At
             * @description Prazo do trabalho.
             */
            due_at?: string | null;
            /**
             * Status Label
             * @description Frase viva: a do agente ("Otto criando a primeira versão") ou a do estado ("v1 aguarda sua aprovação"), no idioma do workspace.
             * @example v1 aguarda sua aprovação
             */
            status_label?: string | null;
            /**
             * Next Step
             * @description Próximo passo.
             * @example Aprovar a v1
             */
            next_step?: string | null;
            origin?: components["schemas"]["WorkItemOrigin"] | null;
            /**
             * Awaiting You
             * @description Tem pendência que depende da pessoa agora (não adiada).
             * @default false
             */
            awaiting_you: boolean;
            /** @description A pendência aberta (a que depende de você primeiro). */
            pending_approval?: components["schemas"]["PendingApprovalSummary"] | null;
            /**
             * Step Label
             * @description Trabalho coordenado: a etapa em que está ("etapa 1 de 3").
             * @example etapa 1 de 3
             */
            step_label?: string | null;
            /** @description Versão mais recente da entrega (número, estado, data e decisão). */
            current_version?: components["schemas"]["CurrentVersionSummary"] | null;
            /** Briefing */
            briefing: {
                [key: string]: unknown;
            };
            /**
             * Run Id
             * @description Run enfileirado em runs_interactive para este trabalho.
             */
            run_id: string | null;
        };
        /** WorkItemDetail */
        WorkItemDetail: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workspace Id
             * Format: uuid
             */
            workspace_id: string;
            /** Project Id */
            project_id: string | null;
            /** Conversation Id */
            conversation_id: string | null;
            /** Origin Message Id */
            origin_message_id: string | null;
            /**
             * Title
             * @example Legenda do post de sábado: pão de fermentação longa
             */
            title: string;
            /**
             * Delivery Type
             * @example 04.01
             */
            delivery_type: string | null;
            status: components["schemas"]["WorkItemStatus"];
            primary_agent_id: components["schemas"]["AgentId"];
            /** Collaborator Agent Ids */
            collaborator_agent_ids: components["schemas"]["AgentId"][];
            /** Created By */
            created_by: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Due At
             * @description Prazo do trabalho.
             */
            due_at?: string | null;
            /**
             * Status Label
             * @description Frase viva: a do agente ("Otto criando a primeira versão") ou a do estado ("v1 aguarda sua aprovação"), no idioma do workspace.
             * @example v1 aguarda sua aprovação
             */
            status_label?: string | null;
            /**
             * Next Step
             * @description Próximo passo.
             * @example Aprovar a v1
             */
            next_step?: string | null;
            origin?: components["schemas"]["WorkItemOrigin"] | null;
            /**
             * Awaiting You
             * @description Tem pendência que depende da pessoa agora (não adiada).
             * @default false
             */
            awaiting_you: boolean;
            /** @description A pendência aberta (a que depende de você primeiro). */
            pending_approval?: components["schemas"]["PendingApprovalSummary"] | null;
            /**
             * Step Label
             * @description Trabalho coordenado: a etapa em que está ("etapa 1 de 3").
             * @example etapa 1 de 3
             */
            step_label?: string | null;
            /** @description Versão mais recente da entrega (número, estado, data e decisão). */
            current_version?: components["schemas"]["CurrentVersionSummary"] | null;
            /** Briefing */
            briefing: {
                [key: string]: unknown;
            };
            /** Steps */
            steps: components["schemas"]["WorkItemStep"][];
            /** Deliveries */
            deliveries: components["schemas"]["Delivery"][];
            /** Approvals */
            approvals: components["schemas"]["Approval"][];
            /** Runs */
            runs: components["schemas"]["RunSummary"][];
            /**
             * History
             * @description Do mais antigo ao mais recente.
             */
            history?: components["schemas"]["WorkItemHistoryEntry"][];
        };
        /** WorkItemHistoryEntry */
        WorkItemHistoryEntry: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            actor_type: components["schemas"]["MessageAuthorType"];
            /** Actor User Id */
            actor_user_id: string | null;
            agent_id: components["schemas"]["AgentId"] | null;
            /**
             * Kind
             * @enum {string}
             */
            kind: "requested" | "delivered" | "decided" | "team" | "step";
            /**
             * Text
             * @example Você aprovou a v2
             */
            text: string;
            /**
             * Mark
             * @description "automático" ou "aprovado por você".
             */
            mark: ("automatic" | "approved_by_you") | null;
            /**
             * Mark Label
             * @example aprovado por você
             */
            mark_label: string | null;
            /** Params */
            params: {
                [key: string]: unknown;
            };
            /** Approval Id */
            approval_id: string | null;
            /** Delivery Version Id */
            delivery_version_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * WorkItemOrigin
         * @description De onde o trabalho nasceu, com o que o web precisa para escrever a origem.
         */
        WorkItemOrigin: {
            type: components["schemas"]["WorkItemOriginType"];
            /**
             * Ref
             * @description Id da mensagem, da sugestão ou do projeto; código da execução.
             */
            ref: string;
            /**
             * Conversation Id
             * @description Conversa do pedido (origem mensagem).
             */
            conversation_id: string | null;
            conversation_kind: components["schemas"]["ConversationKind"] | null;
            /** @description Especialista da conversa direta ou quem percebeu o insight. */
            agent_id: components["schemas"]["AgentId"] | null;
            /**
             * Title
             * @description Título do insight ou nome do projeto.
             */
            title: string | null;
        };
        /**
         * WorkItemOriginType
         * @enum {string}
         */
        WorkItemOriginType: "message" | "insight" | "routine_run" | "project";
        /** WorkItemPage */
        WorkItemPage: {
            /**
             * Items
             * @description O mais novo primeiro.
             */
            items: components["schemas"]["WorkItem"][];
            /** Next Cursor */
            next_cursor: string | null;
        };
        /**
         * WorkItemStatus
         * @enum {string}
         */
        WorkItemStatus: "draft" | "in_progress" | "needs_you" | "scheduled" | "approved" | "done" | "paused" | "blocked" | "failed" | "cancelled";
        /** WorkItemStep */
        WorkItemStep: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Seq */
            seq: number;
            /** Title */
            title: string;
            /** @description Responsável pela etapa. */
            agent_id: components["schemas"]["AgentId"] | null;
            status: components["schemas"]["WorkItemStepStatus"];
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
            /**
             * Delivery Type
             * @description Etapa planejada pelo Nexo (01.02): a delivery da etapa. Nulo = fase do run.
             * @example 02.04
             */
            delivery_type?: string | null;
            /**
             * Depends On
             * @description Etapas (seq) cuja saída esta etapa lê antes de começar.
             */
            depends_on?: number[];
            /**
             * Responsibility
             * @description Como aparece na equipe.
             * @example estratégia e conceito
             */
            responsibility?: string | null;
            /**
             * Instruction
             * @description O recorte do pedido para a etapa.
             */
            instruction?: string | null;
            /**
             * Status Reason
             * @description Código do motivo (image_engine_pending, depends_on_step, work_cancelled).
             */
            status_reason?: string | null;
            /**
             * Status Reason Label
             * @description O motivo no idioma do workspace.
             * @example Aguardando o motor de imagem
             */
            status_reason_label?: string | null;
            /**
             * Delivery Version Id
             * @description A versão que a etapa entregou ou que a fechou (saída).
             */
            delivery_version_id?: string | null;
            /** Version No */
            version_no?: number | null;
        };
        /**
         * WorkItemStepStatus
         * @enum {string}
         */
        WorkItemStepStatus: "pending" | "in_progress" | "needs_you" | "waiting_engine" | "blocked" | "done" | "failed" | "skipped";
        /** Workspace */
        Workspace: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /**
             * Locale
             * @description Idioma do negócio; os agentes respondem nele (ADR-0010).
             * @enum {string}
             */
            locale: "pt-BR" | "en" | "es";
            /** @description Seu papel neste workspace. */
            role: components["schemas"]["WorkspaceRole"];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** WorkspaceCreate */
        WorkspaceCreate: {
            /**
             * Name
             * @description Nome do negócio, como aparece para o time. Sem quebra de linha, caracteres de controle nem < > (422 validation_error).
             * @example Miolo
             */
            name: string;
            /**
             * Slug
             * @description Endereço único: letras minúsculas, números e hífen (3 a 48). Endereço reservado (rotas do app) responde 422 slug_reserved.
             * @example miolo
             */
            slug: string;
            /**
             * Locale
             * @description Idioma do negócio desde o começo (os agentes respondem nele e a fala de boas-vindas do Nexo sai nele). Sem ele, pt-BR, como antes.
             */
            locale?: ("pt-BR" | "en" | "es") | null;
        };
        /** WorkspaceList */
        WorkspaceList: {
            /** Items */
            items: components["schemas"]["Workspace"][];
        };
        /**
         * WorkspaceRole
         * @enum {string}
         */
        WorkspaceRole: "owner" | "admin" | "editor" | "viewer";
        /** WorkspaceSummary */
        WorkspaceSummary: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /**
             * Locale
             * @description Idioma do negócio; os agentes respondem nele (ADR-0010).
             * @enum {string}
             */
            locale: "pt-BR" | "en" | "es";
        };
        /** WorkspaceUpdate */
        WorkspaceUpdate: {
            /**
             * Locale
             * @description Idioma do negócio (owner ou admin).
             * @enum {string}
             */
            locale: "pt-BR" | "en" | "es";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    get_me_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_workspaces_workspaces_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_workspace_workspaces_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkspaceCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workspace"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_workspace_workspaces__workspace_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workspace"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_workspace_workspaces__workspace_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkspaceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workspace"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_conversations_workspaces__workspace_id__conversations_get: {
        parameters: {
            query?: {
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_conversation_workspaces__workspace_id__conversations_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConversationCreate"];
            };
        };
        responses: {
            /** @description Conversa existente reutilizada. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationDetail"];
                };
            };
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    unread_summary_workspaces__workspace_id__conversations_unread_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UnreadSummary"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    mark_read_conversations__conversation_id__read_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                conversation_id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ReadCreate"] | null;
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationRead"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_conversation_conversations__conversation_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                conversation_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_messages_conversations__conversation_id__messages_get: {
        parameters: {
            query?: {
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Lê de trás para frente. `latest` traz as mensagens mais recentes; para as anteriores, passe aqui o `next_cursor` da resposta. A página continua em ordem cronológica. Não combina com `cursor`. */
                before?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path: {
                conversation_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessagePage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    post_message_conversations__conversation_id__messages_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                conversation_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MessageCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    request_reply_messages__message_id__reply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                message_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Mesmo run, já pedido antes. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReplyRequest"];
                };
            };
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReplyRequest"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_projects_workspaces__workspace_id__projects_get: {
        parameters: {
            query?: {
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_project_workspaces__workspace_id__projects_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_work_item_messages__message_id__work_items_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                message_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkItemCreate"];
            };
        };
        responses: {
            /** @description Pedido repetido: o trabalho já existia. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemCreated"];
                };
            };
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemCreated"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_work_items_workspaces__workspace_id__work_items_get: {
        parameters: {
            query?: {
                /** @description Filtra por estado; repita o parâmetro para mais de um. */
                status?: components["schemas"]["WorkItemStatus"][] | null;
                /** @description Só os trabalhos do projeto. */
                project_id?: string | null;
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_work_item_work_items__work_item_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                work_item_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_project_projects__project_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_project_projects__project_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    set_participants_projects__project_id__participants_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectParticipantsSet"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    add_milestone_projects__project_id__milestones_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MilestoneCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectMilestone"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_milestone_milestones__milestone_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                milestone_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MilestoneUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectMilestone"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    upcoming_milestones_workspaces__workspace_id__milestones_get: {
        parameters: {
            query?: {
                /** @description Janela a partir de hoje (o protótipo usa 10). */
                days?: number;
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MilestonePage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    needs_workspaces__workspace_id__needs_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NeedsYou"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    squad_status_workspaces__workspace_id__squad_status_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SquadStatus"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_calendar_workspaces__workspace_id__calendar_get: {
        parameters: {
            query: {
                /** @description Primeiro dia (AAAA-MM-DD). */
                from: string;
                /** @description Último dia, até 92 dias depois. */
                to: string;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_approvals_workspaces__workspace_id__approvals_get: {
        parameters: {
            query?: {
                /** @description Filtra pelo estado da decisão. */
                status?: components["schemas"]["ApprovalStatus"] | null;
                /** @description Inclui as autorizações adiadas ("Agora não"); por padrão ficam fora. */
                include_deferred?: boolean;
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApprovalPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    decide_approval_approvals__approval_id__decision_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                approval_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApprovalDecisionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Approval"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    defer_approval_approvals__approval_id__defer_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                approval_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApprovalDefer"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Approval"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    resume_approval_approvals__approval_id__resume_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                approval_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Approval"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_run_runs__run_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_run_events_runs__run_id__events_get: {
        parameters: {
            query?: {
                /** @description Último `seq` que o cliente já tem (0 = desde o início). */
                after?: number;
                /** @description Itens por página (1 a 500). */
                limit?: number;
            };
            header?: never;
            path: {
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunEventPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_memory_workspaces__workspace_id__memory_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemoryDossier"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_suggestions_workspaces__workspace_id__memory_suggestions_get: {
        parameters: {
            query?: {
                /** @description `open` aberto, `seen` visto, `done` feito. */
                state?: components["schemas"]["MemorySuggestionState"] | null;
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemorySuggestionList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    decide_suggestion_memory_suggestions__suggestion_id__decision_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                suggestion_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MemorySuggestionDecisionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemorySuggestionDecided"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    correct_fact_memory_facts__fact_id__correct_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fact_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandFactCorrection"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrandFact"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    fact_history_memory_facts__fact_id__history_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fact_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrandFactHistory"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    search_memory_workspaces__workspace_id__memory_search_get: {
        parameters: {
            query: {
                /** @description Texto da busca. */
                q: string;
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemorySearchResult"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_sources_workspaces__workspace_id__memory_sources_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FactSourceList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_conflicts_workspaces__workspace_id__memory_conflicts_get: {
        parameters: {
            query?: {
                /** @description `open` ou `resolved`. */
                state?: components["schemas"]["MemoryConflictState"] | null;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemoryConflictList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    resolve_conflict_memory_conflicts__conflict_id__resolve_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                conflict_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MemoryConflictResolve"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemoryConflict"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    change_fact_state_memory_facts__fact_id__state_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                fact_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandFactStateChange"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrandFact"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    add_fact_workspaces__workspace_id__memory_facts_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandFactCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrandFact"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    mark_suggestion_seen_memory_suggestions__suggestion_id__seen_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                suggestion_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemorySuggestion"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    update_profile_workspaces__workspace_id__memory_profile_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BrandProfileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrandProfile"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_learnings_workspaces__workspace_id__memory_learnings_get: {
        parameters: {
            query?: {
                status?: components["schemas"]["AgentLearningStatus"] | null;
                agent_id?: components["schemas"]["AgentId"] | null;
                delivery_type?: string | null;
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AgentLearningList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    decide_learning_memory_learnings__learning_id__decision_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                learning_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AgentLearningDecisionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AgentLearning"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    estimate_credits_credits_estimate_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreditEstimateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreditEstimate"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    import_contacts_workspaces__workspace_id__contacts_imports_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContactImportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContactImport"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    contact_summary_workspaces__workspace_id__contacts_summary_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContactSummary"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    revoke_consent_workspaces__workspace_id__contacts_consents_revocations_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConsentRevocationRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsentRevocation"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_metrics_workspaces__workspace_id__metrics_get: {
        parameters: {
            query: {
                /** @description Primeiro dia (AAAA-MM-DD). */
                from: string;
                /** @description Último dia, até 366 dias depois. */
                to: string;
                channel?: string | null;
                metric?: string | null;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MetricsPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_email_preferences_me_email_preferences_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailPreferenceList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    set_email_preference_me_email_preferences__template__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                template: "approval_pending" | "delivery_ready" | "payment_confirmed" | "payment_problem";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailPreferenceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailPreference"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    receive_webhook_billing_webhooks__provider__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "asaas" | "mercadopago" | "mock";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WebhookReceipt"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_subscription_workspaces__workspace_id__billing_subscription_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubscriptionState"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_payments_workspaces__workspace_id__billing_payments_get: {
        parameters: {
            query?: {
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    admin_me_admin_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminMe"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_accounts_admin_accounts_get: {
        parameters: {
            query?: {
                /** @description Busca no nome ou no slug. */
                q?: string | null;
                /** @description Slug do plano. */
                plan?: string | null;
                status?: ("active" | "deleted") | null;
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 100). */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_account_admin_accounts__workspace_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workspace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_catalog_admin_catalog_get: {
        parameters: {
            query?: {
                agent_id?: ("nexo" | "bia" | "kaia" | "otto" | "kiwi" | "max" | "iris") | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogResponse"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_plans_admin_plans_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlansResponse"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_payments_admin_payments_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentsOverview"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_audit_admin_audit_get: {
        parameters: {
            query?: {
                actor?: ("platform_admin" | "customer" | "system") | null;
                workspace_id?: string | null;
                category?: string | null;
                since?: string | null;
                until?: string | null;
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 200). */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuditPage"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_queue_admin_queue_get: {
        parameters: {
            query?: {
                /** @description Estado do run. */
                status?: string | null;
                workspace_id?: string | null;
                /** @description Valor de `next_cursor` da página anterior. Vazio = primeira página. */
                cursor?: string | null;
                /** @description Itens por página (1 a 200). */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueueOverview"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_queue_run_admin_queue_runs__run_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_models_admin_models_get: {
        parameters: {
            query?: {
                /** @description Primeiro dia (padrão: 30 dias até `until`). */
                since?: string | null;
                /** @description Último dia, inclusive (padrão: hoje). */
                until?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelsOverview"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_consumption_admin_consumption_get: {
        parameters: {
            query?: {
                /** @description Primeiro dia (padrão: 30 dias até `until`). */
                since?: string | null;
                /** @description Último dia, inclusive (padrão: hoje). */
                until?: string | null;
                workspace_id?: string | null;
                granularity?: "day" | "week" | "month";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsumptionResponse"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_alerts_admin_alerts_get: {
        parameters: {
            query?: {
                /** @description Primeiro dia (padrão: 30 dias até `until`). */
                since?: string | null;
                /** @description Último dia, inclusive (padrão: hoje). */
                until?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlertsResponse"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_quality_admin_quality_get: {
        parameters: {
            query?: {
                /** @description Primeiro dia (padrão: 30 dias até `until`). */
                since?: string | null;
                /** @description Último dia, inclusive (padrão: hoje). */
                until?: string | null;
                workspace_id?: string | null;
                /** @description Idioma do "como ler" (padrão: o da pessoa; sem ele, pt-BR). */
                locale?: ("pt-BR" | "en" | "es") | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QualityResponse"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    compare_quality_admin_quality_compare_get: {
        parameters: {
            query: {
                a_since: string;
                a_until: string;
                b_since: string;
                b_until: string;
                workspace_id?: string | null;
                delivery_type?: string | null;
                agent_id?: components["schemas"]["AgentId"] | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QualityComparison"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_providers_admin_providers_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProvidersResponse"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    report_provider_balance_admin_providers__provider__balance_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BalanceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderHealthItem"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_squad_admin_squad_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SquadOverview"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_agent_admin_squad_agents__agent_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agent_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AgentDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_skill_admin_squad_agents__agent_id__skills__delivery_type__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agent_id: string;
                delivery_type: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    edit_skill_admin_squad_agents__agent_id__skills__delivery_type__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agent_id: string;
                delivery_type: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContentEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_shared_admin_squad_shared__doc__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                doc: "README.md" | "conversa.md" | "reflexao.md";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SharedDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    edit_shared_admin_squad_shared__doc__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                doc: "README.md" | "conversa.md" | "reflexao.md";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContentEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_versions_admin_squad_versions_get: {
        parameters: {
            query: {
                kind: string;
                agent_id?: string | null;
                key?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_version_admin_squad_versions__version_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionContent"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    diff_versions_admin_squad_diff_get: {
        parameters: {
            query: {
                from: string;
                to: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionDiff"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_prompt_admin_squad_agents__agent_id__prompt_get: {
        parameters: {
            query: {
                /** @description Delivery (ex.: 04.01), conversa ou reflexao. */
                route: string;
                /** @description Montar com os rascunhos pendentes. */
                draft?: boolean;
            };
            header?: never;
            path: {
                agent_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PromptPreview"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    edit_soul_section_admin_squad_agents__agent_id__soul_sections__section__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agent_id: string;
                section: "identidade" | "o_que_faz" | "como_fala" | "limites" | "memoria" | "nunca_faz";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SectionEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    edit_config_admin_squad_agents__agent_id__config_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agent_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfigEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    publish_version_admin_squad_versions__version_id__publish_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    discard_version_admin_squad_versions__version_id__discard_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    restore_version_admin_squad_versions__version_id__restore_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RestoreRequest"] | null;
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRef"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_rules_admin_rules_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleDocList"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    get_rule_doc_admin_rules__doc_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                doc_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleDocDetail"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    save_rule_doc_admin_rules__doc_id__versions_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                doc_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RuleDocEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleSaveResult"];
                };
            };
            /** @description Token ausente, inválido ou expirado. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Sem permissão para esta ação. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Recurso não encontrado (ou fora do seu acesso). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflito com o estado atual do registro. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dados inválidos. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Dependência indisponível (banco ou Auth). */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
}
