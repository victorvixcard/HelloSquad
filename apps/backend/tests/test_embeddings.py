"""ADR-0009: embeddings atrás de adaptador e desligados; a recuperação fica na busca textual."""

import pytest
from pydantic import ValidationError

from hellosquad.config import Settings
from hellosquad.memory.embeddings import DisabledEmbeddings, EmbeddingsUnavailable, build_embeddings
from hellosquad.squad.flow import Squad


async def test_embeddings_are_disabled_until_the_owner_picks_a_provider() -> None:
    embeddings = build_embeddings("disabled")
    assert (embeddings.provider, embeddings.enabled) == ("disabled", False)
    with pytest.raises(EmbeddingsUnavailable):
        await embeddings.embed(["pão de abóbora"])
    with pytest.raises(ValueError, match="ADR-0009"):
        build_embeddings("openai")
    with pytest.raises(ValidationError):
        Settings(embeddings_provider="voyage")
    assert isinstance(
        Squad.__dataclass_fields__["embeddings"].default_factory(), DisabledEmbeddings
    )
