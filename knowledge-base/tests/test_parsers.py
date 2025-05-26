from parser import parse_document
from model import Document, DocumentSegment
import pytest
from util.errors import NoSuchDocumentError


def test_parse_pdf():
    """Test parsing a PDF document via parse_document."""
    pdf_path = "documents/socialdemokraterna/socialdemokraterna-valmanifest-2022.pdf"
    document = parse_document(pdf_path)

    assert document is not None, "The document should not be None."
    assert isinstance(document, Document), (
        "The returned object should be a Document instance."
    )
    assert document.path == pdf_path, "The document path should match the input path."
    assert isinstance(document.raw_content, str), "Raw content should be a string."
    assert len(document.raw_content) > 1000, "Raw content should not be empty."
    assert isinstance(document.lines, list), (
        "Document lines (segments) should be a list."
    )
    assert len(document.lines) > 0, (
        "Document lines (segments) should not be empty for this PDF."
    )
    for segment in document.lines:
        assert isinstance(segment, DocumentSegment), (
            "Each item in document.lines should be a DocumentSegment."
        )


def test_parse_non_existent_file():
    """Test parsing a non-existent file should raise FileNotFoundError."""
    non_existent_path = "path/to/a/completely/non_existent_file.txt"
    with pytest.raises(NoSuchDocumentError):
        parse_document(non_existent_path)
