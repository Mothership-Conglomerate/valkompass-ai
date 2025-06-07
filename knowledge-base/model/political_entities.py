
import numpy as np
from pydantic import BaseModel


class Party(BaseModel):
    abbreviation: str  # Primary key (C, M, S, SD, etc.)
    full_name: str  # Full party name from parties.json
    embedding: np.ndarray | None = None  # Future: aggregated position embedding

    class Config:
        arbitrary_types_allowed = True
