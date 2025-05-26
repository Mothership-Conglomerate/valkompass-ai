import pytest
import pandas as pd
from unittest.mock import MagicMock
import numpy as np

from model import (
    DocumentSegment,
    Topic,
)
from analysis.topic_modeling import extract_topics, topics_to_pydantic, BERTopic
from analysis.embedding import EmbeddingClient


async def get_sample_documents() -> list[DocumentSegment]:
    """Provides a few sample DocumentSegment objects for testing."""
    embedding_client = EmbeddingClient()
    documents = [
        DocumentSegment(
            text="This is about cats and dogs.", start_index=0, end_index=28, page=0
        ),
        DocumentSegment(
            text="The best pets are cats, not dogs.",
            start_index=29,
            end_index=63,
            page=0,
        ),
        DocumentSegment(
            text="I love my pet cat.", start_index=64, end_index=81, page=0
        ),
        DocumentSegment(
            text="A discussion about programming languages, like Python and Java.",
            start_index=82,
            end_index=152,
            page=1,
        ),
        DocumentSegment(
            text="Python is great for data science. Java is good for enterprise apps.",
            start_index=153,
            end_index=224,
            page=1,
        ),
        DocumentSegment(
            text="What is your favorite programming language? Mine is Python.",
            start_index=225,
            end_index=290,
            page=1,
        ),
        DocumentSegment(
            text="This is a very short and possibly outlier text.",
            start_index=291,
            end_index=338,
            page=2,
        ),
    ]
    for doc in documents:
        doc.embedding = await embedding_client.get_embedding(doc.text)
    return documents


@pytest.fixture
def segments_empty() -> list[DocumentSegment]:
    return []


@pytest.fixture
def segments_one_topic() -> list[DocumentSegment]:
    return [
        DocumentSegment(
            text="Topic modeling is fun.", start_index=0, end_index=24, page=0
        ),
        DocumentSegment(
            text="Fun topic modeling helps analyze text.",
            start_index=25,
            end_index=63,
            page=0,
        ),
        DocumentSegment(
            text="Analyzing text with topic models is useful.",
            start_index=64,
            end_index=109,
            page=0,
        ),
    ]


# --- Tests for extract_topics ---


@pytest.mark.asyncio
async def test_extract_topics_basic():
    sample_segments = await get_sample_documents()
    """Test basic functionality of extract_topics."""
    if not sample_segments:  # Should not happen with this fixture
        pytest.skip("Sample segments are empty, skipping test.")

    # Using small min_topic_size to increase chance of topics with few docs
    topic_model, topic_ids, probs = extract_topics(sample_segments, min_topic_size=2)

    print(topic_model, type(topic_model))
    print(topic_ids, type(topic_ids))
    print(probs, type(probs))

    assert isinstance(topic_model, BERTopic), (
        "topic_model should be a BERTopic instance."
    )
    assert isinstance(topic_ids, list), "topic_ids should be a list."
    assert isinstance(probs, np.ndarray), "probs should be a numpy array."

    assert len(topic_ids) == len(sample_segments), (
        "Length of topic_ids should match number of input segments."
    )
    if (
        probs is not None
    ):  # BERTopic might not return probs if it can't calculate them for some reason
        assert len(probs) == len(sample_segments), (
            "Length of probs should match number of input segments (if probs are returned)."
        )

    # Check if the model is somewhat fitted (has some topics)
    # This is a loose check; specific topic content is hard to assert without fixed seeds/data
    topic_info = topic_model.get_topic_info()
    print(topic_info)
    assert topic_info
