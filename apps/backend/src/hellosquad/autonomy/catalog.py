"""Catálogo de responsabilidades do Modo Autônomo (V4.6 `TPL`, `Q5`, `lv5`; FLUXOS §7; x1 §B).

As opções guardam chaves (o rótulo sai do catálogo de mensagens no idioma de quem lê). O combinado
é renderizado no idioma do negócio quando o dono confirma. `steps` é o trabalho que cada execução
abre no runtime (etapa por agente, como a S2d); modelo sem etapa ainda não tem leitor (a S3a liga
as conexões).
"""

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from hellosquad.i18n import t

CODE_PREFIX = {
    "plan": "PL",
    "res": "RS",
    "seo": "BL",
    "crm": "RC",
    # Sem código no protótipo (só PL, RS, BL e RC aparecem): provisórios, registrados como pergunta.
    "posts": "PC",
    "reat": "RT",
    "reviews": "AV",
    "opp": "OP",
}


@dataclass(frozen=True)
class Question:
    key: str
    values: tuple[str, ...]
    default: str
    asked: bool = True


@dataclass(frozen=True)
class Step:
    agent_id: str
    delivery_type: str
    depends_on: tuple[int, ...] = ()


@dataclass(frozen=True)
class Action:
    action: str
    level: str
    requirement: str | None = None


@dataclass(frozen=True)
class Template:
    id: str
    lead: str
    collaborators: tuple[str, ...]
    questions: tuple[Question, ...]
    run_time: time
    steps: tuple[Step, ...]
    actions: tuple[Action, ...]
    approval_required: bool
    period: str  # next_week (o plano cobre a semana seguinte), week ou month
    required_connections: tuple[str, ...] = ()
    publish_option: bool = False
    offered: bool = False
    time_in_frequency: bool = False
    extra: dict[str, Any] = field(default_factory=dict)

    def question(self, key: str) -> Question | None:
        return next((q for q in self.questions if q.key == key), None)


OBJ_CONTENT = Question("obj", ("site_orders", "show_process", "keep_instagram"), "site_orders")
DAY_PLAN = Question("day", ("mon", "thu", "fri"), "thu")
DAY_POSTS = Question("day", ("mon", "thu", "fri"), "mon")

