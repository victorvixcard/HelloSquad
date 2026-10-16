"""Saídas estruturadas das etapas (triagem, produção, autoverificação) e o JSON Schema de cada uma.

O schema vai em `output_config.format` no modo real; o Pydantic valida a resposta nos dois modos.
"""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StepOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TriageBriefing(StepOutput):
    canal: str | None
    objetivo: str | None
    tema: str | None
    tom: str | None
    restricoes: list[str]
    cta: str | None
    data: str | None


class TriageResult(StepOutput):
    delivery_type: str | None
    briefing: TriageBriefing
    faltam: list[str]
    pergunta: str | None
    resumo: str


class CaptionVersion(StepOutput):
    texto: str = Field(min_length=1)
    hashtags: list[str]
    cta: str


class CaptionDelivery(StepOutput):
    """Formato de `delivery_versions.content` da 04.01."""

    canal: str = Field(min_length=1)
    objetivo: str = Field(min_length=1)
    versoes: list[CaptionVersion] = Field(min_length=1)
    notas: str


class Observation(StepOutput):
    """O que o agente percebeu ao produzir: vira sugestão "<Agente> percebeu", nunca regra."""

    leitura: str = Field(min_length=1, max_length=200)
    explicacao: str = Field(max_length=2000)
    area: Literal["business", "brand", "audience", "knowledge"]
    assunto: str = Field(min_length=1, max_length=80)
    chave: str = Field(min_length=1, max_length=120)


class ProductionResult(StepOutput):
    entrega: CaptionDelivery
    mensagem: str = Field(min_length=1)
    observacoes: list[Observation] = Field(default_factory=list)


class CheckCriterion(StepOutput):
    ok: bool
    observacao: str


class CheckResult(StepOutput):
    aderencia_ao_briefing: CheckCriterion
    consistencia_de_marca: CheckCriterion
    qualidade_profissional: CheckCriterion
    aplicabilidade_no_canal: CheckCriterion
    ajustes: list[str]

    @property
    def approved(self) -> bool:
        # A aprovação sai dos quatro critérios, não de uma frase do modelo.
        return all(
            c.ok
            for c in (
                self.aderencia_ao_briefing,
                self.consistencia_de_marca,
                self.qualidade_profissional,
                self.aplicabilidade_no_canal,
            )
        )


class ReplyResult(StepOutput):
    """Resposta de um especialista na conversa (run de resposta, sem trabalho)."""

    mensagem: str = Field(min_length=1, max_length=4000)


def nullable(schema: dict[str, Any]) -> dict[str, Any]:
    return {"anyOf": [schema, {"type": "null"}]}


def obj(properties: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


STRING = {"type": "string"}
STRINGS = {"type": "array", "items": STRING}
CRITERION = obj({"ok": {"type": "boolean"}, "observacao": STRING})

TRIAGE_SCHEMA = obj(
    {
        "delivery_type": nullable(STRING),
        "briefing": obj(
            {
                "canal": nullable(STRING),
                "objetivo": nullable(STRING),
                "tema": nullable(STRING),
                "tom": nullable(STRING),
                "restricoes": STRINGS,
                "cta": nullable(STRING),
                "data": nullable(STRING),
            }
        ),
        "faltam": STRINGS,
        "pergunta": nullable(STRING),
        "resumo": STRING,
    }
)

OBSERVATIONS_SCHEMA = {
    "type": "array",
    "items": obj(
        {
            "leitura": STRING,
            "explicacao": STRING,
            "area": {
                "type": "string",
                "enum": ["business", "brand", "audience", "knowledge"],
            },
            "assunto": STRING,
            "chave": STRING,
        }
    ),
}

# Produção da 04.01; as outras deliveries montam o seu em squad/deliveries.py.
PRODUCTION_SCHEMA = obj(
    {
        "entrega": obj(
            {
                "canal": STRING,
                "objetivo": STRING,
                "versoes": {
                    "type": "array",
                    "items": obj({"texto": STRING, "hashtags": STRINGS, "cta": STRING}),
                },
                "notas": STRING,
            }
        ),
        "mensagem": STRING,
        "observacoes": OBSERVATIONS_SCHEMA,
    }
)

REPLY_SCHEMA = obj({"mensagem": STRING})

CHECK_SCHEMA = obj(
    {
        "aderencia_ao_briefing": CRITERION,
        "consistencia_de_marca": CRITERION,
        "qualidade_profissional": CRITERION,
        "aplicabilidade_no_canal": CRITERION,
        "ajustes": STRINGS,
    }
)
