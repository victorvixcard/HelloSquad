#!/usr/bin/env bash
# Uso: flock -o -w 600 /tmp/hellosquad-db.lock bash docs/parciais/h2/11_idioma_web.sh
set -uo pipefail
q() { docker exec -i supabase_db_hellosquad psql -U postgres -d postgres -qAt -c "$1"; }
q "update workspaces set locale='en' where slug='vitta'; update auth.users set raw_user_meta_data = raw_user_meta_data || '{\"locale\":\"es\"}' where email='carla@vitta.example'; update auth.users set raw_user_meta_data = raw_user_meta_data - 'locale' where email='rafael@vitta.example';" >/dev/null
(cd /home/vitao/projetos/hellosquad/apps/web && node /home/vitao/projetos/hellosquad/docs/parciais/h2/11_idioma_web.mjs) 2>&1 | tail -4
q "update workspaces set locale='pt-BR' where slug='vitta'; update auth.users set raw_user_meta_data = raw_user_meta_data - 'locale' where email='carla@vitta.example';" >/dev/null && echo "volta: Vitta pt-BR, Carla sem idioma"