TEMPLATES: dict[str, Template] = {
    tpl.id: tpl
    for tpl in (
        Template(
            "plan",
            "otto",
            ("kaia",),
            (
                OBJ_CONTENT,
                DAY_PLAN,
                Question(
                    "vol", ("posts3", "posts3_stories2", "posts5_stories3"), "posts3_stories2"
                ),
            ),
            time(9, 0),
            (Step("otto", "04.02"), Step("kaia", "03.01", (1,))),
            (
                Action("read_post_performance", "analyze"),
                Action("follow_calendar", "analyze"),
                Action("create_topics", "prepare"),
                Action("write_captions", "prepare"),
                Action("prepare_pieces_with_kaia", "prepare"),
                Action("publish_instagram", "execute", "approval_each"),
                Action("change_paid_campaigns", "execute", "specific_authorization"),
                Action("invest_in_ads", "never"),
                Action("reply_customer_messages", "never"),
                Action("change_prices_or_offers", "never"),
            ),
            approval_required=True,
            period="next_week",
            publish_option=True,
            offered=True,
        ),
        Template(
            "posts",
            "kaia",
            ("otto",),
            (OBJ_CONTENT, DAY_POSTS, Question("vol", ("posts3", "posts4", "posts5"), "posts3")),
            time(8, 0),
            (Step("kaia", "03.01"),),
            (
                Action("create_pieces_with_brand", "prepare"),
                Action("write_captions", "prepare"),
                Action("weekly_pieces", "execute", "approval_each"),
                Action("publish_instagram", "execute", "approval_each"),
                Action("invest_in_ads", "never"),
                Action("use_unlicensed_photos", "never"),
                Action("change_prices_or_offers", "never"),
            ),
            approval_required=True,
            period="next_week",
            publish_option=True,
            offered=True,
        ),
        Template(
            "res",
            "iris",
            (),
            (
                Question("freq", ("weekly_mon", "weekly_mon_fri", "daily"), "weekly_mon"),
                # A fonte não é perguntada na conversa (Q5 só pergunta a frequência): fica o padrão.
                Question("src", ("ig_site_google", "ig_site"), "ig_site_google", asked=False),
            ),
            time(9, 0),
            (Step("iris", "07.05"),),
            (
                Action("read_instagram_site_google", "analyze"),
                Action("compare_previous_period", "analyze"),
                Action("point_out_changes", "analyze"),
                Action("build_weekly_reading", "prepare"),
                Action("change_ads_or_campaigns", "never"),
                Action("publish_or_send_anything", "never"),
            ),
            approval_required=False,
            period="week",
            time_in_frequency=True,
            extra={"monitor": True},
        ),
        Template(
            "opp",
            "bia",
            ("iris",),
            (
                Question("obj", ("dates", "neighborhood", "competitors"), "dates"),
                Question("where", ("neighborhood_dates", "dates_only"), "neighborhood_dates"),
                Question("how", ("home", "home_email"), "home"),
            ),
            time(9, 0),
            (),
            (
                Action("follow_dates_and_neighborhood", "prepare"),
                Action("read_public_competitor_profiles", "prepare"),
                Action("cross_with_results", "prepare"),
                Action("turn_opportunity_into_work", "execute", "approval_each"),
                Action("start_work_without_you", "never"),
                Action("invest_any_budget", "never"),
            ),
            approval_required=False,
            period="week",
            offered=True,
        ),
        Template(
            "reat",
            "max",
            ("otto",),
            (
                Question("freq", ("monthly", "biweekly"), "monthly"),
                Question("days", ("d60", "d90"), "d60"),
            ),
            time(9, 0),
            (Step("max", "06.01"), Step("max", "06.02", (1,))),
            (
                Action("separate_inactive_customers", "prepare"),
                Action("write_messages_in_tone", "prepare"),
                Action("list_for_each_send", "execute", "approval_each"),
                Action("each_send", "execute", "approval_each"),
                Action("send_without_consent", "never"),
                Action("offer_discounts", "never"),
            ),
            approval_required=True,
            period="month",
        ),
        Template(
            "reviews",
            "max",
            (),
            (
                Question("obj", ("fast", "tone", "complaints"), "tone"),
                Question("freq", ("daily", "twice_weekly"), "daily"),
            ),
            time(9, 0),
            (),
            (
                Action("read_new_reviews", "prepare"),
                Action("write_replies", "prepare"),
                Action("each_reply_before_publishing", "execute", "approval_each"),
                Action("reply_without_approval", "never"),
                Action("offer_discounts_or_gifts", "never"),
            ),
            approval_required=True,
            period="week",
            required_connections=("google_business_profile",),
            offered=True,
        ),
        Template(
            "seo",
            "kiwi",
            ("iris",),
            (Question("freq", ("weekly_mon", "biweekly"), "weekly_mon"),),
            time(9, 0),
            (),
            (
                Action("analyze_local_searches", "analyze"),
                Action("follow_google_profile", "analyze"),
                Action("identify_opportunities", "analyze"),
                Action("prepare_recommendations", "prepare"),
                Action("activate_ads", "execute", "specific_authorization"),
                Action("change_budget", "execute", "specific_authorization"),
                Action("execute_investments", "execute", "specific_authorization_with_cap"),
                Action("change_site_without_approval", "never"),
            ),
            approval_required=False,
            period="week",
            required_connections=("google_business_profile",),
            time_in_frequency=True,
        ),
        Template(
            "crm",
            "max",
            ("otto",),
            (Question("freq", ("monthly", "biweekly"), "monthly"),),
            time(9, 0),
            (Step("max", "06.01"), Step("max", "06.02", (1,))),
            (
                Action("read_customer_base", "analyze"),
                Action("see_inactive_60_days", "analyze"),
                Action("create_segments", "prepare"),
                Action("prepare_messages_with_otto", "prepare"),
                Action("send_messages", "execute", "consent_connection_authorization"),
                Action("send_without_consent", "never"),
                Action("offer_discounts_without_you", "never"),
            ),
            approval_required=True,
            period="month",
            required_connections=("email_marketing",),
        ),
    )
}

