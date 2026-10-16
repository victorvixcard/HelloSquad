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
             * @description Explicação em português para quem usa.
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
             * @description Nome do negócio, como aparece para o time.
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
