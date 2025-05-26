from model import Document
import pdfplumber


def parse_pdf(path: str) -> Document:
    raw_content = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:  # Ensure text is not None
                    raw_content += text
    except Exception as e:
        print(f"Error parsing PDF {path} with pdfplumber: {e}")
        # Return a document with empty content or handle error as preferred
        return Document(path=path, raw_content="", lines=[])
    return Document(path=path, raw_content=raw_content, lines=[])
