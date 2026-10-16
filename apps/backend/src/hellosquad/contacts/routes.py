"""Importação de contatos por CSV e resumo da base (06.03; Documento Mestre §15: consentimento
específico e base legal para dados de contatos e disparos).

O CSV chega como texto, é lido em memória e nunca é guardado. Cada linha é validada aqui (nome,
endereço, consentimento por canal com data, duplicata no próprio arquivo e, no ambiente local,
e-mail só no domínio reservado `.example`); as linhas válidas entram por `app.import_contacts`,
que confere de novo o papel e o consentimento e marca como duplicata quem já está na base. Linha
sem consentimento é recusada. O relatório traz número da linha e motivo, sem o dado da linha
recusada. Nada aqui envia mensagem.
"""

import csv
import io
import json
import re
import unicodedata
from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.config import get_settings

router = APIRouter(tags=["contacts"])

MAX_ROWS = 5000
LOCAL_ENVS = {"local", "test"}
FICTITIOUS_EMAIL_TLD = ".example"
YES = {"sim", "s", "yes", "y", "true", "1", "x"}
NO = {"nao", "n", "no", "false", "0", ""}
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z0-9-]{2,}$")
HEADER_ALIASES = {
    "nome": "nome",
    "name": "nome",
    "email": "email",
    "e_mail": "email",
    "telefone": "telefone",
    "celular": "telefone",
    "whatsapp": "telefone",
    "phone": "telefone",
    "consentimento_email": "consentimento_email",
    "consentimento_e_mail": "consentimento_email",
    "consentimento_whatsapp": "consentimento_whatsapp",
    "data_consentimento": "data_consentimento",
    "ultima_compra": "ultima_compra",
    "compras": "compras",
}
REQUIRED_HEADERS = {"nome", "consentimento_email", "consentimento_whatsapp", "data_consentimento"}

RefusalReason = Literal[
    "missing_name",
    "missing_address",
    "invalid_email",
    "email_not_fictitious",
    "invalid_phone",
    "no_consent",
    "invalid_consent",
    "consent_without_address",
    "missing_consent_date",
    "invalid_consent_date",
    "invalid_purchase_date",
    "invalid_purchases_count",
    "duplicate_in_file",
    "duplicate_existing",
]

IMPORT = """
select id, file_name, source, total_rows, accepted_rows, refused_rows, refused, created_at
from app.import_contacts(%s, %s, %s, %s, %s::jsonb, %s::jsonb)
"""

SUMMARY = """
with state as (
  select c.id, c.source, c.created_at,
         coalesce(bool_or(s.channel = 'email' and s.status = 'granted'), false) as email_ok,
         coalesce(bool_or(s.channel = 'whatsapp' and s.status = 'granted'), false) as whatsapp_ok
  from public.contacts c
  left join public.contact_consent_state s
    on s.contact_id = c.id and s.workspace_id = c.workspace_id
  where c.workspace_id = %(workspace_id)s
  group by c.id
)
select count(*) as total,
       count(*) filter (where email_ok) as email,
       count(*) filter (where whatsapp_ok) as whatsapp,
       count(*) filter (where email_ok or whatsapp_ok) as any_channel,
       coalesce(
         (select jsonb_agg(jsonb_build_object('source', o.source, 'contacts', o.n)
                           order by o.source)
          from (select source, count(*) as n from state group by source) o),
         '[]'::jsonb
       ) as sources,
       (select max(i.created_at) from public.contact_imports i
        where i.workspace_id = %(workspace_id)s) as last_import_at
from state
"""


class ContactImportRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=200, examples=["clientes-balcao.csv"])
    source: str = Field(
        min_length=1,
        max_length=120,
        description="Origem dos dados, registrada em cada contato e consentimento.",
        examples=["Planilha de clientes do balcão"],
    )
    csv: str = Field(
        min_length=1,
        max_length=2_000_000,
        description=(
            "Conteúdo do CSV (vírgula ou ponto e vírgula), com cabeçalho: nome, email, telefone, "
            "consentimento_email, consentimento_whatsapp (sim/não), data_consentimento "
            "(AAAA-MM-DD ou DD/MM/AAAA) e, opcionais, ultima_compra e compras."
        ),
    )


class RefusedLine(BaseModel):
    line: int = Field(description="Linha do arquivo (o cabeçalho é a linha 1).")
    reason: RefusalReason


class ContactImport(BaseModel):
    id: UUID
    file_name: str
    source: str
    total_rows: int
    accepted_rows: int
    refused_rows: int
    refused: list[RefusedLine] = Field(description="Linhas recusadas: número e motivo, sem o dado.")
    created_at: datetime


class ConsentCounts(BaseModel):
    email: int
    whatsapp: int
    any_channel: int = Field(description="Aceitam receber mensagens em ao menos um canal.")


class ContactSource(BaseModel):
    source: str
    contacts: int


class ContactSummary(BaseModel):
    total: int
    consented: ConsentCounts
    without_consent: int = Field(description="Não recebem mensagem em canal nenhum.")
    sources: list[ContactSource]
    last_import_at: datetime | None


def _key(header: str) -> str:
    plain = unicodedata.normalize("NFKD", header).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", plain.strip().lower()).strip("_")


def _plain(value: str | None) -> str:
    return _key(value or "")


def _date(value: str) -> date | None:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _phone(value: str) -> str | None:
    digits = re.sub(r"\D", "", value)
    if len(digits) in (10, 11):
        digits = "55" + digits
    if digits.startswith("55") and len(digits) in (12, 13):
        return "+" + digits
    return None


