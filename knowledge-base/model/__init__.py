from pydantic import BaseModel, field_serializer, field_validator
import numpy as np
from typing import Any


class Party(BaseModel):
    id: str
    name: str


class Politician(BaseModel):
    id: str
    name: str
    party_id: str | None = None
    party_abbreviation: str | None = None


class Vote(BaseModel):
    id: int
    politician_id: str
    voting_id: str
    vote_option: str


class VotingSession(BaseModel):
    """
    Voting is a topic being voted on, such as a new policy or a new law.
    """

    id: str
    name: str
    description: str
    nb_against: int
    nb_for: int
    nb_absent: int
    nb_abstain: int
    year: int

    embedding: np.ndarray | None = None

    model_config = {"arbitrary_types_allowed": True}

    @field_serializer("embedding", when_used="json")
    def serialize_embedding_to_list(self, v: np.ndarray) -> list[float]:
        """Convert np.ndarray to list for JSON serialization."""
        if v is None:
            return None
        return v.tolist()

    @field_validator("embedding", mode="before")
    @classmethod
    def validate_embedding(cls, v: Any) -> np.ndarray | None:
        if isinstance(v, list):
            return np.array(v, dtype=float)
        return v


class Topic(BaseModel):
    id: int
    name: str
    description: str
    embedding: np.ndarray | None = None

    model_config = {"arbitrary_types_allowed": True}

    @field_serializer("embedding", when_used="json")
    def serialize_embedding_to_list(self, v: np.ndarray) -> list[float]:
        """Convert np.ndarray to list for JSON serialization."""
        if v is None:
            return None
        return v.tolist()

    @field_validator("embedding", mode="before")
    @classmethod
    def validate_embedding(cls, v: Any) -> np.ndarray | None:
        if isinstance(v, list):
            return np.array(v, dtype=float)
        return v


class DocumentSegment(BaseModel):
    id: str
    text: str
    start_index: int
    end_index: int
    page: int
    metadata: dict | None = None
    embedding: np.ndarray | None = None
    topic_id: int | None = None
    type: str | None = None
    public_url: str | None = None

    model_config = {"arbitrary_types_allowed": True}

    @field_serializer("embedding", when_used="json")
    def serialize_embedding_to_list(self, v: np.ndarray) -> list[float]:
        """Convert np.ndarray to list for JSON serialization."""
        if v is None:
            return None
        return v.tolist()

    @field_validator("embedding", mode="before")
    @classmethod
    def validate_embedding_from_list(cls, v: Any) -> np.ndarray | None:
        """Convert list to np.ndarray during deserialization from JSON."""
        if isinstance(v, list):
            return np.array(v, dtype=float)
        # If v is None, or already an np.ndarray (e.g. direct model instantiation),
        # Pydantic's default validation will handle it.
        return v


class Document(BaseModel):
    id: str
    path: str
    raw_content: str
    segments: list[DocumentSegment]
