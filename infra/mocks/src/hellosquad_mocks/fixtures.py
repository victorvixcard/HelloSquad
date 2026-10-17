"""Dados fictícios dos provedores, só com o que está em docs/DADOS_FICTICIOS.md.

Três contas: Miolo (em uso, com histórico), Vitta (em uso) e Trilha (primeiro acesso: as contas
existem nos provedores, mas sem dado nenhum; estado vazio honesto). As séries diárias reproduzem a
função determinística do `metrics_daily` do supabase/seed.sql (mesma semente: md5 de slug, métrica
e dias atrás), então o GA4 e o Instagram do mock batem com o seed aplicado no mesmo dia.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Sao_Paulo")


@dataclass(frozen=True)
class User:
    key: str
    workspace: str
    name: str
    email: str
    meta_user_id: str
    google_sub: str


USERS: dict[str, User] = {
    "marina": User(
        "marina", "miolo", "Marina Costa", "marina@miolo.example", "10000000000000001",
        "100000000000000000001",
    ),
    "rafael": User(
        "rafael", "vitta", "Rafael Nunes", "rafael@vitta.example", "10000000000000002",
        "100000000000000000002",
    ),
    "juliana": User(
        "juliana", "trilha", "Juliana Prado", "juliana@trilha.example", "10000000000000003",
        "100000000000000000003",
    ),
}
DEFAULT_USER = "marina"


def find_user(value: str | None) -> User | None:
    """Aceita a chave (marina), o e-mail ou o slug do workspace (miolo)."""
    if not value:
        return None
    value = value.strip().lower()
    for user in USERS.values():
        if value in (user.key, user.email, user.workspace):
            return user
    return None


def user_of_workspace(slug: str) -> User | None:
    return next((u for u in USERS.values() if u.workspace == slug), None)


# --- Séries do seed (supabase/seed.sql, bloco $seed_s2b$) -------------------------------------

# (slug, channel, metric) -> (kind, base, recent, step_old, step_new)
SEED_SERIES = {
    ("miolo", "site", "sessions"): ("flow", 140, "0.87", 0, 0),
    ("miolo", "instagram", "followers"): ("stock", 3850, "1", 3, 4),
    ("miolo", "instagram", "reach"): ("flow", 900, "1.18", 0, 0),
    ("miolo", "store", "orders"): ("flow", 38, "0.96", 0, 0),
    ("vitta", "site", "sessions"): ("flow", 85, "1.06", 0, 0),
    ("vitta", "instagram", "followers"): ("stock", 5200, "1", 5, 2),
    ("vitta", "instagram", "reach"): ("flow", 1300, "0.9", 0, 0),
    ("vitta", "store", "orders"): ("flow", 9, "1.03", 0, 0),
}
# A Miolo tem um buraco de 3 dias nas sessões (dado ausente): 43 a 45 dias atrás.
SEED_GAPS = {("miolo", "sessions"): range(43, 46)}


def _pg_int4_from_md5(text: str) -> int:
    """('x' || substr(md5(text), 1, 8))::bit(32)::int do Postgres: int4 com sinal."""
    value = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
    return value - (1 << 32) if value >= (1 << 31) else value


def _pg_mod(a: int, b: int) -> int:
    """% do Postgres: o resto tem o sinal do dividendo."""
    return a - b * int(a / b)


def today() -> date:
    return datetime.now(TZ).date()


def seed_value(slug: str, metric: str, days_ago: int) -> int | None:
    """Valor do seed para `days_ago` dias atrás (None quando não há série ou cai no buraco)."""
    spec = next((v for (s, _c, m), v in SEED_SERIES.items() if s == slug and m == metric), None)
    if spec is None or days_ago < 0:
        return None
    if days_ago in SEED_GAPS.get((slug, metric), ()):
        return None
    kind, base, recent, step_old, step_new = spec
    noise = _pg_int4_from_md5(f"{slug}{metric}{days_ago}")
    if kind == "stock":
        return (
            base
            + step_old * min(90 - days_ago, 60)
            + step_new * max(30 - days_ago, 0)
            + _pg_mod(noise, 3)
        )
    factor = Decimal(recent) if days_ago <= 30 else Decimal(1)
    weekday = {0: Decimal("1.2"), 1: Decimal("1.05"), 4: Decimal("0.9")}.get(days_ago % 7, 1)
    jitter = 1 + Decimal("0.08") * (Decimal(_pg_mod(noise, 1000)) / Decimal("1000.0"))
    value = Decimal(base) * factor * Decimal(weekday) * jitter
    return int(value.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def noise01(*parts: object) -> float:
    """Ruído determinístico em [0, 1) para dados que o seed não tem (Search Console, avaliações)."""
    digest = hashlib.md5("|".join(str(p) for p in parts).encode()).hexdigest()
    return int(digest[:8], 16) / 0x100000000


def split(total: int, shares: list[tuple[str, float]]) -> list[tuple[str, int]]:
    """Reparte um inteiro por pesos (maiores restos), sem perder nem inventar unidade."""
    raw = [(name, total * weight) for name, weight in shares]
    floors = [(name, int(value)) for name, value in raw]
    rest = total - sum(v for _, v in floors)
    order = sorted(range(len(raw)), key=lambda i: raw[i][1] - floors[i][1], reverse=True)
    result = dict(floors)
    for i in order[:rest]:
        result[raw[i][0]] += 1
    return [(name, result[name]) for name, _ in shares]


# --- Meta: páginas e contas profissionais do Instagram --------------------------------------


@dataclass
class IgMediaSeed:
    days_ago: int
    caption: str
    media_type: str = "IMAGE"
    likes: int = 0
    comments: list[tuple[str, str]] = field(default_factory=list)
    reach: int = 0
    saved: int = 0
    shares: int = 0


@dataclass
class MetaAccount:
    workspace: str
    page_id: str
    page_name: str
    page_category: str
    ig_user_id: str
    ig_username: str
    ig_name: str
    biography: str
    website: str
    follows_count: int
    media: list[IgMediaSeed]


META_ACCOUNTS: dict[str, MetaAccount] = {
    "miolo": MetaAccount(
        "miolo", "100000000000101", "Miolo", "Padaria", "17841400000000101", "miolo.padaria",
        "Miolo · Padaria de fermentação natural",
        "Pão de fermentação longa em Pinheiros desde 2019. Encomendas pelo site.",
        "https://miolo.example/", 182,
        [
            IgMediaSeed(3, "Fornada de segunda: o pão de fermentação longa sai às 8h. "
                        "Encomende pelo site e retire quentinho.", likes=212, reach=1480,
                        saved=64, shares=19,
                        comments=[("ana.exemplo", "Passo aí amanhã cedo!"),
                                  ("bruno.exemplo", "Tem integral também?")]),
            IgMediaSeed(6, "Bastidores do forno: 36 horas entre o levain e a casca dourada.",
                        likes=341, reach=2210, saved=158, shares=33,
                        comments=[("camila.exemplo", "Que casca!")]),
            IgMediaSeed(10, "Focaccia de alecrim, todo sábado a partir das 9h.", likes=187,
                        reach=1320, saved=41, shares=12),
            IgMediaSeed(13, "Bastidores: a modelagem do pão de fermentação natural, uma a uma.",
                        media_type="CAROUSEL_ALBUM", likes=298, reach=1990, saved=131,
                        shares=27, comments=[("diego.exemplo", "Quero aprender a fazer isso")]),
            IgMediaSeed(17, "Pão de abóbora de outubro: fermentação longa e miolo macio.",
                        likes=176, reach=1210, saved=38, shares=9),
            IgMediaSeed(21, "Nosso levain completou mais um ano. Obrigado por cada fornada.",
                        likes=254, reach=1660, saved=57, shares=21,
                        comments=[("elisa.exemplo", "Parabéns, Miolo!")]),
        ],
    ),
    "vitta": MetaAccount(
        "vitta", "100000000000102", "Vitta Estética", "Clínica de estética",
        "17841400000000102", "vitta.estetica", "Vitta Estética",
        "Estética e bem-estar em Vitória/ES. Agende pelo site.", "https://vitta.example/", 240,
        [
            IgMediaSeed(2, "Limpeza de pele: o passo a passo do nosso protocolo.", likes=402,
                        reach=2630, saved=120, shares=44,
                        comments=[("fabio.exemplo", "Quanto tempo dura a sessão?")]),
            IgMediaSeed(9, "Bem-estar começa no cuidado diário. Dicas da nossa equipe.",
                        likes=288, reach=1900, saved=75, shares=18),
            IgMediaSeed(16, "Novidade: horários aos sábados a partir de novembro.", likes=199,
                        reach=1540, saved=22, shares=15),
        ],
    ),
    "trilha": MetaAccount(
        "trilha", "100000000000103", "Trilha Urbana", "Loja de bicicletas", "17841400000000103",
        "trilha.urbana", "Trilha Urbana", "Bikes urbanas e e-bikes em Curitiba.",
        "https://trilha.example/", 0, [],
    ),
}

# Posts já existentes na Página (o feed só mostra o que foi publicado no Facebook).
PAGE_POSTS = {
    "miolo": [(3, "Fornada de segunda: o pão de fermentação longa sai às 8h."),
              (10, "Focaccia de alecrim, todo sábado a partir das 9h.")],
    "vitta": [(9, "Bem-estar começa no cuidado diário. Dicas da nossa equipe.")],
    "trilha": [],
}

# --- Google: GA4, Search Console, Business Profile -------------------------------------------


@dataclass
class GoogleAccount:
    workspace: str
    ga_account: str
    ga_account_name: str
    ga_property: str
    ga_property_name: str
    site_url: str
    site_permission: str
    gbp_account: str
    gbp_account_name: str
    gbp_location: str
    gbp_title: str
    locality: str
    sublocality: str
    region: str
    phone: str
    category: tuple[str, str]
    queries: list[tuple[str, str, float, float, float]]  # consulta, página, cliques/dia, impressões/dia, posição


GOOGLE_ACCOUNTS: dict[str, GoogleAccount] = {
    "miolo": GoogleAccount(
        "miolo", "accounts/300000001", "Miolo", "properties/400000001", "Miolo · miolo.example",
        "sc-domain:miolo.example", "siteOwner", "accounts/1000000000000000001", "Miolo",
        "locations/2000000000000000001", "Miolo · Pinheiros", "São Paulo", "Pinheiros", "SP",
        "+55 11 99999-0090", ("categories/gcid:bakery", "Padaria"),
        [
            ("miolo padaria", "https://miolo.example/", 3.1, 9.0, 1.2),
            ("padaria pinheiros", "https://miolo.example/", 2.4, 61.0, 3.4),
            ("pão de fermentação natural", "https://miolo.example/blog/fermentacao-natural",
             1.3, 88.0, 6.9),
            ("padaria fermentação natural são paulo", "https://miolo.example/", 0.9, 43.0, 5.1),
            ("panetone fermentação natural", "https://miolo.example/encomendas", 0.6, 54.0, 9.2),
            ("focaccia pinheiros", "https://miolo.example/cardapio", 0.5, 14.0, 4.4),
            ("padaria vila madalena", "https://miolo.example/", 0.4, 30.0, 8.1),
            ("panetone artesanal", "https://miolo.example/encomendas", 0.2, 37.0, 17.6),
            ("encomenda de pão", "https://miolo.example/encomendas", 0.2, 11.0, 12.3),
        ],
    ),
    "vitta": GoogleAccount(
        "vitta", "accounts/300000002", "Vitta Estética", "properties/400000002",
        "Vitta Estética · vitta.example", "https://vitta.example/", "siteFullUser",
        "accounts/1000000000000000002", "Vitta Estética", "locations/2000000000000000002",
        "Vitta Estética · Vitória", "Vitória", "Praia do Canto", "ES", "+55 11 99999-0091",
        ("categories/gcid:beauty_salon", "Clínica de estética"),
        [
            ("vitta estética", "https://vitta.example/", 2.2, 7.0, 1.1),
            ("limpeza de pele vitória", "https://vitta.example/tratamentos", 1.1, 52.0, 4.8),
            ("clínica de estética vitória", "https://vitta.example/", 0.8, 70.0, 7.3),
            ("drenagem linfática vitória", "https://vitta.example/tratamentos", 0.4, 33.0, 9.9),
        ],
    ),
    "trilha": GoogleAccount(
        "trilha", "accounts/300000003", "Trilha Urbana", "properties/400000003",
        "Trilha Urbana · trilha.example", "sc-domain:trilha.example", "siteOwner",
        "accounts/1000000000000000003", "Trilha Urbana", "locations/2000000000000000003",
        "Trilha Urbana · Curitiba", "Curitiba", "Batel", "PR", "+55 11 99999-0092",
        ("categories/gcid:bicycle_store", "Loja de bicicletas"), [],
    ),
}

# Canais e páginas do GA4 (pesos fixos; somam 1).
GA4_CHANNELS = [("Organic Social", 0.42), ("Organic Search", 0.24), ("Direct", 0.21),
                ("Referral", 0.13)]
GA4_PAGES = {
    "miolo": [("/", 0.38), ("/encomendas", 0.27), ("/cardapio", 0.2),
              ("/blog/fermentacao-natural", 0.1), ("/sobre", 0.05)],
    "vitta": [("/", 0.45), ("/tratamentos", 0.35), ("/agendar", 0.2)],
    "trilha": [("/", 1.0)],
}
GA4_HAS_DATA = {"miolo": True, "vitta": True, "trilha": False}

# Avaliações do Google (nome do avaliador: só primeiro nome e inicial, dos contatos fictícios).
# (dias atrás, avaliador, estrelas, comentário, resposta ou None)
REVIEWS = {
    "miolo": [
        (1, "Larissa G.", 5, "Pão de fermentação longa impecável e atendimento acolhedor.", None),
        (2, "Marcos P.", 4, "A focaccia de sábado vale a fila. Só faltou lugar para sentar.", None),
        (4, "Natália B.", 3, "Pão ótimo, mas a encomenda atrasou 20 minutos.", None),
        (8, "Otávio M.", 5, "Melhor padaria de Pinheiros para mim.",
         "Obrigada, Otávio! Esperamos você na próxima fornada."),
        (12, "Paula C.", 5, "Casca crocante e miolo leve. Virei cliente.",
         "Que bom, Paula! Até sábado."),
        (19, "Renato A.", 4, "Gostei muito do pão de abóbora.", "Obrigada, Renato!"),
        (26, "Sofia T.", 5, "Ambiente acolhedor e equipe atenciosa.", "Obrigada pelo carinho, Sofia!"),
        (33, "Tiago M.", 5, "O levain deles é especial.", "Obrigada, Tiago!"),
        (41, "Vanessa F.", 4, "Encomenda pelo site funcionou bem.", "Obrigada, Vanessa!"),
        (55, "Wagner L.", 5, "Pão de verdade, sem pressa.", "Obrigada, Wagner!"),
        (70, "Ana S.", 5, "Meu café da manhã de domingo.", "Obrigada, Ana!"),
        (88, "Bruno L.", 2, "Acabou o pão integral antes das 10h.",
         "Bruno, obrigada pelo retorno: aumentamos a fornada do integral."),
    ],
    "vitta": [
        (3, "Camila R.", 5, "Atendimento cuidadoso do começo ao fim.", None),
        (11, "Diego A.", 4, "Gostei da limpeza de pele, voltarei.", "Obrigado, Diego!"),
        (24, "Elisa M.", 5, "Equipe atenciosa e ambiente tranquilo.", "Obrigado, Elisa!"),
        (40, "Fábio R.", 3, "Bom serviço, mas foi difícil remarcar.", None),
    ],
    "trilha": [],
}

# Posts já publicados no Perfil da Empresa: (dias atrás, resumo).
LOCAL_POSTS = {
    "miolo": [(5, "Fornada de segunda: pão de fermentação longa saindo às 8h."),
              (12, "Focaccia de alecrim todo sábado a partir das 9h.")],
    "vitta": [(15, "Agenda de novembro aberta: horários aos sábados.")],
    "trilha": [],
}


def at_days_ago(days_ago: int, hour: int = 9) -> datetime:
    moment = datetime.combine(today() - timedelta(days=days_ago), datetime.min.time(), TZ)
    return moment.replace(hour=hour)
