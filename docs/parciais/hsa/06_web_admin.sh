#!/usr/bin/env bash
# H-SA alvo 7 — orquestra o 06_web_admin.mjs: um run do seed para a tela do run; idioma do Vic em en e depois es pelo
# user_metadata.locale (restaurado no fim, igual ao que estava). Só lê o banco, fora o user_metadata do Vic.
# Uso: bash docs/parciais/hsa/06_web_admin.sh
set -uo pipefail
ROOT=/home/vitao/projetos/hellosquad
q() { docker exec -i supabase_db_hellosquad psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt -F'|' -c "$1"; }
export RUN_ID=$(q "select id from runs order by created_at limit 1")
ORIG=$(q "select raw_user_meta_data::text from auth.users where email='vic@hellosquad.example'")
cd "$ROOT/apps/web"
I18N_STEP=none node "$ROOT/docs/parciais/hsa/06_web_admin.mjs"
cp "$ROOT/docs/parciais/hsa/06_web_admin.json" /tmp/hsa_06_ptbr.json
for loc in en es; do
  q "update auth.users set raw_user_meta_data = raw_user_meta_data || '{\"locale\": \"$loc\"}'::jsonb where email='vic@hellosquad.example'" >/dev/null
  I18N_STEP=$loc node "$ROOT/docs/parciais/hsa/06_web_admin.mjs" 2>&1 | grep -E "^Vic em|erros de console"
done
q "update auth.users set raw_user_meta_data = \$\$${ORIG}\$\$::jsonb where email='vic@hellosquad.example'" >/dev/null
echo "user_metadata do Vic restaurado: $([ "$(q "select raw_user_meta_data::text from auth.users where email='vic@hellosquad.example'")" = "$ORIG" ] && echo sim || echo NÃO)"
