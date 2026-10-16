# Esconde chaves e senhas da saída do Supabase CLI no make status e no make up (H1-09).
# Para preencher o .env com os valores: pnpm exec supabase status -o env (só no terminal, nunca em arquivo versionado).
s/(sb_(secret|publishable)_)[A-Za-z0-9_-]+/\1***/g
s/eyJ[A-Za-z0-9_.-]+/eyJ***/g
s/\b[0-9a-f]{32,}\b/***/g
s/super-secret-jwt-token[A-Za-z0-9_-]*/***/g
s|(postgres(ql)?://[^:/@ ]+:)[^@ ]+@|\1***@|g
