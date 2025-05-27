import neo4j, { Driver, Session } from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  throw new Error('Neo4j connection details are not fully set in environment variables.');
}

let driver: Driver;

const getDriver = (): Driver => {
  if (!driver) {
    try {
      driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
      // You might want to verify connectivity here, e.g., by driver.verifyConnectivity()
      // However, verifyConnectivity also checks license for Aura, which might not be desired for local dev.
      // A simple session run can also work if needed.
      console.log("Neo4j Driver initialized.");
    } catch (error) {
      console.error("Failed to create Neo4j driver:", error);
      throw new Error("Could not establish connection with Neo4j database.");
    }
  }
  return driver;
};

export interface RetrievedSegment {
  documentPath: string;
  segmentText: string;
  segmentPage: number;
  similarityScore: number; 
}

export interface RetrievedContext {
  topicName: string;
  topicDescription: string;
  segments: RetrievedSegment[];
}

export const getContextFromKB = async (queryEmbedding: number[]): Promise<RetrievedContext | null> => {
  const session: Session = getDriver().session();
  try {
    // 1. Find the most similar topic
    const topicResult = await session.run(
      `CALL db.index.vector.queryNodes('topic_embedding_idx', 1, $queryEmbedding) 
       YIELD node AS topic, score
       RETURN topic.name AS name, topic.description AS description, score
       ORDER BY score DESC LIMIT 1`,
      { queryEmbedding }
    );

    if (topicResult.records.length === 0) {
      console.warn("No matching topic found in knowledge base.");
      return null;
    }

    const topTopic = topicResult.records[0];
    const topicName = topTopic.get('name');
    const topicDescription = topTopic.get('description');

    // 2. Find the top 25 similar segments related to this topic and their documents
    // This query assumes segments are MENTIONing topics. If the relationship is different, adjust.
    // If segments are not directly linked to topics, we might search all segments and then filter by topic if desired,
    // or perform a broader segment search. For now, sticking to topic-constrained segment search.
    // TODO: Look at this logic ... how should it work?
    const segmentsResult = await session.run(
      `CALL db.index.vector.queryNodes('segment_embedding_idx', 25, $queryEmbedding) 
       YIELD node AS segment, score
       MATCH (doc:Document)-[:CONTAINS]->(segment)
       // Optional: If you want to ensure segments are related to the found topic, uncomment and adjust:
       // MATCH (segment)-[:MENTIONS]->(t:Topic {name: $topicName})
       RETURN doc.path AS documentPath, segment.text AS segmentText, segment.page AS segmentPage, score AS similarityScore
       ORDER BY similarityScore DESC`, 
      { queryEmbedding, topicName } // topicName is used if the optional MATCH above is enabled
    );

    const segments: RetrievedSegment[] = segmentsResult.records.map(record => ({
      documentPath: record.get('documentPath'),
      segmentText: record.get('segmentText'),
      segmentPage: record.get('segmentPage') ? record.get('segmentPage').toNumber() : 0, // Ensure page is a number
      similarityScore: record.get('similarityScore'),
    })); 

    return {
      topicName,
      topicDescription,
      segments,
    };

  } catch (error) {
    console.error("Error querying Neo4j knowledge base:", error);
    throw new Error("Failed to retrieve context from knowledge base.");
  } finally {
    await session.close();
  }
};

// Optional: Function to close the driver when the application shuts down
export const closeNeo4jDriver = async () => {
  if (driver) {
    await driver.close();
    console.log("Neo4j Driver closed.");
  }
}; 