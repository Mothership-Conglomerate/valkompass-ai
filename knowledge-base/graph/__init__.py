import json
from neo4j import GraphDatabase
from model import Topic, Document

# 1) Define your schema in Python
SCHEMA = {
    "constraints": [
        # unique IDs on each label
        {
            "name": "topic_id_unique",
            "cypher": "CONSTRAINT IF NOT EXISTS FOR (n:Topic) REQUIRE n.id IS UNIQUE",
        },
        {
            "name": "document_id_unique",
            "cypher": "CONSTRAINT IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE",
        },
        {
            "name": "segment_id_unique",
            "cypher": "CONSTRAINT IF NOT EXISTS FOR (n:DocumentSegment) REQUIRE n.id IS UNIQUE",
        },
    ],
    "indexes": [
        # basic look-ups
        {
            "name": "topic_name_idx",
            "cypher": "INDEX topic_name_idx IF NOT EXISTS FOR (n:Topic) ON (n.name)",
        },
        {
            "name": "doc_path_idx",
            "cypher": "INDEX doc_path_idx IF NOT EXISTS FOR (n:Document) ON (n.path)",
        },
        # vector indexes for fast embedding search (requires Neo4j vector plugin)
        {
            "name": "topic_embedding_idx",
            "cypher": "VECTOR INDEX topic_embedding_idx IF NOT EXISTS FOR (n:Topic) ON (n.embedding) OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine'} }",
        },
        {
            "name": "segment_embedding_idx",
            "cypher": "VECTOR INDEX segment_embedding_idx IF NOT EXISTS FOR (n:DocumentSegment) ON (n.embedding) OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine'} }",
        },
    ],
}


class SchemaManager:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def apply_schema(self) -> None:
        """Create constraints & indexes if they don't already exist."""
        with self.driver.session() as session:
            for ct in SCHEMA["constraints"]:
                stmt = f"CREATE {ct['cypher']}"
                session.run(stmt)
            for idx in SCHEMA["indexes"]:
                stmt = f"CREATE {idx['cypher']}"
                session.run(stmt)

    def clear_database(self) -> None:
        """Remove all data, indexes, and constraints from the database."""
        with self.driver.session() as session:
            # Drop all constraints
            for ct in SCHEMA["constraints"]:
                stmt = f"DROP CONSTRAINT {ct['name']} IF EXISTS"
                try:
                    session.run(stmt)
                except Exception as e:
                    # It's okay if a constraint doesn't exist when we try to drop it
                    print(f"Error dropping constraint {ct['name']}: {e}")

            # Drop all indexes
            for idx in SCHEMA["indexes"]:
                index_name = idx["name"]
                stmt = f"DROP INDEX {index_name} IF EXISTS"
                try:
                    session.run(stmt)
                except Exception as e:
                    # It's okay if an index doesn't exist when we try to drop it
                    print(f"Error dropping index {index_name}: {e}")

            # Delete all nodes and relationships
            session.run("MATCH (n) DETACH DELETE n")
            print("Database nuked: all data, indexes, and constraints removed.")

    def upsert_topic(self, topic: Topic) -> None:
        with self.driver.session() as session:
            session.run(
                """
                MERGE (t:Topic {id:$id})
                SET t.name       = $name,
                    t.description= $description,
                    t.embedding  = $embedding
                """,
                id=topic.id,
                name=topic.name,
                description=topic.description,
                embedding=topic.embedding.tolist()
                if topic.embedding is not None
                else None,
            )

    def upsert_document(self, doc: Document) -> None:
        with self.driver.session() as session:
            # upsert Document node
            session.run(
                """
                MERGE (d:Document {id:$id})
                SET d.path        = $path,
                    d.raw_content = $raw_content
                """,
                id=doc.id,
                path=doc.path,
                raw_content=doc.raw_content,
            )

            # Prepare segment data for bulk upsert
            segments_data = []
            for seg in doc.segments:
                segments_data.append(
                    {
                        "seg_id": seg.id,
                        "text": seg.text,
                        "start_index": seg.start_index,
                        "end_index": seg.end_index,
                        "page": seg.page,
                        "metadata": json.dumps(seg.metadata)
                        if seg.metadata is not None
                        else None,
                        "embedding": seg.embedding.tolist()
                        if seg.embedding is not None
                        else None,
                        "public_url": seg.public_url,
                        "doc_id": doc.id,
                        "type": seg.type,
                    }
                )

            # Bulk upsert segments and link them to the document
            if segments_data:
                session.run(
                    """
                    UNWIND $segments_data AS seg_data
                    MERGE (s:DocumentSegment {id:seg_data.seg_id})
                    SET s.text        = seg_data.text,
                        s.start_index = seg_data.start_index,
                        s.end_index   = seg_data.end_index,
                        s.page        = seg_data.page,
                        s.metadata    = seg_data.metadata,
                        s.embedding   = seg_data.embedding,
                        s.public_url  = seg_data.public_url,
                        s.type        = seg_data.type
                    WITH s, seg_data
                    MATCH (d:Document {id:seg_data.doc_id})
                    MERGE (d)-[:CONTAINS]->(s)
                    """,
                    segments_data=segments_data,
                )

            # Prepare topic mentions for bulk upsert
            topic_mentions_data = []
            for seg in doc.segments:
                if seg.topic_id is not None:
                    topic_mentions_data.append(
                        {
                            "seg_id": seg.id,
                            "topic_id": seg.topic_id,
                        }
                    )

            # Bulk link segments to topics if they mention them
            if topic_mentions_data:
                session.run(
                    """
                    UNWIND $topic_mentions_data AS mention_data
                    MATCH (s:DocumentSegment {id:mention_data.seg_id})
                    MATCH (t:Topic {id:mention_data.topic_id})
                    MERGE (s)-[:MENTIONS]->(t)
                    """,
                    topic_mentions_data=topic_mentions_data,
                )


if __name__ == "__main__":
    # adjust URI/credentials as needed
    mgr = SchemaManager("bolt://localhost:7687", "neo4j", "password")
    try:
        # Example usage:
        # To apply schema:
        # mgr.apply_schema()
        # print("Schema applied successfully.")

        # To nuke the database (use with caution!):
        # print("Attempting to nuke the database...")
        # mgr.nuke_database()
        # print("Database nuke attempt finished.")

        # For regular schema application:
        mgr.apply_schema()
        print("Schema applied successfully.")
    finally:
        mgr.close()