# Ritmo por opção (`freq`/`day`): cadência, dias ISO (1 = segunda) e dia do mês.
WEEKDAY_ISO = {"mon": 1, "thu": 4, "fri": 5}
FREQUENCIES: dict[str, tuple[str, tuple[int, ...], int | None]] = {
    "weekly_mon": ("weekly", (1,), None),
    "weekly_mon_fri": ("weekly", (1, 5), None),
    "daily": ("daily", (), None),
    "monthly": ("monthly", (), 1),
    "biweekly": ("biweekly", (), None),
    # "Duas vezes por semana": o protótipo só mostra a primeira (qua, 14/10); quarta e sábado é
    # escolha técnica, registrada como pergunta.
    "twice_weekly": ("weekly", (3, 6), None),
}

PREVIEW_STEPS = 3  # "Faz sozinho": os 3 primeiros de Preparar no cartão da conversa
PREVIEW_NEVER = 2


class OptionError(ValueError):
    def __init__(self, key: str, value: object) -> None:
        super().__init__(f"opção inválida: {key}={value!r}")
        self.key = key
        self.value = value


def resolve_options(tpl: Template, options: dict[str, Any]) -> dict[str, str]:
    """Valida as opções ditas na conversa contra o modelo; o que faltou fica com o padrão."""
    unknown = set(options) - {q.key for q in tpl.questions}
    if unknown:
        key = sorted(unknown)[0]
        raise OptionError(key, options[key])
    resolved: dict[str, str] = {}
    for question in tpl.questions:
        value = options.get(question.key, question.default)
        if value not in question.values:
            raise OptionError(question.key, value)
        resolved[question.key] = value
    return resolved


def rhythm(tpl: Template, options: dict[str, str]) -> dict[str, Any]:
    if tpl.id == "opp":
        return {"cadence": "continuous", "weekdays": [], "month_day": None}
    if "day" in options:
        return {"cadence": "weekly", "weekdays": [WEEKDAY_ISO[options["day"]]], "month_day": None}
    cadence, weekdays, month_day = FREQUENCIES[options["freq"]]
    return {"cadence": cadence, "weekdays": list(weekdays), "month_day": month_day}


def actions_for(tpl: Template, auto_publish: bool) -> list[dict[str, Any]]:
    """Nível por ação. "Publicar sozinho o que eu aprovar no plano" só muda a publicação no
    Instagram (autorização antecipada dos itens aprovados); não autoriza anúncios, mensagens nem
    investimento."""
    items: list[dict[str, Any]] = []
    for action in tpl.actions:
        item: dict[str, Any] = {"action": action.action, "level": action.level}
        if action.level == "execute":
            requirement = action.requirement or "approval_each"
            granted = False
            if action.action == "publish_instagram":
                requirement = "approval_each_publication"
                if auto_publish:
                    requirement, granted = "authorized_plan", True
            item.update(requirement=requirement, granted=granted)
        items.append(item)
    return items


def agent_name(locale: str, agent_id: str) -> str:
    return t(locale, f"agent.{agent_id}.name")


def option_label(locale: str, template: str, key: str, value: str) -> str:
    return t(locale, f"autonomy.option.{template}.{key}.{value}")


def time_label(locale: str, value: time) -> str:
    if value.minute == 0:
        return t(locale, "autonomy.time.hour", hour=value.hour)
    return t(locale, "autonomy.time.hour_minute", hour=value.hour, minute=f"{value.minute:02d}")


