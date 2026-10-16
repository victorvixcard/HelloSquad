"""Servidores falsos do Asaas (API v3) e do Mercado Pago para os testes da S2e.

Reproduzem o que a documentação oficial descreve (fontes com data em docs/parciais/S2e-relatorio.md):
rotas, campos obrigatórios, códigos HTTP, formato de erro, estados e o webhook de cada um, inclusive a
autenticação (Asaas: `asaas-access-token`; Mercado Pago: `x-signature` HMAC-SHA256 do manifesto). Um
app ASGI só, porque as rotas não colidem (`/v3/...` do Asaas; `/v1/...`, `/preapproval` e
`/authorized_payments` do Mercado Pago). Credenciais e dados são fictícios.
"""

import base64
import hashlib
import hmac
import json
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse

from hellosquad.billing.mercadopago import signature_manifest

BRASILIA = timezone(timedelta(hours=-3))
ASAAS_KEY = "$aact_hmlg_000000000000_ficticia"
ASAAS_WEBHOOK_TOKEN = "token-ficticio-do-webhook-asaas-0001"
MP_TOKEN = "TEST-0000000000000000-101626-ficticio"
MP_WEBHOOK_SECRET = "segredo-ficticio-do-webhook-mp"
APPROVED_CARD = "tok_aprovado"
DECLINED_CARD = "tok_recusado"


def _asaas_error(status: int, code: str, description: str) -> JSONResponse:
    return JSONResponse(
        {"errors": [{"code": code, "description": description}]}, status_code=status
    )


def _mp_error(status: int, error: str, message: str, code: Any = None) -> JSONResponse:
    cause = [{"code": code, "description": message}] if code is not None else []
    return JSONResponse(
        {"message": message, "error": error, "status": status, "cause": cause}, status_code=status
    )


def _add_month(day: date) -> date:
    year, month = (day.year + 1, 1) if day.month == 12 else (day.year, day.month + 1)
    for candidate in (day.day, 30, 29, 28):
        try:
            return date(year, month, candidate)
        except ValueError:
            continue
    raise ValueError(day)


