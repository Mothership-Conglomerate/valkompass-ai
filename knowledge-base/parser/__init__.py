from model import Document
from .pdf_parser import parse_pdf
from .json_website_parser import parse_json
from .voting_parser import (
    parse_parties,
    parse_politicians,
    parse_voting_sessions,
    parse_politician_votes,
)
from model import Party, Politician, VotingSession, Vote
from util.errors import NoSuchDocumentError
import os
from pathlib import Path
from typing import List, Tuple, Dict
import json
from tqdm import tqdm


def parse_document(path: str, document_id: str) -> Document:
    raw_content: str = ""
    segments: list = []

    path_obj = Path(path)
    if "voting" in path_obj.parts and path_obj.suffix.lower() == ".json":
        print(
            f"Skipping voting JSON {path} in generic parse_document. Handled by parse_all_voting_data."
        )
        return Document(id=document_id, path=path, raw_content="", segments=[])

    _, file_extension = os.path.splitext(path)

    if file_extension.lower() == ".pdf":
        try:
            raw_content, segments = parse_pdf(path, document_id)
        except NoSuchDocumentError:
            raise

    elif file_extension.lower() == ".json":
        try:
            raw_content, segments = parse_json(path, document_id)
        except NoSuchDocumentError:
            raise

    else:
        print(
            f"Unsupported file type: {file_extension} for document {document_id} at {path}"
        )
        return Document(id=document_id, path=path, raw_content="", segments=[])

    return Document(
        id=document_id, path=path, raw_content=raw_content, segments=segments
    )


def parse_all_voting_data(
    voting_data_base_dir: Path,
) -> Tuple[List[Party], List[Politician], List[VotingSession], List[Vote]]:
    """Parses all voting-related JSON files and returns structured data."""
    parties_path = voting_data_base_dir / "parties.json"
    politicians_path = voting_data_base_dir / "politicians.json"
    voteringar_by_year_dir = voting_data_base_dir / "voteringar-by-year"
    votes_by_politician_year_dir = voting_data_base_dir / "by-politician-year"

    # 1. Parse Parties
    print(f"Parsing parties from {parties_path}...")
    parties = parse_parties(str(parties_path))
    party_id_by_abbr: Dict[str, str] = {p.id: p.id for p in parties}
    politician_abbr_to_party_id_normalization_map = {
        "c": "C",
        "C": "C",
        "fp": "L",
        "FP": "L",
        "l": "L",
        "L": "L",
        "m": "M",
        "M": "M",
        "s": "S",
        "S": "S",
        "kd": "KD",
        "KD": "KD",
        "-": "-",
        "sd": "SD",
        "SD": "SD",
        "mp": "MP",
        "MP": "MP",
        "v": "V",
        "V": "V",
    }
    for party_obj in parties:
        if party_obj.id not in politician_abbr_to_party_id_normalization_map:
            politician_abbr_to_party_id_normalization_map[party_obj.id] = party_obj.id

    print(f"Parsed {len(parties)} parties.")

    # 2. Parse Politicians and link to Parties
    print(f"Parsing politicians from {politicians_path}...")
    politicians = parse_politicians(str(politicians_path))
    for pol in politicians:
        if pol.party_abbreviation:
            normalized_abbr = pol.party_abbreviation.upper()
            if (
                pol.party_abbreviation.lower()
                in politician_abbr_to_party_id_normalization_map
            ):
                normalized_abbr = politician_abbr_to_party_id_normalization_map[
                    pol.party_abbreviation.lower()
                ]
            elif normalized_abbr in politician_abbr_to_party_id_normalization_map:
                normalized_abbr = politician_abbr_to_party_id_normalization_map[
                    normalized_abbr
                ]
            else:
                pass

            if normalized_abbr in party_id_by_abbr:
                pol.party_id = party_id_by_abbr[normalized_abbr]
            else:
                print(
                    f"Warning: Could not map normalized party abbreviation '{normalized_abbr}' (from '{pol.party_abbreviation}') for politician {pol.name} to a known Party ID."
                )
    print(f"Parsed {len(politicians)} politicians.")

    # 3. Parse Voting Sessions (Voteringar)
    all_voting_sessions: List[VotingSession] = []
    print(f"Parsing voting sessions from {voteringar_by_year_dir}...")
    for year_file in voteringar_by_year_dir.glob("voteringar-*.json"):
        if year_file.name == "_summary.json":
            continue
        print(f"  Parsing {year_file.name}...")
        sessions_from_file = parse_voting_sessions(str(year_file))
        all_voting_sessions.extend(sessions_from_file)
    print(f"Parsed {len(all_voting_sessions)} voting sessions in total.")

    # 4. Parse Individual Politician Votes
    all_votes: List[Vote] = []
    print(f"Parsing individual politician votes from {votes_by_politician_year_dir}...")
    politician_vote_files = list(votes_by_politician_year_dir.glob("*.json"))

    politician_vote_files = [
        f for f in politician_vote_files if f.name != "_summary.json"
    ]

    for vote_file in tqdm(
        politician_vote_files, desc="Parsing politician votes", unit="file"
    ):
        try:
            votes_from_file, _, _ = parse_politician_votes(str(vote_file))
            all_votes.extend(votes_from_file)
        except NoSuchDocumentError:
            print(f"Skipping (not found): {vote_file}")
        except Exception as e:
            print(f"Error parsing vote file {vote_file}: {e}")
    print(f"Parsed {len(all_votes)} individual votes in total.")

    return parties, politicians, all_voting_sessions, all_votes