def parse_rows(content: str, *, today: date, local: bool) -> tuple[int, list[dict], list[dict]]:
    """Lê o CSV e separa as linhas aceitas das recusadas (com o motivo da primeira falha)."""
    sample = content[:2048]
    delimiter = ";" if sample.count(";") > sample.count(",") else ","
    reader = csv.reader(io.StringIO(content.lstrip("﻿")), delimiter=delimiter)
    try:
        header = next(reader)
    except StopIteration:
        raise ApiError(422, "invalid_csv", "O arquivo está vazio.") from None
    columns = [HEADER_ALIASES.get(_key(h)) for h in header]
    missing = sorted(REQUIRED_HEADERS - set(columns))
    if missing or ("email" not in columns and "telefone" not in columns):
        missing += [] if ("email" in columns or "telefone" in columns) else ["email ou telefone"]
        raise ApiError(422, "invalid_csv", f"Faltam colunas no cabeçalho: {', '.join(missing)}.")

    accepted: list[dict] = []
    refused: list[dict] = []
    seen: set[str] = set()
    total = 0
    for line, values in enumerate(reader, start=2):
        if not any(v.strip() for v in values):
            continue
        total += 1
        if total > MAX_ROWS:
            raise ApiError(422, "invalid_csv", f"O arquivo passa de {MAX_ROWS} linhas.")
        row = {c: v.strip() for c, v in zip(columns, values, strict=False) if c}
        reason, parsed = validate_row(row, today=today, local=local)
        keys = [k for k in (parsed.get("email"), parsed.get("phone")) if k]
        if reason is None and any(k in seen for k in keys):
            reason = "duplicate_in_file"
        if reason is not None:
            refused.append({"line": line, "reason": reason})
            continue
        seen.update(keys)
        accepted.append({"line": line, **parsed})
    return total, accepted, refused


def validate_row(row: dict[str, str], *, today: date, local: bool) -> tuple[str | None, dict]:
    name = row.get("nome", "")
    if not name:
        return "missing_name", {}
    email = (row.get("email") or "").lower() or None
    phone_raw = row.get("telefone") or ""
    if email is None and not phone_raw:
        return "missing_address", {}
    if email is not None and (not EMAIL.match(email) or len(email) > 254):
        return "invalid_email", {}
    if email is not None and local and not email.endswith(FICTITIOUS_EMAIL_TLD):
        return "email_not_fictitious", {}
    phone = _phone(phone_raw) if phone_raw else None
    if phone_raw and phone is None:
        return "invalid_phone", {}

    answers = {ch: _plain(row.get(f"consentimento_{ch}")) for ch in ("email", "whatsapp")}
    if any(a not in YES | NO for a in answers.values()):
        return "invalid_consent", {}
    channels = [ch for ch, a in answers.items() if a in YES]
    if not channels:
        return "no_consent", {}
    if ("email" in channels and email is None) or ("whatsapp" in channels and phone is None):
        return "consent_without_address", {}
    raw_date = row.get("data_consentimento") or ""
    if not raw_date:
        return "missing_consent_date", {}
    given_at = _date(raw_date)
    if given_at is None or given_at > today:
        return "invalid_consent_date", {}

    last_purchase = None
    if row.get("ultima_compra"):
        last_purchase = _date(row["ultima_compra"])
        if last_purchase is None or last_purchase > today:
            return "invalid_purchase_date", {}
    purchases = None
    if row.get("compras"):
        if not row["compras"].isdigit():
            return "invalid_purchases_count", {}
        purchases = int(row["compras"])
    return None, {
        "name": name[:120],
        "email": email,
        "phone": phone,
        "last_purchase_on": last_purchase.isoformat() if last_purchase else None,
        "purchases_count": purchases,
        "consents": [{"channel": ch, "given_at": given_at.isoformat()} for ch in channels],
    }


@router.post(
    "/workspaces/{workspace_id}/contacts/imports",
    status_code=status.HTTP_201_CREATED,
    summary="Importa contatos de um CSV (só com consentimento; nada é enviado)",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def import_contacts(
    workspace_id: UUID,
    payload: ContactImportRequest,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ContactImport:
    local = get_settings().app_env in LOCAL_ENVS
    total, accepted, refused = parse_rows(payload.csv, today=date.today(), local=local)
    if total == 0:
        raise ApiError(422, "invalid_csv", "O arquivo não tem nenhuma linha de contato.")
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        row = await (
            await conn.execute(
                IMPORT,
                (
                    workspace_id,
                    payload.file_name,
                    payload.source,
                    total,
                    json.dumps(accepted),
                    json.dumps(refused),
                ),
            )
        ).fetchone()
    return ContactImport(**row)


@router.get(
    "/workspaces/{workspace_id}/contacts/summary",
    summary="Resumo da base: total, quem aceita mensagem por canal e de onde vieram os contatos",
    responses=error_responses(401, 404, 422, 503),
)
async def contact_summary(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> ContactSummary:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        row: dict[str, Any] = await (
            await conn.execute(SUMMARY, {"workspace_id": workspace_id})
        ).fetchone()
    return ContactSummary(
        total=row["total"],
        consented=ConsentCounts(
            email=row["email"], whatsapp=row["whatsapp"], any_channel=row["any_channel"]
        ),
        without_consent=row["total"] - row["any_channel"],
        sources=[ContactSource(**s) for s in row["sources"]],
        last_import_at=row["last_import_at"],
    )
