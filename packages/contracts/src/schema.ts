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
        /** Usuário autenticado e os workspaces dele */
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
        /** Cria um workspace; quem cria vira owner */
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
        patch?: never;
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
        /** Um projeto */
        get: operations["get_project_projects__project_id__get"];
        put?: never;
        post?: never;
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
        /** Um trabalho com etapas, entregas (versões e arquivos), aprovações e runs */
        get: operations["get_work_item_work_items__work_item_id__get"];
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
            /** @description `review` revisar, `approve` aprovar, `authorize` autorizar ação externa, `confirm` confirmar, `reconnect` reconectar, `respond` responder. Só o owner decide. */
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
            /** @description `review`/`approve`: approved, changes_requested ou rejected. `authorize`/`confirm`/`reconnect`: approved ou rejected. `respond`: answered. */
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
         * ApprovalKind
         * @enum {string}
         */
        ApprovalKind: "review" | "approve" | "authorize" | "confirm" | "reconnect" | "respond";
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
        /** ContextRef */
        ContextRef: {
            /** @description Tipo do objeto de onde a conversa foi aberta. */
            type: components["schemas"]["ContextType"];
            /**
             * Id
             * Format: uuid
             * @description Id do objeto, no mesmo workspace.
             */
            id: string;
        };
        /**
         * ContextType
         * @enum {string}
         */
        ContextType: "project" | "work_item" | "delivery";
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
            /**
             * Title
             * @example Conversa com o Otto
             */
            title: string | null;
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
             * Format: uuid
             */
            id: string;
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
         *       "context": {
         *         "id": "5eed0000-0000-4000-8000-000000000301",
         *         "type": "work_item"
         *       },
         *       "kind": "object"
         *     }
         */
        ConversationCreate: {
            /** @description `squad_room`: Sala do Squad (uma por workspace, reutilizada). `agent_direct`: conversa direta com um agente (sempre nova). `object`: conversa de um objeto (uma por objeto, reutilizada). */
            kind: components["schemas"]["ConversationKind"];
            /** @description Agente à frente. Obrigatório em `agent_direct`; na Sala do Squad o padrão é o Nexo; na conversa de objeto, o responsável pelo objeto. */
            primary_agent_id?: components["schemas"]["AgentId"] | null;
            /** @description Só em `kind = object`. */
            context?: components["schemas"]["ContextRef"] | null;
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
            /**
             * Title
             * @example Conversa com o Otto
             */
            title: string | null;
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
            /** Participants */
            participants: components["schemas"]["Participant"][];
            /** @description Cartão do objeto (só em `object`). */
            context: components["schemas"]["ConversationContext"] | null;
        };
        /**
         * ConversationKind
         * @enum {string}
         */
        ConversationKind: "squad_room" | "agent_direct" | "object";
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
        };
        /**
         * MessageAuthorType
         * @enum {string}
         */
        MessageAuthorType: "user" | "agent" | "system";
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
        /** Participant */
        Participant: {
            participant_type: components["schemas"]["PrincipalType"];
            /** User Id */
            user_id: string | null;
            agent_id: components["schemas"]["AgentId"] | null;
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
        /**
         * ProjectStatus
         * @enum {string}
         */
        ProjectStatus: "draft" | "active" | "paused" | "done" | "cancelled";
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
        };
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
            agent_id: components["schemas"]["AgentId"] | null;
            status: components["schemas"]["WorkItemStepStatus"];
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
        };
        /**
         * WorkItemStepStatus
         * @enum {string}
         */
        WorkItemStepStatus: "pending" | "in_progress" | "done" | "failed" | "skipped";
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
                    "application/json": components["schemas"]["Project"];
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
    list_approvals_workspaces__workspace_id__approvals_get: {
        parameters: {
            query?: {
                /** @description Filtra pelo estado da decisão. */
                status?: components["schemas"]["ApprovalStatus"] | null;
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