class FakeAsaas:
    BILLING_TYPES = {"UNDEFINED", "BOLETO", "CREDIT_CARD", "PIX"}
    CYCLES = {"WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"}

    def __init__(self) -> None:
        self.customers: dict[str, dict[str, Any]] = {}
        self.subscriptions: dict[str, dict[str, Any]] = {}
        self.payments: dict[str, dict[str, Any]] = {}
        self.requests: list[dict[str, Any]] = []
        self.router = APIRouter(prefix="/v3")
        self._routes()

    def _auth(self, request: Request) -> JSONResponse | None:
        self.requests.append(
            {
                "method": request.method,
                "path": request.url.path,
                "user_agent": request.headers.get("user-agent"),
            }
        )
        key = request.headers.get("access_token")
        if not key:
            return _asaas_error(
                401, "access_token_not_found", "O cabeçalho access_token é obrigatório."
            )
        if key != ASAAS_KEY:
            return _asaas_error(401, "invalid_access_token", "A chave de API fornecida é inválida.")
        return None

    def _payment(self, **fields: Any) -> dict[str, Any]:
        payment_id = f"pay_{secrets.token_hex(6)}"
        payment = {
            "object": "payment",
            "id": payment_id,
            "dateCreated": datetime.now(BRASILIA).date().isoformat(),
            "subscription": None,
            "installment": None,
            "netValue": round(fields["value"] * 0.97, 2),
            "description": None,
            "externalReference": None,
            "invoiceUrl": f"https://sandbox.asaas.com/i/{payment_id[4:]}",
            "deleted": False,
            "refunds": None,
            **fields,
        }
        if fields["billingType"] == "CREDIT_CARD":
            payment["creditCard"] = {
                "creditCardNumber": "0000",
                "creditCardBrand": "MASTERCARD",
                "creditCardToken": fields.pop("_token", None),
            }
        payment.pop("_token", None)
        self.payments[payment_id] = payment
        return payment

    def _routes(self) -> None:
        router = self.router

        @router.post("/customers")
        async def create_customer(request: Request):
            if denied := self._auth(request):
                return denied
            body = await request.json()
            if not body.get("name"):
                return _asaas_error(400, "invalid_name", "O nome do cliente deve ser informado.")
            if not body.get("cpfCnpj"):
                return _asaas_error(
                    400, "invalid_cpfCnpj", "O CPF/CNPJ do cliente deve ser informado."
                )
            customer_id = f"cus_{secrets.token_hex(6)}"
            self.customers[customer_id] = {
                "object": "customer",
                "id": customer_id,
                "dateCreated": datetime.now(BRASILIA).date().isoformat(),
                "deleted": False,
                "personType": "JURIDICA" if len(body["cpfCnpj"]) == 14 else "FISICA",
                **body,
            }
            return self.customers[customer_id]

        def card_problem(body: dict[str, Any]) -> JSONResponse | None:
            if body.get("billingType") != "CREDIT_CARD":
                return None
            if not body.get("creditCardToken") and not body.get("creditCard"):
                return _asaas_error(400, "invalid_creditCard", "Informe o cartão ou o token.")
            if not body.get("remoteIp"):
                return _asaas_error(400, "invalid_remoteIp", "O IP do pagador deve ser informado.")
            if body.get("creditCardToken") == DECLINED_CARD:
                return _asaas_error(400, "invalid_creditCard", "Transação não autorizada.")
            return None

        @router.post("/subscriptions")
        async def create_subscription(request: Request):
            if denied := self._auth(request):
                return denied
            body = await request.json()
            if body.get("customer") not in self.customers:
                return _asaas_error(400, "invalid_customer", "Customer Inválido ou não informado")
            if body.get("billingType") not in self.BILLING_TYPES:
                return _asaas_error(400, "invalid_billingType", "Forma de pagamento inválida.")
            if not body.get("value") or body["value"] <= 0:
                return _asaas_error(400, "invalid_value", "O campo value deve ser informado")
            if not body.get("nextDueDate"):
                return _asaas_error(400, "invalid_nextDueDate", "Informe o vencimento.")
            if body.get("cycle") not in self.CYCLES:
                return _asaas_error(400, "invalid_cycle", "Periodicidade inválida.")
            if problem := card_problem(body):
                return problem
            subscription_id = f"sub_{secrets.token_hex(6)}"
            subscription = {
                "object": "subscription",
                "id": subscription_id,
                "dateCreated": datetime.now(BRASILIA).date().isoformat(),
                "customer": body["customer"],
                "billingType": body["billingType"],
                "cycle": body["cycle"],
                "value": body["value"],
                "nextDueDate": body["nextDueDate"],
                "description": body.get("description"),
                "externalReference": body.get("externalReference"),
                "status": "ACTIVE",
                "deleted": False,
            }
            self.subscriptions[subscription_id] = subscription
            self.next_cycle(subscription_id, token=body.get("creditCardToken"))
            return subscription

        @router.get("/subscriptions/{subscription_id}")
        async def get_subscription(subscription_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            if subscription_id not in self.subscriptions:
                return JSONResponse({}, status_code=404)
            return self.subscriptions[subscription_id]

        @router.delete("/subscriptions/{subscription_id}")
        async def delete_subscription(subscription_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            subscription = self.subscriptions.get(subscription_id)
            if subscription is None:
                return JSONResponse({}, status_code=404)
            subscription.update(deleted=True, status="INACTIVE")
            for payment in self.payments.values():
                if payment["subscription"] == subscription_id and payment["status"] in (
                    "PENDING",
                    "OVERDUE",
                ):
                    payment["deleted"] = True
            return {"deleted": True, "id": subscription_id}

        @router.get("/subscriptions/{subscription_id}/payments")
        async def list_subscription_payments(subscription_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            offset = int(request.query_params.get("offset", 0))
            limit = int(request.query_params.get("limit", 10))
            data = [
                p
                for p in self.payments.values()
                if p["subscription"] == subscription_id and not p["deleted"]
            ]
            page = data[offset : offset + limit]
            return {
                "object": "list",
                "hasMore": offset + limit < len(data),
                "totalCount": len(data),
                "limit": limit,
                "offset": offset,
                "data": page,
            }

        @router.post("/payments")
        async def create_payment(request: Request):
            if denied := self._auth(request):
                return denied
            body = await request.json()
            if body.get("customer") not in self.customers:
                return _asaas_error(400, "invalid_customer", "Customer Inválido ou não informado")
            if body.get("billingType") not in self.BILLING_TYPES:
                return _asaas_error(400, "invalid_billingType", "Forma de pagamento inválida.")
            if not body.get("value") or body["value"] <= 0:
                return _asaas_error(400, "invalid_value", "O campo value deve ser informado")
            if not body.get("dueDate"):
                return _asaas_error(400, "invalid_dueDate", "Informe o vencimento.")
            if problem := card_problem(body):
                return problem
            card = body["billingType"] == "CREDIT_CARD"
            return self._payment(
                customer=body["customer"],
                billingType=body["billingType"],
                value=body["value"],
                dueDate=body["dueDate"],
                description=body.get("description"),
                externalReference=body.get("externalReference"),
                status="CONFIRMED" if card else "PENDING",
                _token=body.get("creditCardToken"),
            )

        @router.get("/payments/{payment_id}")
        async def get_payment(payment_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            if payment_id not in self.payments:
                return JSONResponse({}, status_code=404)
            return self.payments[payment_id]

        @router.get("/payments/{payment_id}/pixQrCode")
        async def pix_qr_code(payment_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            payment = self.payments.get(payment_id)
            if payment is None:
                return JSONResponse({}, status_code=404)
            if payment["billingType"] not in ("PIX", "BOLETO", "UNDEFINED"):
                return _asaas_error(400, "invalid_action", "Cobrança não é Pix.")
            return {
                "encodedImage": base64.b64encode(b"qr-ficticio").decode(),
                "payload": f"00020101021226820014br.gov.bcb.pix2560pix.example/qr/{payment_id}",
                "expirationDate": f"{payment['dueDate']} 23:59:59",
                "description": None,
            }

        @router.post("/payments/{payment_id}/refund")
        async def refund(payment_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            payment = self.payments.get(payment_id)
            if payment is None:
                return JSONResponse({}, status_code=404)
            payment["status"] = "REFUNDED"
            return payment

    def next_cycle(self, subscription_id: str, *, token: str | None = None) -> dict[str, Any]:
        """O Asaas gera a cobrança do ciclo (até 40 dias antes do vencimento) e avança nextDueDate."""
        subscription = self.subscriptions[subscription_id]
        due = date.fromisoformat(subscription["nextDueDate"])
        card = subscription["billingType"] == "CREDIT_CARD"
        payment = self._payment(
            customer=subscription["customer"],
            billingType=subscription["billingType"],
            value=subscription["value"],
            dueDate=due.isoformat(),
            description=subscription["description"],
            externalReference=subscription["externalReference"],
            subscription=subscription_id,
            status="CONFIRMED" if card and token != DECLINED_CARD else "PENDING",
            _token=token,
        )
        subscription["nextDueDate"] = _add_month(due).isoformat()
        return payment

    def set_status(self, payment_id: str, status: str) -> dict[str, Any]:
        self.payments[payment_id]["status"] = status
        return self.payments[payment_id]

    def webhook(
        self,
        event: str,
        *,
        payment_id: str | None = None,
        subscription_id: str | None = None,
        token: str | None = ASAAS_WEBHOOK_TOKEN,
        event_id: str | None = None,
    ) -> tuple[dict[str, str], bytes]:
        body: dict[str, Any] = {
            "id": event_id or f"evt_{secrets.token_hex(16)}&{secrets.randbelow(10**9)}",
            "event": event,
            "dateCreated": datetime.now(BRASILIA).strftime("%Y-%m-%d %H:%M:%S"),
            "account": {"id": "acc-ficticia", "ownerId": None},
        }
        if payment_id:
            body["payment"] = dict(self.payments[payment_id])
        if subscription_id:
            body["subscription"] = dict(self.subscriptions[subscription_id])
        headers = {"content-type": "application/json"}
        if token is not None:
            headers["asaas-access-token"] = token
        return headers, json.dumps(body).encode()


class FakeMercadoPago:
    def __init__(self) -> None:
        self.customers: dict[str, dict[str, Any]] = {}
        self.payments: dict[int, dict[str, Any]] = {}
        self.idempotency: dict[str, int] = {}
        self.preapprovals: dict[str, dict[str, Any]] = {}
        self.authorized: dict[int, dict[str, Any]] = {}
        self.router = APIRouter()
        self._routes()

    def _auth(self, request: Request) -> JSONResponse | None:
        if request.headers.get("authorization") != f"Bearer {MP_TOKEN}":
            return _mp_error(401, "unauthorized", "invalid access token")
        return None

    def _new_payment(self, body: dict[str, Any]) -> dict[str, Any]:
        payment_id = 10_000_000_000 + len(self.payments) + 1
        now = datetime.now(BRASILIA)
        pix = body["payment_method_id"] == "pix"
        if pix:
            status, detail = "pending", "pending_waiting_transfer"
        elif body.get("token") == DECLINED_CARD:
            status, detail = "rejected", "cc_rejected_other_reason"
        else:
            status, detail = "approved", "accredited"
        payment = {
            "id": payment_id,
            "date_created": now.isoformat(timespec="milliseconds"),
            "date_approved": now.isoformat(timespec="milliseconds")
            if status == "approved"
            else None,
            "status": status,
            "status_detail": detail,
            "payment_method_id": body["payment_method_id"],
            "payment_type_id": "bank_transfer" if pix else "credit_card",
            "transaction_amount": body["transaction_amount"],
            "currency_id": "BRL",
            "description": body.get("description"),
            "external_reference": body.get("external_reference"),
            "payer": {"email": body.get("payer", {}).get("email"), "identification": {}},
            "date_of_expiration": (
                (now + timedelta(hours=24)).isoformat(timespec="milliseconds") if pix else None
            ),
            "point_of_interaction": (
                {
                    "type": "PIX",
                    "transaction_data": {
                        "qr_code": f"00020126580014br.gov.bcb.pix0136pix.example/{payment_id}",
                        "qr_code_base64": base64.b64encode(b"qr-ficticio").decode(),
                        "ticket_url": f"https://www.mercadopago.com.br/payments/{payment_id}/ticket",
                    },
                }
                if pix
                else {}
            ),
        }
        if not pix:
            payment["card"] = {
                "last_four_digits": "0000",
                "cardholder": {"name": "TITULAR FICTICIO"},
            }
        self.payments[payment_id] = payment
        return payment

    def _routes(self) -> None:
        router = self.router

        @router.post("/v1/customers")
        async def create_customer(request: Request):
            if denied := self._auth(request):
                return denied
            body = await request.json()
            if not body.get("email"):
                return _mp_error(400, "bad_request", "email is required", "100")
            if any(c["email"] == body["email"] for c in self.customers.values()):
                return _mp_error(400, "bad_request", "the customer already exist", "101")
            customer_id = f"{len(self.customers) + 1:09d}-{secrets.token_hex(7)}"
            self.customers[customer_id] = {"id": customer_id, **body}
            return JSONResponse(self.customers[customer_id], status_code=201)

        @router.get("/v1/customers/search")
        async def search_customers(request: Request):
            if denied := self._auth(request):
                return denied
            email = request.query_params.get("email")
            results = [c for c in self.customers.values() if c["email"] == email]
            return {"paging": {"limit": 10, "offset": 0, "total": len(results)}, "results": results}

        @router.post("/v1/payments")
        async def create_payment(request: Request):
            if denied := self._auth(request):
                return denied
            key = request.headers.get("x-idempotency-key")
            if not key:
                return _mp_error(400, "bad_request", "Header X-Idempotency-Key can't be null", 4292)
            if key in self.idempotency:
                return JSONResponse(self.payments[self.idempotency[key]], status_code=201)
            body = await request.json()
            if not body.get("transaction_amount"):
                return _mp_error(400, "bad_request", "transaction_amount is required", 4002)
            if not body.get("payment_method_id"):
                return _mp_error(400, "bad_request", "payment_method_id is required", 4001)
            if not (body.get("payer") or {}).get("email"):
                return _mp_error(400, "bad_request", "payer.email is required", 4050)
            if body["payment_method_id"] != "pix":
                if not body.get("token"):
                    return _mp_error(400, "bad_request", "token is required", 4000)
                if not body.get("installments"):
                    return _mp_error(400, "bad_request", "installments is required", 4004)
            payment = self._new_payment(body)
            self.idempotency[key] = payment["id"]
            return JSONResponse(payment, status_code=201)

        @router.get("/v1/payments/{payment_id}")
        async def get_payment(payment_id: int, request: Request):
            if denied := self._auth(request):
                return denied
            if payment_id not in self.payments:
                return _mp_error(404, "not_found", "Payment not found", 2000)
            return self.payments[payment_id]

        @router.post("/preapproval")
        async def create_preapproval(request: Request):
            if denied := self._auth(request):
                return denied
            body = await request.json()
            recurring = body.get("auto_recurring") or {}
            if not body.get("payer_email"):
                return _mp_error(400, "bad_request", "payer_email is required")
            if not recurring.get("transaction_amount") or recurring.get("currency_id") != "BRL":
                return _mp_error(400, "bad_request", "auto_recurring is invalid")
            if recurring.get("frequency_type") not in ("days", "months"):
                return _mp_error(400, "bad_request", "frequency_type is invalid")
            if body.get("status") == "authorized" and not body.get("card_token_id"):
                return _mp_error(400, "bad_request", "card_token_id is required")
            preapproval_id = secrets.token_hex(16)
            start = (
                datetime.fromisoformat(recurring["start_date"]).date()
                if recurring.get("start_date")
                else datetime.now(BRASILIA).date()
            )
            now = datetime.now(BRASILIA).isoformat(timespec="milliseconds")
            preapproval = {
                "id": preapproval_id,
                "version": 0,
                "application_id": 1234567812345678,
                "collector_id": 100200300,
                "preapproval_plan_id": None,
                "reason": body.get("reason"),
                "external_reference": body.get("external_reference"),
                "back_url": body.get("back_url"),
                "init_point": (
                    "https://www.mercadopago.com.br/subscriptions/checkout"
                    f"?preapproval_id={preapproval_id}"
                ),
                "auto_recurring": recurring,
                "payer_id": 200300400,
                "card_id": 300400500 if body.get("card_token_id") else None,
                "payment_method_id": "master" if body.get("card_token_id") else None,
                "next_payment_date": f"{start.isoformat()}T00:00:00.000-03:00",
                "date_created": now,
                "last_modified": now,
                "status": body.get("status") or "pending",
                "_token": body.get("card_token_id"),
            }
            self.preapprovals[preapproval_id] = preapproval
            if preapproval["status"] == "authorized":
                self.charge_cycle(preapproval_id)
            return JSONResponse(self._public(preapproval), status_code=201)

        @router.get("/preapproval/{preapproval_id}")
        async def get_preapproval(preapproval_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            if preapproval_id not in self.preapprovals:
                return _mp_error(404, "not_found", "Not-found")
            return self._public(self.preapprovals[preapproval_id])

        @router.put("/preapproval/{preapproval_id}")
        async def update_preapproval(preapproval_id: str, request: Request):
            if denied := self._auth(request):
                return denied
            preapproval = self.preapprovals.get(preapproval_id)
            if preapproval is None:
                return _mp_error(404, "not_found", "Not-found")
            body = await request.json()
            if preapproval["status"] == "canceled":
                return _mp_error(400, "bad_request", "You can not modify a canceled preapproval")
            if body.get("status") not in ("paused", "authorized", "canceled"):
                return _mp_error(400, "bad_request", "status is invalid")
            preapproval["status"] = body["status"]
            return self._public(preapproval)

        @router.get("/authorized_payments/search")
        async def search_authorized(request: Request):
            if denied := self._auth(request):
                return denied
            preapproval_id = request.query_params.get("preapproval_id")
            results = [a for a in self.authorized.values() if a["preapproval_id"] == preapproval_id]
            return {"paging": {"offset": 0, "limit": 50, "total": len(results)}, "results": results}

        @router.get("/authorized_payments/{authorized_id}")
        async def get_authorized(authorized_id: int, request: Request):
            if denied := self._auth(request):
                return denied
            if authorized_id not in self.authorized:
                return _mp_error(404, "not_found", "Not-found")
            return self.authorized[authorized_id]

    @staticmethod
    def _public(preapproval: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in preapproval.items() if not k.startswith("_")}

    def charge_cycle(self, preapproval_id: str, *, approve: bool = True) -> dict[str, Any]:
        """Parcela do ciclo: authorized_payment com o pagamento do cartão (retentativas no mesmo id)."""
        preapproval = self.preapprovals[preapproval_id]
        debit = datetime.fromisoformat(preapproval["next_payment_date"])
        payment = self._new_payment(
            {
                "payment_method_id": preapproval["payment_method_id"] or "master",
                "token": preapproval["_token"] if approve else DECLINED_CARD,
                "transaction_amount": preapproval["auto_recurring"]["transaction_amount"],
                "description": preapproval["reason"],
                "external_reference": preapproval["external_reference"],
                "payer": {"email": "pagador@hellosquad.example"},
            }
        )
        authorized_id = 6_000_000_000 + len(self.authorized) + 1
        self.authorized[authorized_id] = {
            "id": authorized_id,
            "type": "scheduled",
            "date_created": debit.isoformat(timespec="milliseconds"),
            "last_modified": debit.isoformat(timespec="milliseconds"),
            "preapproval_id": preapproval_id,
            "reason": preapproval["reason"],
            "external_reference": preapproval["external_reference"],
            "currency_id": "BRL",
            "transaction_amount": preapproval["auto_recurring"]["transaction_amount"],
            "debit_date": debit.isoformat(timespec="milliseconds"),
            "retry_attempt": 0 if approve else 1,
            "status": "processed" if approve else "recycling",
            "summarized": "done" if approve else "pending",
            "payment": {
                "id": payment["id"],
                "status": payment["status"],
                "status_detail": payment["status_detail"],
            },
        }
        next_debit = _add_month(debit.date())
        preapproval["next_payment_date"] = f"{next_debit.isoformat()}T00:00:00.000-03:00"
        return self.authorized[authorized_id]

    def webhook(
        self,
        topic: str,
        resource_id: str | int,
        *,
        action: str | None = None,
        secret: str = MP_WEBHOOK_SECRET,
        notification_id: int | None = None,
        ts: str | None = None,
    ) -> tuple[dict[str, str], dict[str, str], bytes]:
        """Notificação como o Mercado Pago envia: query (data.id, type), cabeçalhos e corpo."""
        data_id = str(resource_id)
        request_id = secrets.token_hex(16)
        ts = ts or str(int(datetime.now(BRASILIA).timestamp()))
        signature = hmac.new(
            secret.encode(), signature_manifest(data_id, request_id, ts).encode(), hashlib.sha256
        ).hexdigest()
        body = {
            "id": notification_id or secrets.randbelow(10**11),
            "live_mode": False,
            "type": topic,
            "date_created": datetime.now(BRASILIA).isoformat(timespec="milliseconds"),
            "user_id": 100200300,
            "api_version": "v1",
            "action": action or f"{topic}.updated",
            "data": {"id": data_id},
        }
        headers = {
            "content-type": "application/json",
            "x-signature": f"ts={ts},v1={signature}",
            "x-request-id": request_id,
        }
        return {"data.id": data_id, "type": topic}, headers, json.dumps(body).encode()


def fake_app(asaas: FakeAsaas, mercadopago: FakeMercadoPago) -> FastAPI:
    app = FastAPI()
    app.include_router(asaas.router)
    app.include_router(mercadopago.router)
    return app
