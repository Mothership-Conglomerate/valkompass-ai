from model import Document
from .pdf_parser import parse_pdf
import os
from util.errors import NoSuchDocumentError


def parse_document(path: str) -> Document:
    _, file_extension = os.path.splitext(path)

    if file_extension.lower() == ".pdf":
        return parse_pdf(path)
    # Add more cases here for other document types like .docx, .txt etc.
    # For .txt or unknown, use the existing plain text parser
    else:
        try:
            with open(path, "r", encoding="utf-8") as file:  # Specify encoding
                content = file.read()
            return Document(path=path, raw_content=content, lines=[])
        except FileNotFoundError:  # Explicitly catch FileNotFoundError
            # Re-raise the FileNotFoundError to indicate the file was not found
            raise NoSuchDocumentError(f"Document {path} not found")
        except Exception as e:
            print(f"Error parsing document {path}: {e}")
            # For other errors, return a document with empty content
            return Document(path=path, raw_content="", lines=[])
