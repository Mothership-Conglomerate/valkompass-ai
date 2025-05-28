import json
from typing import List, Dict, Tuple
from model import Politician, Party, VotingSession, Vote
from util.errors import NoSuchDocumentError
import re  # For extracting party abbreviation from politician name
from pathlib import Path  # For path manipulation


def parse_parties(file_path: str) -> List[Party]:
    """Parses the parties.json file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise NoSuchDocumentError(f"File not found: {file_path}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from file: {file_path}")
        return []

    parties_dict: Dict[str, str] = data.get("parties", {})
    parsed_parties: List[Party] = []
    for abbreviation, name in parties_dict.items():
        # Use abbreviation as Party.id (string)
        parsed_parties.append(Party(id=abbreviation, name=name))
    return parsed_parties


def parse_politicians(file_path: str) -> List[Politician]:
    """Parses the politicians.json file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise NoSuchDocumentError(f"File not found: {file_path}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from file: {file_path}")
        return []

    politicians_data: List[Dict] = data.get("politicians", [])
    parsed_politicians: List[Politician] = []
    for pol_data in politicians_data:
        name_with_party = pol_data.get("name", "")
        party_abbreviation = None
        # Attempt to extract party abbreviation, e.g., "(C)" from "Name (C)"
        match = re.search(r"\(([^)]+)\)$", name_with_party)
        if match:
            party_abbreviation = match.group(1)
            # Clean the name by removing the party part
            name = name_with_party[: match.start()].strip()
        else:
            name = name_with_party.strip()

        parsed_politicians.append(
            Politician(
                id=str(pol_data.get("id")),  # Ensure ID is string
                name=name,
                party_abbreviation=party_abbreviation,
                # party_id will be populated later after parties are parsed and mapped
            )
        )
    return parsed_politicians


def parse_voting_sessions(file_path: str) -> List[VotingSession]:
    """Parses a voteringar-YYYY-YY.json file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise NoSuchDocumentError(f"File not found: {file_path}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from file: {file_path}")
        return []

    voting_sessions_data: List[Dict] = data.get("voteringar", [])
    parsed_sessions: List[VotingSession] = []

    # Extract year from the filename, e.g., "voteringar-2016-17.json" -> 2016
    file_stem = Path(file_path).stem
    year_match = re.search(r"voteringar-(\d{4})-\d{2}", file_stem)
    file_year = (
        int(year_match.group(1)) if year_match else 0
    )  # Default to 0 if pattern not found
    if not year_match:
        print(
            f"Warning: Could not extract year from filename {file_path}. Defaulting year to 0."
        )

    for vs_data in voting_sessions_data:
        parsed_sessions.append(
            VotingSession(
                id=str(vs_data.get("votering_id")),
                name=vs_data.get("titel", "No Title Provided"),
                description=vs_data.get("beslut_i_korthet", "No Description Provided"),
                nb_for=int(vs_data.get("Ja", 0)),
                nb_against=int(vs_data.get("Nej", 0)),
                nb_absent=int(vs_data.get("Frånvarande", 0)),
                nb_abstain=int(vs_data.get("Avstår", 0)),
                year=file_year,  # Add the extracted year
            )
        )
    return parsed_sessions


def parse_politician_votes(file_path: str) -> Tuple[List[Vote], str, str]:
    """
    Parses an individual politician's vote file (e.g., by-politician-year/*.json).
    Returns a list of Vote objects, the politician ID, and the parliamentary session year.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise NoSuchDocumentError(f"File not found: {file_path}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from file: {file_path}")
        return [], "", ""

    politician_id = str(data.get("politicianId"))
    session_year = data.get("parliamentarySession")
    votes_data: List[Dict] = data.get("votes", [])
    parsed_votes: List[Vote] = []

    for i, vote_data in enumerate(votes_data):
        # vote_data is expected to be a dict like {"votingId": "...", "vote": "Ja"}
        voting_id = vote_data.get("votingId")
        vote_option = vote_data.get("vote")
        if voting_id and vote_option:
            # Generate a unique ID for the Vote object.
            # This could be a combination of politician_id, voting_id, or a UUID.
            # For simplicity now, using an index, but this is not globally unique.
            # This ID might need to be rethought if Votes are stored/queried independently.
            vote_object_id = f"{politician_id}-{voting_id}-{i}"  # Example, not ideal

            parsed_votes.append(
                Vote(
                    id=i,  # Temporary local ID, needs a better strategy for global uniqueness if votes are stored independently
                    politician_id=str(politician_id),
                    voting_id=str(voting_id),
                    vote_option=vote_option,
                )
            )
    return parsed_votes, politician_id, session_year
