import pytest
from parser.pdf_parser import (
    parse_pdf,
)  # Assuming test is run from root or PYTHONPATH is set
from model import DocumentSegment  # Assuming model is accessible
from util.errors import NoSuchDocumentError
import os

# Test PDF file path (relative to the knowledge-base directory or project root)
# Adjust the path if your test execution context is different.
# Assuming tests might be run from the project root directory.
# Correcting path for when tests run from `knowledge-base` directory:
TEST_PDF_PATH = "documents/socialdemokraterna/socialdemokraterna-valmanifest-2022.pdf"
NON_EXISTENT_PDF_PATH = "documents/non_existent_document.pdf"


@pytest.fixture
def sample_pdf_path():
    if not os.path.exists(TEST_PDF_PATH):
        pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}. Skipping test.")
    return TEST_PDF_PATH


def test_parse_pdf_basic_processing(sample_pdf_path):
    """Test basic PDF parsing, raw content, and segment generation."""
    raw_content, segments = parse_pdf(sample_pdf_path)

    assert raw_content is not None, "Raw content should not be None."
    assert isinstance(raw_content, str), "Raw content should be a string."
    assert len(raw_content) > 100, (
        f"Expected raw content to be substantial, got {len(raw_content)} chars."
    )

    assert segments is not None, "Segments list should not be None."
    assert isinstance(segments, list), "Segments should be a list."
    # We expect some segments to be generated for a multi-page PDF.
    # This number is a guess and might need adjustment based on the PDF.
    assert len(segments) > 5, f"Expected more than 5 segments, got {len(segments)}."

    for i, segment in enumerate(segments):
        assert isinstance(segment, DocumentSegment), (
            f"Item at index {i} is not a DocumentSegment."
        )
        assert segment.text is not None and isinstance(segment.text, str), (
            f"Segment {i} text is invalid: {segment.text}"
        )
        assert len(segment.text) > 0, f"Segment {i} text should not be empty."

        assert isinstance(segment.start_index, int) and segment.start_index >= 0, (
            f"Segment {i} start_index is invalid: {segment.start_index}"
        )
        assert (
            isinstance(segment.end_index, int)
            and segment.end_index > segment.start_index
        ), (
            f"Segment {i} end_index is invalid: {segment.end_index} (start: {segment.start_index})"
        )

        # Critical check: Does the segment text match the slice from raw_content?
        # This can be very sensitive to small differences in how raw_content is joined vs. segment text.
        # Allow for minor whitespace differences at ends if necessary, though ideally they match perfectly.
        # For now, strict check.
        extracted_text_slice = raw_content[segment.start_index : segment.end_index]

        # Normalize whitespace for comparison to handle potential minor diffs from parsing/joining
        # This is a common adjustment needed when comparing text extracted by different means.
        normalized_segment_text = " ".join(segment.text.split())
        normalized_slice_text = " ".join(extracted_text_slice.split())

        assert normalized_segment_text == normalized_slice_text, (
            f"Segment {i} text does not match raw_content slice.\n"
            f"Segment Text (norm): '{normalized_segment_text[:100]}...'\n"
            f"Slice Text (norm):   '{normalized_slice_text[:100]}...'\n"
            f"Original Segment: '{segment.text[:100]}...'\n"
            f"Original Slice:   '{extracted_text_slice[:100]}...'\n"
            f"Indices: [{segment.start_index}:{segment.end_index}]"
        )

        assert isinstance(segment.metadata, dict), (
            f"Segment {i} metadata should be a dict."
        )
        assert "avg_font_size" in segment.metadata, (
            f"Segment {i} metadata missing 'avg_font_size'."
        )
        # Font size can be 0 if no words with size were found in a segment, though unlikely for real text.
        assert isinstance(segment.metadata["avg_font_size"], float) or isinstance(
            segment.metadata["avg_font_size"], int
        ), (
            f"Segment {i} avg_font_size not a number: {segment.metadata['avg_font_size']}"
        )

        # Test the new page field
        assert hasattr(segment, "page"), f"Segment {i} missing 'page' attribute."
        assert isinstance(segment.page, int), (
            f"Segment {i} page attribute is not an int: {segment.page}"
        )
        assert segment.page >= 0, (
            f"Segment {i} page attribute is negative: {segment.page}"
        )


def test_parse_pdf_non_existent_file():
    """Test that parsing a non-existent PDF raises NoSuchDocumentError."""
    with pytest.raises(NoSuchDocumentError):
        parse_pdf(NON_EXISTENT_PDF_PATH)


# To run these tests from the project root:
# Ensure PYTHONPATH includes the knowledge-base directory or install the package.
# Example: PYTHONPATH=./knowledge-base pytest knowledge-base/tests/test_pdf_parser_integration.py
# Or, if using make test-kb, ensure it sets up paths correctly.
