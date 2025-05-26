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


def test_extract_topics_empty_input(segments_empty):
    """Test extract_topics with empty list of segments."""
    # The current implementation of extract_topics raises ValueError for empty texts
    with pytest.raises(ValueError, match="No text segments to analyze"):
        extract_topics(segments_empty)


# --- Tests for topics_to_pydantic ---


@pytest.fixture
def mock_bertopic_model() -> MagicMock:
    """Creates a mock BERTopic model for testing topics_to_pydantic."""
    mock_model = MagicMock(spec=BERTopic)

    # Mock get_topic_info()
    topic_info_data = {
        "Topic": [-1, 0, 1],
        "Name": ["-1_outlier_group", "0_cat_dog_pet", "1_python_java_program"],
        "Count": [1, 3, 3],
        # Add other columns if your topics_to_pydantic uses them, e.g., 'Representation'
    }
    mock_model.get_topic_info.return_value = pd.DataFrame(topic_info_data)

    # Mock get_topic(tid)
    def get_topic_side_effect(topic_id):
        if topic_id == 0:
            return [
                ("cat", 0.3),
                ("dog", 0.2),
                ("pet", 0.15),
                ("animal", 0.1),
                ("house", 0.05),
            ]
        elif topic_id == 1:
            return [
                ("python", 0.4),
                ("java", 0.3),
                ("program", 0.2),
                ("code", 0.1),
                ("language", 0.05),
            ]
        return []  # For outlier or other topics

    mock_model.get_topic.side_effect = get_topic_side_effect

    return mock_model


@pytest.fixture
def mock_bertopic_model_no_real_topics() -> MagicMock:
    """Mock BERTopic model that only has an outlier topic."""
    mock_model = MagicMock(spec=BERTopic)
    topic_info_data = {"Topic": [-1], "Name": ["-1_outlier_group"], "Count": [7]}
    mock_model.get_topic_info.return_value = pd.DataFrame(topic_info_data)
    mock_model.get_topic.return_value = []  # No keywords for any topic
    return mock_model


@pytest.fixture
def mock_bertopic_model_unfitted() -> MagicMock:
    """Mock BERTopic model that simulates an unfitted or dummy state."""
    mock_model = MagicMock(spec=BERTopic)
    # Remove attributes that topics_to_pydantic checks for
    if hasattr(mock_model, "get_topic_info"):
        del mock_model.get_topic_info
    if hasattr(mock_model, "get_topic"):
        del mock_model.get_topic
    # Or make them raise AttributeError
    # mock_model.get_topic_info = MagicMock(side_effect=AttributeError("Model not fitted"))
    return mock_model


def test_topics_to_pydantic_conversion(mock_bertopic_model):
    """Test successful conversion of topics to Pydantic Topic models."""
    pydantic_topics = topics_to_pydantic(mock_bertopic_model)

    assert isinstance(pydantic_topics, list), "Should return a list."
    # Expected 2 topics (0 and 1), outlier -1 should be skipped
    assert len(pydantic_topics) == 2, (
        "Should contain 2 Topic objects (excluding outlier)."
    )

    for topic_obj in pydantic_topics:
        assert isinstance(topic_obj, Topic), "Each item should be a Topic instance."
        assert isinstance(topic_obj.name, str) and len(topic_obj.name) > 0
        assert isinstance(topic_obj.description, str) and len(topic_obj.description) > 0

    # Check content of the first converted topic (original topic 0)
    topic0 = next(
        t for t in pydantic_topics if "cat / dog" in t.name or "cat/dog" in t.name
    )
    assert topic0.name == "cat / dog"
    assert "Keywords: cat, dog, pet, animal, house" in topic0.description

    # Check content of the second converted topic (original topic 1)
    topic1 = next(
        t
        for t in pydantic_topics
        if "python / java" in t.name or "python/java" in t.name
    )
    assert topic1.name == "python / java"
    assert "Keywords: python, java, program, code, language" in topic1.description


def test_topics_to_pydantic_no_real_topics(mock_bertopic_model_no_real_topics):
    """Test conversion when only outlier topic exists."""
    pydantic_topics = topics_to_pydantic(mock_bertopic_model_no_real_topics)
    assert isinstance(pydantic_topics, list)
    assert len(pydantic_topics) == 0, (
        "Should return an empty list if only outliers exist."
    )


def test_topics_to_pydantic_unfitted_model(mock_bertopic_model_unfitted):
    """Test with a model that might appear unfitted or is a dummy."""
    # This mock is tricky because hasattr might still be true for MagicMock methods
    # unless they are explicitly deleted or configured to raise AttributeError.
    # Let's ensure the mock doesn't have get_topic_info if possible, or it returns something unexpected.

    # Create a fresh mock that definitely doesn't have these attributes
    class UnfittedModel:
        pass

    unfitted_model_instance = UnfittedModel()

    pydantic_topics = topics_to_pydantic(unfitted_model_instance)
    assert isinstance(pydantic_topics, list)
    assert len(pydantic_topics) == 0, (
        "Should return an empty list for an unfitted-like model."
    )

    # Test the path where get_topic_info exists but returns empty DataFrame
    mock_empty_df = MagicMock(spec=BERTopic)
    mock_empty_df.get_topic_info.return_value = pd.DataFrame()
    mock_empty_df.get_topic = MagicMock(
        return_value=[]
    )  # Ensure get_topic doesn't fail
    pydantic_topics_empty_df = topics_to_pydantic(mock_empty_df)
    assert len(pydantic_topics_empty_df) == 0
