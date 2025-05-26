import json
from pathlib import Path
from typing import List
from tqdm import tqdm

from . import Document  # Assuming Document is in __init__.py in the same package


def store_documents_as_json(documents: List[Document], output_dir: Path):
    """
    Serializes a list of Document objects to pretty-printed JSON files.
    Each document's path attribute is assumed to be relative to the project root.

    Args:
        documents: A list of Document objects to serialize.
        output_dir: The directory where JSON files will be stored.
    """
    if not documents:
        print("No documents to store.")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Storing {len(documents)} documents as JSON in {output_dir}...")

    for doc in tqdm(documents, desc="Storing JSON documents", unit="doc"):
        original_path = Path(doc.path)
        # Use a consistent naming convention, e.g., based on the original stem
        # and potentially adding a suffix if it's an intermediate or final version.
        json_filename = original_path.stem + ".json"
        output_filepath = output_dir / json_filename

        try:
            # Pydantic's model_dump_json handles np.ndarray by converting to list
            json_string = doc.model_dump_json(indent=2)
            with open(output_filepath, "w", encoding="utf-8") as f:
                f.write(json_string)
        except Exception as e:
            print(
                f"Error storing document {doc.path} as JSON to {output_filepath}: {e}"
            )
    print(f"Successfully stored documents in {output_dir}.")


def load_documents_from_json(input_dir: Path) -> List[Document]:
    """
    Loads Document objects from JSON files in a specified directory.

    Args:
        input_dir: The directory to scan for JSON files.

    Returns:
        A list of loaded Document objects.
    """
    json_files = list(input_dir.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {input_dir}.")
        return []

    loaded_documents: List[Document] = []
    print(f"Loading {len(json_files)} documents from JSON in {input_dir}...")

    for json_file_path in tqdm(json_files, desc="Loading JSON documents", unit="doc"):
        try:
            with open(json_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Pydantic will attempt to convert list back to np.ndarray for 'embedding'
                # if DocumentSegment's embedding field is type-hinted as np.ndarray
                document_obj = Document(**data)
                loaded_documents.append(document_obj)
        except Exception as e:
            print(f"Error loading document from {json_file_path}: {e}")

    print(f"Successfully loaded {len(loaded_documents)} documents from {input_dir}.")
    return loaded_documents
