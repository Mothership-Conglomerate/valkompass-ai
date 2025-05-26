import re
from model import DocumentSegment
import nltk

# Ensure NLTK data is available
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:  # Catch LookupError if resource not found
    nltk.download("punkt", quiet=True)


def segment_document(raw_content: str) -> list[DocumentSegment]:
    """Segments a document by splitting it into paragraphs based on blank lines."""
    if not raw_content or not raw_content.strip():
        return []

    segments: list[DocumentSegment] = []

    # Split by one or more blank lines (two or more newlines)
    # and iterate through the paragraphs, keeping track of original start and end indices.
    for match in re.finditer(r".+?(?=(?:\n\n+|$))", raw_content, flags=re.DOTALL):
        para_text = match.group(0).strip()
        if not para_text:
            continue

        # Find the actual start of this stripped paragraph in the original content from the match start
        # to account for any leading/trailing whitespace within the matched block before strip().
        try:
            # Adjust start_index to be the start of the actual text content within the matched block.
            # match.start() is the beginning of the block, match.group(0).find(para_text) is the offset of stripped text within that block.
            para_start_index = match.start() + match.group(0).find(para_text)
            para_end_index = para_start_index + len(para_text)

            segments.append(
                DocumentSegment(
                    text=para_text,
                    start_index=para_start_index,
                    end_index=para_end_index,
                    page=0,  # Assign default page 0 for non-paginated content
                )
            )
        except ValueError:
            # This might happen if strip() somehow makes para_text not findable in match.group(0)
            # which is unlikely if para_text came from it. Log or handle if it occurs.
            # For now, we can skip this segment or use match.start() and match.end() as approximations.
            # Let's assume strip() doesn't cause this issue for simplicity.
            pass  # Or log an error/warning

    return segments
