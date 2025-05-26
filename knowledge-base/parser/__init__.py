from model import Document
from .pdf_parser import parse_pdf
from util.errors import NoSuchDocumentError
import os


def parse_document(path: str, document_id: str) -> Document:
    raw_content: str = ""
    segments: list = []

    _, file_extension = os.path.splitext(path)

    if file_extension.lower() == ".pdf":
        try:
            raw_content, segments = parse_pdf(path, document_id)
        except NoSuchDocumentError:
            raise

    else:
        pass
    return Document(
        id=document_id, path=path, raw_content=raw_content, segments=segments
    )
