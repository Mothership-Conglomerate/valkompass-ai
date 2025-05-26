from openai import AsyncOpenAI
from typing import List
import numpy as np
from model import Document
import asyncio
from tqdm.asyncio import tqdm


class EmbeddingClient:
    MODEL_NAME = "text-embedding-3-small"

    def __init__(
        self, client: AsyncOpenAI | None = None, model_name: str | None = None
    ):
        self.client = client if client else AsyncOpenAI()
        self.model_name = model_name if model_name else EmbeddingClient.MODEL_NAME

    async def get_embedding(
        self, text: str, model: str | None = None
    ) -> list[float] | None:
        """Generates an embedding for the given text using the specified OpenAI model."""
        model_to_use = model if model else self.model_name
        text = text.replace("\n", " ")
        response = await self.client.embeddings.create(input=[text], model=model_to_use)
        return response.data[0].embedding

    async def embed_documents(
        self, documents: List[Document], model: str | None = None
    ) -> List[Document]:
        """
        Embeds the text of each segment in a list of Document objects.
        Updates the 'embedding' field of each DocumentSegment.
        """
        model_to_use = model if model else self.model_name
        if not self.client:
            print("OpenAI client not initialized. Cannot embed documents.")
            return documents

        segments_to_embed = []
        for doc in documents:
            for segment in doc.segments:
                if segment.text:  # Ensure there is text to embed
                    segments_to_embed.append(segment)

        batch_size = 10
        for i in tqdm(
            range(0, len(segments_to_embed), batch_size), desc="Embedding documents"
        ):
            batch_segments = segments_to_embed[i : i + batch_size]
            tasks = [
                self.get_embedding(segment.text, model=model_to_use)
                for segment in batch_segments
            ]
            embedding_vectors = await asyncio.gather(*tasks)
            for segment, embedding_vector in zip(batch_segments, embedding_vectors):
                if embedding_vector is not None:
                    segment.embedding = np.array(embedding_vector)
        return documents
