#!/usr/bin/env bash
# SA3a: roteiro do Squad IA (/admin/squad/*, /admin/rules/*) contra a API local (8100). Rodar da raiz do
# repositório com o Supabase local, o seed e o squad-seed. Não imprime token nem chave. No fim, apaga as
# versões que o roteiro criou (só no banco local, com os gatilhos desligados nesta limpeza), para o
# histórico de teste não ficar no banco do dono.
set -euo pipefail
API=http://127.0.0.1:8100
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
DB="docker exec -i supabase_db_hellosquad psql -U postgres -Atq"
login() {
  curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
    -H "apikey: $PK" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
    | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'
}
VIC=$(login vic@hellosquad.example)
MARINA=$(login marina@miolo.example)
BEFORE=$($DB -c "select coalesce(string_agg(id::text, ','), '') from public.squad_versions")
call() { # call <método> <jwt> <caminho> <corpo json ou -> <expressão python sobre r>
  local data=()
  [ "$4" != "-" ] && data=(-H 'Content-Type: application/json' -d "$4")
  curl -s -w '\n%{http_code}' -X "$1" "$API$3" -H "Authorization: Bearer $2" "${data[@]}" | python3 -c "
import sys, json
*body, status = sys.stdin.read().split('\n')
r = json.loads('\n'.join(body))
print('$1 $3 ->', status, $5)"
}
echo '== Vic: leitura'
call GET "$VIC" /admin/squad - '[(a["id"], "alma v" + str(a["soul_version"]), "yaml v" + str(a["config_version"]), a["skills_written"], "/", a["deliveries"]) for a in r["agents"]], "digital:", r["fingerprint"][:12]'
call GET "$VIC" /admin/squad/agents/otto - '"alma:", r["soul"]["title"], r["soul"]["sections_in_prompt"], "seções no prompt,", r["soul"]["chars_in_prompt"], "caracteres;", "ferramentas:", len(r["config"]["fields"]["tools"]), "skills:", [(s["delivery_type"], s["active"]["version"] if s["active"] else None) for s in r["skills"]]'
call GET "$VIC" "/admin/squad/agents/otto/prompt?route=04.01" - '"o que ele lê:", r["origin"], r["content_hash"][:12], [(b["part"], b["chars"], b["tokens_estimated"]) for b in r["blocks"]], "total", r["tokens_estimated"], "tokens (" + r["token_estimate_method"].split(" ")[0] + ")"'
call GET "$VIC" /admin/rules - '[(d["slug"], "v" + str(d["version"]), "no prompt" if d["in_prompt"] else "referência interna", d["marks"]) for d in r["items"]]'
echo '== Vic: editar → rascunho, comparar, conferir, publicar, voltar'
DRAFT=$(curl -s -X PUT "$API/admin/squad/agents/otto/soul/sections/como_fala" -H "Authorization: Bearer $VIC" \
  -H 'Content-Type: application/json' -d '{"body": "Na voz da marca, não na sua. Frases curtas e concretas.", "note": "roteiro SA3a"}' \
  | python3 -c 'import sys, json; r = json.load(sys.stdin); print(r["id"]); print("rascunho:", r["kind"], "v" + str(r["version"]), r["status"], file=sys.stderr)')
V1=$($DB -c "select id from public.squad_versions where kind = 'soul' and agent_id = 'otto' and version = 1")
call GET "$VIC" "/admin/squad/diff?from=$V1&to=$DRAFT" - '"seções mudadas:", r["changed_sections"], [l["op"] + " " + l["text"][:60] for l in r["lines"] if l["op"] != " "]'
call GET "$VIC" "/admin/squad/agents/otto/prompt?route=04.01&draft=true" - '"com o rascunho:", r["content_hash"][:12]'
call POST "$VIC" "/admin/squad/versions/$DRAFT/publish" - '"publicada:", "v" + str(r["version"]), r["status"]'
call GET "$VIC" "/admin/squad/agents/otto/prompt?route=04.01" - '"ativo agora:", r["content_hash"][:12]'
call POST "$VIC" "/admin/squad/versions/$V1/restore" '{}' '"voltou:", "v" + str(r["version"]), r["status"], "conteúdo da v" + str(r["restored_from_version"])'
call GET "$VIC" "/admin/squad/agents/otto/prompt?route=04.01" - '"ativo depois de voltar:", r["content_hash"][:12]'
call PUT "$VIC" /admin/squad/agents/otto/config '{"tools": ["memoria.ler", "planilhas.apagar_tudo"]}' 'r["error"]["code"], r["error"]["message"]'
echo '== Marina (owner da Miolo)'
call GET "$MARINA" /admin/squad - 'r["error"]["code"], r["error"]["message"]'
call PUT "$MARINA" /admin/squad/agents/otto/soul/sections/como_fala '{"body": "x"}' 'r["error"]["code"]'
call POST "$MARINA" "/admin/squad/versions/$V1/restore" '{}' 'r["error"]["code"]'
echo '== Auditoria do roteiro'
$DB -c "select action || ' v' || (payload ->> 'version') || ' por ' || (select email from auth.users where id::text = actor_id) from public.audit_events where entity_type = 'squad_version' and payload ->> 'note' is distinct from 'x' order by created_at desc limit 3"
echo '== Limpeza (só local): versões criadas pelo roteiro'
$DB <<SQL
begin;
set local session_replication_role = replica;
delete from public.agent_prompt_sections where not (version_id::text = any(string_to_array('$BEFORE', ',')));
delete from public.squad_versions where not (id::text = any(string_to_array('$BEFORE', ',')));
update public.squad_versions set status = 'active' where kind = 'soul' and agent_id = 'otto' and version = 1;
commit;
SQL
$DB -c "select 'versões da SOUL do Otto: ' || string_agg('v' || version || ' ' || status, ', ' order by version) from public.squad_versions where kind = 'soul' and agent_id = 'otto'"
