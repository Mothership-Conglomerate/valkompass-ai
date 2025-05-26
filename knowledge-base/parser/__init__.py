from model import Document
from .pdf_parser import parse_pdf
from analysis.segmentation import segment_document
from util.errors import NoSuchDocumentError
import os


def parse_document(path: str, document_id: str) -> Document:
    raw_content: str = ""
    segments: list = []  # Initialize segments list

    _, file_extension = os.path.splitext(path)

    if file_extension.lower() == ".pdf":
        try:
            # parse_pdf now returns (raw_text, pdf_segments)
            raw_content, segments = parse_pdf(path, document_id)
        except NoSuchDocumentError:  # Re-raise if pdf_parser raised it
            raise
        # If parse_pdf has other internal errors and returns (some_text, []), it's handled.

    else:  # For non-PDF files
        try:
            with open(path, "r", encoding="utf-8") as file:
                raw_content = file.read()
            # For non-PDFs, use the general segment_document function
            # TODO: Maybe skip this??
            segments = segment_document(raw_content)
        except FileNotFoundError:
            raise NoSuchDocumentError(f"Document {path} not found")
        except Exception as e:
            print(f"Error reading or segmenting document {path}: {e}")
            # Return Document with empty content and segments
            # raw_content will be its default "", segments its default []
            pass  # Allow returning an empty document below

    return Document(
        id=document_id, path=path, raw_content=raw_content, segments=segments
    )
