#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface Vote {
  votering_id: string;
  datum: string;
  beteckning: string;
  punkt: string;
  rost: string;
  avser: string;
  intressent_id: string;
  namn: string;
  parti: string;
  valkrets: string;
  banknummer: string;
}

interface VoteData {
  politician: string;
  year: number;
  totalVotes: number;
  votes: Vote[];
  extractedAt: string;
}

async function fetchVotesForPolitician(politicianId: string, politicianName: string, year: number): Promise<Vote[]> {
  const baseUrl = 'https://data.riksdagen.se/voteringlista/';
  
  // Parameters for the API call
  const params = new URLSearchParams({
    iid: politicianId,
    from: `${year}-01-01`,
    tom: `${year}-12-31`,
    sz: '10000', // Maximum votes per call
    utformat: 'json'
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  
  try {
    console.log(`  Fetching votes for ${politicianName} (${year})...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    
    // Handle empty responses
    if (!data || data.trim() === '') {
      console.log(`    No data returned for ${politicianName} (${year})`);
      return [];
    }
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseError) {
      console.log(`    Invalid JSON response for ${politicianName} (${year})`);
      return [];
    }
    
    // Extract votes from the response
    const votes: Vote[] = [];
    
    if (jsonData.voteringlista && jsonData.voteringlista.votering) {
      const voterings = Array.isArray(jsonData.voteringlista.votering) 
        ? jsonData.voteringlista.votering 
        : [jsonData.voteringlista.votering];
      
      for (const votering of voterings) {
        if (votering.votering_id) {
          const vote: Vote = {
            votering_id: votering.votering_id,
            datum: votering.systemdatum || '',
            beteckning: votering.beteckning || '',
            punkt: votering.punkt || '',
            rost: votering.rost || '',
            avser: votering.avser || '',
            intressent_id: votering.intressent_id || '',
            namn: votering.namn || politicianName,
            parti: votering.parti || '',
            valkrets: votering.valkrets || '',
            banknummer: votering.banknummer || ''
          };
          votes.push(vote);
        }
      }
    }
    
    console.log(`    Found ${votes.length} votes for ${politicianName} (${year})`);
    return votes;
    
  } catch (error) {
    console.error(`    Error fetching votes for ${politicianName} (${year}):`, error);
    return [];
  }
}

async function testFetchVotes() {
  try {
    console.log('Reading politicians.json...');
    const politiciansData = JSON.parse(fs.readFileSync('../knowledge-base/documents/voting/politicians.json', 'utf8'));
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/test-votes';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Test with just 2023 and first 3 politicians
    const testYear = 2023;
    const testPoliticians = politiciansData.politicians.slice(0, 3);
    
    console.log(`\nTesting with ${testPoliticians.length} politicians for year ${testYear}`);
    
    let totalFiles = 0;
    
    // Process each test politician
    for (const politician of testPoliticians) {
      console.log(`\nProcessing: ${politician.name} (ID: ${politician.id})`);
      
      if (!politician.id || !politician.name) {
        console.log(`  Skipping invalid politician entry: ${politician}`);
        continue;
      }
      
      const votes = await fetchVotesForPolitician(politician.id, politician.name, testYear);
      
      // Create the vote data object
      const voteData: VoteData = {
        politician: politician.name,
        year: testYear,
        totalVotes: votes.length,
        votes: votes,
        extractedAt: new Date().toISOString()
      };
      
      // Create filename: politician-name-year.json
      const charMap: Record<string, string> = { 'å': 'a', 'ä': 'a', 'ö': 'o' };
      const safeFileName = politician.name
        .toLowerCase()
        .replace(/[åäö]/g, (match: string) => charMap[match] || match)
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const fileName = `${safeFileName}-${testYear}.json`;
      const filePath = path.join(outputDir, fileName);
      
      // Save the file
      fs.writeFileSync(filePath, JSON.stringify(voteData, null, 2));
      totalFiles++;
      
      console.log(`  Saved ${votes.length} votes to ${fileName}`);
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Test completed! Created ${totalFiles} test files in ${outputDir}`);
    
  } catch (error) {
    console.error('Error in testFetchVotes:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🗳️  Starting vote extraction test...');
  
  testFetchVotes().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testFetchVotes }; 