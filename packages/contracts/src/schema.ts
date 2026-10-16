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
            /** @description Conflito com um registro existente. */
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
