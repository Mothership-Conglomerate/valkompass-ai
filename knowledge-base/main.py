from dotenv import load_dotenv

from pathlib import Path
from typing import List
import argparse
import asyncio

from tqdm import tqdm
from tqdm.asyncio import tqdm as async_tqdm

from model import Document
from parser import parse_document
from util.errors import NoSuchDocumentError
from analysis.embedding import EmbeddingClient
from model.store import (
    store_documents_as_json,
    load_documents_from_json,
    store_document_as_json,
)

load_dotenv()

# Project root directory
PROJECT_ROOT_DIR = Path(__file__).parent.parent
DOCUMENTS_BASE_DIR_ABS = Path(__file__).parent / "documents"
STRUCTURED_DOCS_OUTPUT_DIR = (
    Path(__file__).parent / "structured-knowledge-base" / "documents"
)


def load_and_parse_documents(
    documents_dir_abs: Path = DOCUMENTS_BASE_DIR_ABS,
    project_root: Path = PROJECT_ROOT_DIR,
) -> List[Document]:
    """
    Scans a directory for documents, parses them, and returns a list of Document objects
    with paths relative to the project root.

    Supported file types are those handled by the `parse_document` function (e.g., .pdf, .txt).
    Uses tqdm to display a progress bar.

    Args:
        documents_dir_abs: The directory to scan for documents.
        project_root: The project root directory for making paths relative.

    Returns:
        A list of Document objects.
    """
    doc_paths_abs: List[Path] = []
    # Recursively find all files in the documents_dir
    # Add more extensions here if needed, e.g., "*.txt", "*.docx"
    supported_extensions = ["*.pdf", "*.txt"]
    for ext in supported_extensions:
        doc_paths_abs.extend(list(documents_dir_abs.rglob(ext)))

    if not doc_paths_abs:
        print(
            f"No documents found in {documents_dir_abs} with extensions: {supported_extensions}"
        )
        return []

    parsed_documents: List[Document] = []
    print(f"Found {len(doc_paths_abs)} documents. Starting parsing...")

    for doc_path_abs in tqdm(doc_paths_abs, desc="Parsing documents", unit="doc"):
        try:
            # Parse document using its absolute path for reading
            document_obj = parse_document(str(doc_path_abs))

            # Make the path relative to the project root for storage/representation
            try:
                relative_path = doc_path_abs.relative_to(project_root)
                document_obj.path = str(
                    relative_path
                )  # Update the path in the Document object
            except ValueError:
                # This happens if doc_path_abs is not under project_root, which shouldn't occur here
                # but as a fallback, keep the absolute path or handle as an error.
                print(
                    f"Warning: Could not make path {doc_path_abs} relative to {project_root}. Keeping absolute."
                )
                # document_obj.path remains as is (absolute)

            parsed_documents.append(document_obj)
        except NoSuchDocumentError as e:
            print(f"Skipping (not found): {doc_path_abs}. Error: {e}")
        except Exception as e:
            # Catch any other errors during parsing of a specific document
            print(f"Error parsing document {doc_path_abs}: {e}. Skipping.")

    print(
        f"Successfully parsed {len(parsed_documents)} out of {len(doc_paths_abs)} documents."
    )
    return parsed_documents


async def main():
    """Main entry point for the knowledge-base processing script."""
    parser = argparse.ArgumentParser(description="Knowledge-base processing CLI.")
    parser.add_argument(
        "--actions",
        nargs="+",
        choices=["parse", "embed"],
        default=["parse", "embed"],
        help="Specify a list of actions: parse, embed. Default is parse then embed.",
    )
    parser.add_argument(
        "--docs-dir",
        type=str,
        default=str(DOCUMENTS_BASE_DIR_ABS),
        help=f"Absolute path to the directory containing raw documents for parsing. Default: {DOCUMENTS_BASE_DIR_ABS}",
    )
    parser.add_argument(
        "--structured-output-dir",
        type=str,
        default=str(STRUCTURED_DOCS_OUTPUT_DIR),
        help=f"Directory to store/load structured JSON documents. Default: {STRUCTURED_DOCS_OUTPUT_DIR}",
    )
    # Add more arguments as needed, e.g., for embedding model selection

    args = parser.parse_args()

    documents: List[Document] = []
    processed_something = False

    # Convert string paths from args to Path objects
    docs_dir_abs = Path(args.docs_dir)
    structured_output_dir = Path(args.structured_output_dir)

    if "parse" in args.actions:
        print(f"Starting document parsing from: {docs_dir_abs}...")
        documents = load_and_parse_documents(
            documents_dir_abs=docs_dir_abs, project_root=PROJECT_ROOT_DIR
        )
        if documents:
            print(f"Successfully parsed {len(documents)} documents.")
            print(f"Storing parsed documents to {structured_output_dir}...")
            store_documents_as_json(documents, structured_output_dir)
            processed_something = True
        else:
            print("No documents were parsed.")
            if "embed" in args.actions:
                print("Halting embed action as no documents were parsed.")
                return

    if "embed" in args.actions:
        if not documents:
            print(f"Loading documents from {structured_output_dir} for embedding...")
            documents = load_documents_from_json(structured_output_dir)
            if not documents:
                print(
                    f"No documents found in {structured_output_dir}. Cannot proceed with embedding."
                )
                return

        if documents:
            print(f"Starting embedding for {len(documents)} documents...")
            embedding_client = EmbeddingClient()
            processed_docs_count = 0
            # Wrap the documents list with tqdm for a top-level progress bar
            async for doc in async_tqdm(
                embedding_client.embed_documents(documents),
                total=len(documents),
                desc="Embedding and Storing Documents",
            ):
                store_document_as_json(doc, structured_output_dir)
                processed_docs_count += 1

            print(
                f"Successfully embedded and stored {processed_docs_count} documents incrementally."
            )
            # No need to store all documents again at the end, as it's done incrementally
            processed_something = True

    if not processed_something:
        print(
            "No actions were performed. Please specify --actions parse or --actions embed."
        )
    else:
        print("Knowledge base processing complete.")


if __name__ == "__main__":
    asyncio.run(main())  # Modified to run async main
