import nltk
from nltk.corpus import stopwords

from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer

from model import DocumentSegment, Topic  # Corrected import paths

# Ensure NLTK data is available
try:
    nltk.data.find("corpora/stopwords")
except nltk.downloader.DownloadError:
    nltk.download("stopwords", quiet=True)

# Prepare combined stopword list for English & Swedish
SW_STOPWORDS = list(stopwords.words("swedish"))
EN_STOPWORDS = list(stopwords.words("english"))
COMBINED_STOPWORDS = list(
    set(SW_STOPWORDS) | set(EN_STOPWORDS)
)  # Use set union for unique words


def extract_topics(
    segments: list[DocumentSegment],
    nr_topics: int | None = None,  # Use int | None for type hint
    min_topic_size: int = 10,  # Default from BERTopic
    top_n_words: int = 10,  # Default from BERTopic
) -> tuple[
    BERTopic, list[int], list[list[float]] | None
]:  # Probs can be None if not calculated
    """
    Extracts topics from a list of document segments using BERTopic.

    - Uses a multilingual SentenceTransformer encoder.
    - Configures BERTopic with combined English and Swedish stopwords.
    - Returns the fitted BERTopic model, a list of topic IDs per segment,
      and a list of probability vectors for each segment's topic assignment.
    """
    texts = [seg.text for seg in segments if seg.text and seg.text.strip()]
    if not texts:
        raise ValueError("No text segments to analyze")

    # Multilingual embeddings (Swedish + English)
    # Using the specific model from the example
    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

    # Bag-of-words layer with both Swedish & English stopwords
    vectorizer = CountVectorizer(
        stop_words=COMBINED_STOPWORDS,
        ngram_range=(1, 2),
        max_df=0.9,
        min_df=5,  # As in the example, consider making this configurable
    )

    topic_model = BERTopic(
        nr_topics=nr_topics,
        embedding_model=embedding_model,
        vectorizer_model=vectorizer,
        calculate_probabilities=True,  # Ensure probabilities are calculated
        min_topic_size=min_topic_size,
        top_n_words=top_n_words,
    )

    topic_ids, probs = topic_model.fit_transform(texts)
    return topic_model, topic_ids, probs


def topics_to_pydantic(topic_model: BERTopic) -> list[Topic]:
    """
    Converts topics from a fitted BERTopic model to a list of Pydantic Topic models.

    - Builds a human-readable name and description for each topic
      based on its top keywords.
    - Skips the outlier topic (ID -1).
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
        # topic_info_df might be empty if no topics were found other than -1
        topic_info_df = topic_model.get_topic_info()
        if topic_info_df.empty:
            return pydantic_topics

        for index, row in topic_info_df.iterrows():
            tid = row["Topic"]
            if tid == -1:  # Skip outlier topic
                continue

            # Get top words for this topic
            # The get_topic method returns a list of (word, score) tuples or False if topic_id does not exist
            kw_scores = topic_model.get_topic(tid)
            if (
                not kw_scores
            ):  # Should not happen if tid is from get_topic_info and not -1
                continue

            keywords = [word for word, score in kw_scores[:5]]  # Get top 5 keywords

            # Create a name and description
            # Ensure at least one keyword for name, and handle cases with fewer than 2 keywords
            if len(keywords) >= 2:
                name = " / ".join(keywords[:2])
            elif len(keywords) == 1:
                name = keywords[0]
            else:  # No keywords found for this topic (should be rare for non -1 topics)
                name = f"Topic {tid}"  # Fallback name

            description = "Keywords: " + ", ".join(keywords)
            if not keywords:
                description = "No keywords found for this topic."

            pydantic_topics.append(Topic(name=name, description=description))

    except Exception as e:
        print(f"Error converting topics to Pydantic: {e}")
        # Depending on desired robustness, could return partial list or re-raise

    return pydantic_topics
