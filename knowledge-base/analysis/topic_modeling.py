import nltk
from nltk.corpus import stopwords
from bertopic import BERTopic
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import PCA
import numpy as np

from model import DocumentSegment, Topic

# Ensure NLTK data is available
try:
    nltk.data.find("corpora/stopwords")
except LookupError:  # Catch LookupError if resource not found
    nltk.download("stopwords", quiet=True)

# Prepare combined stopword list for English & Swedish
SW_STOPWORDS = list(stopwords.words("swedish"))
EN_STOPWORDS = list(stopwords.words("english"))
COMBINED_STOPWORDS = list(
    set(SW_STOPWORDS) | set(EN_STOPWORDS)
)  # Use set union for unique words


def extract_topics(
    segments: list[DocumentSegment],
    nr_topics: int | None = None,
    min_topic_size: int = 10,
    top_n_words: int = 10,
) -> BERTopic:
    """
    Extracts topics from a list of DocumentSegment objects, updates the segments with topic IDs,
    and returns the fitted BERTopic model.
    Only segments with non-empty text and existing embeddings are used for topic modeling.
    """
    # Filter segments that have text and embeddings
    valid_segments = [
        seg
        for seg in segments
        if seg.text and seg.text.strip() and seg.embedding is not None
    ]

    if not valid_segments:
        raise ValueError(
            "No valid segments (with text and embeddings) to analyze. Topic modeling requires textual input and embeddings."
        )

    texts = [seg.text for seg in valid_segments]
    # Ensure embeddings is a 2D array
    embeddings = np.array(
        [seg.embedding for seg in valid_segments if seg.embedding is not None]
    )
    if embeddings.ndim == 1:  # Should not happen if embeddings are correctly generated
        print(
            f"Warning: Embeddings array is 1D, attempting to reshape. Shape: {embeddings.shape}"
        )
        if embeddings.shape[0] > 0 and embeddings.shape[0] % len(valid_segments) == 0:
            # This is a heuristic, assuming all embeddings have the same known dimension if it was flattened
            try:
                # Attempt to infer embedding dimension, e.g. 1536 for text-embedding-3-small
                # This part is risky without knowing the exact embedding dimension used.
                # For now, we'll rely on UMAP/PCA to handle it or error out if incompatible.
                # A better fix would be to ensure embeddings are always stored/retrieved as 2D.
                pass  # PCA might handle it or fail gracefully.
            except Exception as e:
                print(
                    f"Could not reshape embeddings, proceeding with 1D array which might fail: {e}"
                )

    print("Fitting PCA...")
    # Use PCA instead of UMAP for speed, ensure n_components is valid
    n_components_pca = min(
        10,
        len(valid_segments) // 2,
        embeddings.shape[1] if embeddings.ndim > 1 and embeddings.shape[1] > 0 else 10,
    )
    if n_components_pca <= 0:  # If not enough samples or features for PCA
        print(
            f"Not enough samples or features for PCA (n_components_pca={n_components_pca}). Skipping PCA."
        )
        reduced_embeddings = embeddings  # Use original embeddings
    else:
        pca = PCA(n_components=n_components_pca)
        try:
            reduced_embeddings = pca.fit_transform(embeddings)
        except ValueError as e:
            print(f"PCA failed: {e}. Using original embeddings.")
            reduced_embeddings = embeddings

    print("Fitting BERTopic...")
    # Fastest vectorizer settings
    vectorizer = CountVectorizer(
        stop_words=COMBINED_STOPWORDS,
        ngram_range=(1, 2),
        max_features=5000,  # Limit features for speed and memory
    )
    topic_model = BERTopic(
        nr_topics=nr_topics,
        vectorizer_model=vectorizer,
        min_topic_size=min_topic_size,
        top_n_words=top_n_words,
        umap_model=None,  # Disables UMAP, using PCA-reduced embeddings
        low_memory=True,
    )

    # Fit using reduced embeddings
    topic_assignments, _ = topic_model.fit_transform(texts, reduced_embeddings)
    print("Fitted BERTopic.")

    # Assign topic IDs back to the original DocumentSegment objects
    for segment, topic_id in zip(valid_segments, topic_assignments):
        segment.topic_id = int(topic_id)  # Ensure topic_id is int

    return topic_model


def topics_to_pydantic(topic_model: BERTopic) -> list[Topic]:
    """
    Converts topics from a fitted BERTopic model to a list of Pydantic Topic models.
    Builds a human-readable name and description for each topic
    based on its top keywords.
    Skips the outlier topic (ID -1).
    """
    pydantic_topics: list[Topic] = []
    if not hasattr(topic_model, "get_topic_info") or not hasattr(
        topic_model, "get_topic"
    ):
        print(
            "Warning: Topic model does not seem to be fitted or is a dummy model. Returning empty topics."
        )
        return pydantic_topics

    try:
        topic_info_df = topic_model.get_topic_info()
        if topic_info_df.empty:
            return pydantic_topics

        for _, row in topic_info_df.iterrows():  # Use _ if index is not needed directly
            tid = row["Topic"]
            if tid == -1:  # Skip outlier topic
                continue

            kw_scores = topic_model.get_topic(tid)
            if not kw_scores:
                continue

            keywords = [word for word, _ in kw_scores[:5]]  # score not needed here

            if len(keywords) >= 2:
                name = " / ".join(keywords[:2])
            elif len(keywords) == 1:
                name = keywords[0]
            else:
                name = f"Topic {tid}"

            description = "Keywords: " + ", ".join(keywords)
            if not keywords:
                description = "No keywords found for this topic."

            pydantic_topics.append(
                Topic(id=int(tid), name=name, description=description)
            )

    except Exception as e:
        print(f"Error converting topics to Pydantic: {e}")

    return pydantic_topics
