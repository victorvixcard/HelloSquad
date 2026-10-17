-- S3b — a execução encerrada continua imutável, mas a FK pode soltar o trabalho ou o run apagado (on delete set
-- null): apagar um workspace ou o seed não pode esbarrar na guarda. Só work_item_id e run_id podem virar nulos.

create or replace function app.responsibility_runs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.responsibilities r where r.id = old.responsibility_id) then
      return old;
    end if;
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Execução do Modo Autônomo não se apaga: o histórico fica guardado.';
  end if;
  if old.status in ('approved', 'done', 'failed', 'skipped') then
    if (to_jsonb(new) - 'work_item_id' - 'run_id' - 'updated_at')
         = (to_jsonb(old) - 'work_item_id' - 'run_id' - 'updated_at')
       and (new.work_item_id is null or new.work_item_id = old.work_item_id)
       and (new.run_id is null or new.run_id = old.run_id) then
      return new;
    end if;
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Execução encerrada não muda: o registro fica como aconteceu.';
  end if;
  if new.workspace_id <> old.workspace_id or new.responsibility_id <> old.responsibility_id
     or new.code <> old.code or new.scheduled_for <> old.scheduled_for or new.created_at <> old.created_at then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'Código, responsabilidade e horário de uma execução não mudam.';
  end if;
  return new;
end;
$$;

revoke all on function app.responsibility_runs_guard() from public, anon, authenticated, service_role;
