# @hellosquad/contracts — contrato da API

- `openapi.json`: contrato OpenAPI 3.1 exportado pelo backend (`make openapi`). Fonte da verdade.
- `src/schema.ts`: tipos gerados com `openapi-typescript` (`pnpm --filter contracts generate`). Não editar à mão; `test/client.test.ts` falha se ficar defasado do JSON.
- `src/client.ts`: cliente `fetch` tipado (`openapi-fetch`) que injeta `Authorization: Bearer <access_token>` e converte o envelope de erro `{"error": {"code", "message", "details"}}` em `ApiError` tipado.

Quando a API mudar: `make openapi && pnpm --filter contracts generate`, commitar os dois arquivos juntos.

```ts
import { createApiClient, isApiError, unwrap } from "@hellosquad/contracts";

const api = createApiClient({ baseUrl: "http://127.0.0.1:8100", accessToken: session.access_token });
const me = await unwrap(api.GET("/me"));

try {
  await unwrap(api.POST("/workspaces", { body: { name: "Miolo", slug: "miolo" } }));
} catch (error) {
  if (isApiError(error, "slug_taken")) {
    // 409: endereço já usado. error.message vem em português da API.
  }
}
```

Erros do próprio cliente: `network_error` (status 0, API fora do ar) e `unexpected_response` (resposta fora do envelope, por exemplo um 502 em HTML).
