![Valkompass Logo](images/valkompass_image.avif)

# Welcome to Valkompass!

Valkompass.ai is an open-source tool that helps you explore and compare the positions and decisions of Swedish political parties. By collecting official documents—such as party programs, election manifestos, voting records, parliamentary reports, and other public protocols—Valkompass.ai leverages advanced AI (Gemini 2.5 Flash) to analyze this information. You can ask questions and engage in conversations, with answers grounded in the actual stances and actions of the parties.

Whether you're a voter seeking clarity, a journalist researching policy, or simply curious about Swedish politics, Valkompass.ai empowers you to make informed decisions with transparent, data-driven insights.

## History
Valkompass.ai was created during a hackathon at Mashup Day Malmö in May 2025.


## Getting Started

First, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## How do we handle political data? 

All raw and processed data points are stored in the [knowledge-base](./knowledge-base/) directory. Whenever we deploy a new version of valkompass.ai, only the data available in [structured-knowledge-base](./knowledge-base/structured-knowledge-base/) is transferred to our Neo4j database. This process enhances transparency regarding the data the AI can access. 