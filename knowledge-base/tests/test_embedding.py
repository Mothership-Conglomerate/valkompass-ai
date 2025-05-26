import pytest

from analysis.embedding import EmbeddingClient
from model import Document, DocumentSegment


@pytest.fixture
def embedding_client():
    return EmbeddingClient()


@pytest.mark.asyncio
async def test_get_embedding_success(embedding_client: EmbeddingClient):
    """Test successful embedding generation via API call."""
    text = "Test text for actual embedding"
    text2 = "This is a much longer piece of text that is intended to be completely different from the first text. It should have a distinct meaning and structure to ensure that the generated embeddings are significantly different."
    documents = [
        Document(
            raw_content="",
            path="test.txt",
            segments=[
                DocumentSegment(
                    text=text,
                    start_index=0,
                    end_index=len(text),
                    page=1,
                ),
                DocumentSegment(
                    text=text2,
                    start_index=0,
                    end_index=len(text2),
                    page=1,
                ),
            ],
        )
    ]
    updated_documents = await embedding_client.embed_documents(documents)

    assert updated_documents is not None
    assert isinstance(updated_documents, list)
    # assert len(updated_documents) == 1
    assert updated_documents[0].segments[0].embedding is not None
    assert updated_documents[0].segments[1].embedding is not None
    import numpy as np

    assert not np.array_equal(
        updated_documents[0].segments[0].embedding,
        updated_documents[0].segments[1].embedding,
    )
    assert len(updated_documents[0].segments[0].embedding) == 1536