def frequency_label(locale: str, template: str, options: dict[str, str], run_time: time) -> str:
    if template == "opp":
        return t(locale, "autonomy.frequency.continuous")
    if "day" in options:
        return t(
            locale,
            "autonomy.frequency.weekday",
            day=option_label(locale, template, "day", options["day"]),
            time=time_label(locale, run_time),
        )
    label = option_label(locale, template, "freq", options["freq"])
    if TEMPLATES[template].time_in_frequency:
        return t(
            locale,
            "autonomy.frequency.with_time",
            frequency=label,
            time=time_label(locale, run_time),
        )
    return label


def option_params(locale: str, template: str, options: dict[str, str]) -> dict[str, str]:
    return {key: option_label(locale, template, key, value) for key, value in options.items()}


def agreement(
    locale: str, template: str, options: dict[str, str], auto_publish: bool, brand: str
) -> str:
    """'O combinado': a frase do modelo com as palavras trocáveis (V4.6 `seg`)."""
    tpl = TEMPLATES[template]
    sentence = t(
        locale,
        f"autonomy.template.{template}.agreement",
        time=time_label(locale, tpl.run_time),
        brand=brand,
        **option_params(locale, template, options),
    )
    if tpl.publish_option:
        suffix = "auto" if auto_publish else "approval"
        sentence = f"{sentence} {t(locale, f'autonomy.agreement.publish.{suffix}')}"
    return sentence


def deliverable(locale: str, template: str, options: dict[str, str], brand: str) -> str:
    return t(
        locale,
        f"autonomy.template.{template}.deliver",
        brand=brand,
        **option_params(locale, template, options),
    )


def approval_label(locale: str, template: str, auto_publish: bool) -> str:
    suffix = ".auto" if auto_publish and TEMPLATES[template].publish_option else ""
    return t(locale, f"autonomy.template.{template}.approval{suffix}")


def collaboration_label(locale: str, collaborators: list[str]) -> str:
    if not collaborators:
        return "—"
    return ", ".join(agent_name(locale, a) for a in collaborators)


def date_label(locale: str, value: datetime | None, tz: ZoneInfo) -> str | None:
    """ "qui, 22/10, 9h" no fuso do negócio (formato `date.day_hour` do catálogo)."""
    if value is None:
        return None
    local = value.astimezone(tz)
    params = {
        "weekday": t(locale, f"date.weekday.{local.weekday()}"),
        "day": f"{local.day:02d}",
        "month": f"{local.month:02d}",
        "hour": local.hour,
    }
    if local.minute:
        return t(locale, "date.day_hour_minute", minute=f"{local.minute:02d}", **params)
    return t(locale, "date.day_hour", **params)


def when_label(locale: str, value: datetime, tz: ZoneInfo) -> str:
    """ "na sexta, 17:42": dia da semana com artigo e a hora, para "Aprovado por você …"."""
    local = value.astimezone(tz)
    return t(
        locale,
        "autonomy.when",
        on_day=t(locale, f"autonomy.weekday.on.{local.isoweekday()}"),
        hour=f"{local.hour:02d}",
        minute=f"{local.minute:02d}",
    )


def period_of(template: str, scheduled_for: datetime, tz: ZoneInfo) -> int:
    """Número do código: semana ISO (o plano e os posts cobrem a semana seguinte) ou o mês."""
    local = scheduled_for.astimezone(tz)
    period = TEMPLATES[template].period
    if period == "month":
        return local.month
    if period == "next_week":
        local = local + timedelta(days=7)
    return local.isocalendar().week


def run_title_params(
    template: str, scheduled_for: datetime, tz: ZoneInfo, period_no: int
) -> dict[str, Any]:
    local = scheduled_for.astimezone(tz)
    if template == "res":
        # "Leitura da semana 05 a 11/10": a semana anterior à execução, segunda a domingo.
        monday = (local - timedelta(days=local.isoweekday() - 1 + 7)).date()
        sunday = monday + timedelta(days=6)
        return {"start": f"{monday.day:02d}", "end": f"{sunday.day:02d}/{sunday.month:02d}"}
    if TEMPLATES[template].period == "month":
        return {"month": period_no}
    return {"week": period_no}
