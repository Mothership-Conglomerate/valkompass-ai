#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface Politician {
  name: string;
  id: string;
}

interface PoliticianVote {
  votering_id: string;
  vote: 'Ja' | 'Nej' | 'Frånvarande' | 'Avstår';
}

interface PoliticianVoteData {
  politician: string;
  politicianId: string;
  parliamentarySession: string;
  year: number;
  totalVotes: number;
  votes: PoliticianVote[];
  extractedAt: string;
  source: string;
}

async function fetchVotesForPoliticianAndSession(politician: Politician, session: string): Promise<PoliticianVote[]> {
  const baseUrl = 'https://data.riksdagen.se/voteringlista/';
  
  // Parameters for the API call - fetch votes for specific politician and parliamentary session
  const params = new URLSearchParams({
    iid: politician.id,
    rm: session,
    sz: '10000', // Maximum votes per call
    utformat: 'json',
    gruppering: 'votering_id'
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  console.log(`    API URL: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    
    // Handle empty responses
    if (!data || data.trim() === '') {
      return [];
    }
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseError) {
      return [];
    }
    
    // Extract votes from the response
    const votes: PoliticianVote[] = [];
    
    if (jsonData.voteringlista && jsonData.voteringlista.votering) {
      const voterings = Array.isArray(jsonData.voteringlista.votering) 
        ? jsonData.voteringlista.votering 
        : [jsonData.voteringlista.votering];
      
      console.log(`    Found ${voterings.length} voting sessions`);
      
      for (const votering of voterings) {
        if (votering.votering_id) {
          // Determine the vote based on which field has "1"
          let vote: 'Ja' | 'Nej' | 'Frånvarande' | 'Avstår';
          
          if (votering.Ja === '1') {
            vote = 'Ja';
          } else if (votering.Nej === '1') {
            vote = 'Nej';
          } else if (votering.Frånvarande === '1') {
            vote = 'Frånvarande';
          } else if (votering.Avstår === '1') {
            vote = 'Avstår';
          } else {
            // Skip if no clear vote found
            continue;
          }
          
          votes.push({
            votering_id: votering.votering_id,
            vote: vote
          });
        }
      }
    }
    
    return votes;
    
  } catch (error) {
    console.error(`    Error fetching votes for ${politician.name} in session ${session}:`, error);
    return [];
  }
}

async function testFetchVotes() {
  try {
    console.log('🗳️  Starting test vote extraction with new API approach...');
    console.log('📋 This will test the gruppering=votering_id approach');
    
    // Load politicians
    console.log('\nReading politicians.json...');
    const politiciansData = JSON.parse(fs.readFileSync('../knowledge-base/documents/voting/politicians.json', 'utf8'));
    console.log(`Found ${politiciansData.politicians.length} politicians`);
    
    // Test with first 3 politicians
    const testPoliticians = politiciansData.politicians.slice(0, 3);
    console.log(`Testing with ${testPoliticians.length} politicians:`);
    testPoliticians.forEach((p: Politician, i: number) => {
      console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
    });
    
    // Test with 2023/24 session
    const testSession = '2023/24';
    const testYear = 2023;
    console.log(`\nTesting with parliamentary session: ${testSession} (${testYear})`);
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/test-votes-new-api';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    let totalVotes = 0;
    
    // Process each test politician
    for (const politician of testPoliticians) {
      console.log(`\nProcessing: ${politician.name} (ID: ${politician.id})`);
      
      const votes = await fetchVotesForPoliticianAndSession(politician, testSession);
      
      // Create the vote data object
      const voteData: PoliticianVoteData = {
        politician: politician.name,
        politicianId: politician.id,
        parliamentarySession: testSession,
        year: testYear,
        totalVotes: votes.length,
        votes: votes.sort((a, b) => a.votering_id.localeCompare(b.votering_id)),
        extractedAt: new Date().toISOString(),
        source: `Swedish Riksdag API - Test votes for ${politician.name} in ${testSession}`
      };
      
      // Create filename: politician-name-year.json
      const charMap: Record<string, string> = { 'å': 'a', 'ä': 'a', 'ö': 'o' };
      const safeFileName = politician.name
        .toLowerCase()
        .replace(/[åäö]/g, (match: string) => charMap[match] || match)
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const fileName = `${safeFileName}-${testYear}-test.json`;
      const filePath = path.join(outputDir, fileName);
      
      // Save the file
      fs.writeFileSync(filePath, JSON.stringify(voteData, null, 2));
      totalVotes += votes.length;
      
      console.log(`  💾 Saved ${votes.length} votes to ${fileName}`);
      
      // Show vote breakdown
      if (votes.length > 0) {
        const voteBreakdown = votes.reduce((acc, vote) => {
          acc[vote.vote] = (acc[vote.vote] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`  📊 Vote breakdown:`, voteBreakdown);
      }
      
      // Small delay between politicians
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n🎉 Test completed! Found ${totalVotes} total votes across ${testPoliticians.length} politicians`);
    
    // Show some sample votes if any were found
    if (totalVotes > 0) {
      console.log('\n📋 Sample vote structure:');
      const firstFile = fs.readdirSync(outputDir).find(f => f.endsWith('-test.json'));
      if (firstFile) {
        const sampleData = JSON.parse(fs.readFileSync(path.join(outputDir, firstFile), 'utf8'));
        if (sampleData.votes.length > 0) {
          const sampleVote = sampleData.votes[0];
          console.log(`  Politician: ${sampleData.politician}`);
          console.log(`  Votering ID: ${sampleVote.votering_id}`);
          console.log(`  Vote: ${sampleVote.vote}`);
          console.log(`  Parliamentary Session: ${sampleData.parliamentarySession}`);
          console.log(`  Year: ${sampleData.year}`);
        }
      }
    }
    
    // Test with Magdalena Andersson specifically (from your example)
    console.log('\n🔍 Testing with Magdalena Andersson (from your example)...');
    const magdalenaId = '098412828516';
    const magdalena = politiciansData.politicians.find((p: Politician) => p.id === magdalenaId);
    
    if (magdalena) {
      console.log(`Found Magdalena Andersson: ${magdalena.name} (ID: ${magdalena.id})`);
      const magdalenaVotes = await fetchVotesForPoliticianAndSession(magdalena, testSession);
      console.log(`Magdalena Andersson has ${magdalenaVotes.length} votes in ${testSession}`);
      
      if (magdalenaVotes.length > 0) {
        const magdalenaBreakdown = magdalenaVotes.reduce((acc, vote) => {
          acc[vote.vote] = (acc[vote.vote] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log(`Magdalena's vote breakdown:`, magdalenaBreakdown);
      }
    } else {
      console.log(`❌ Could not find politician with ID ${magdalenaId}`);
    }
    
  } catch (error) {
    console.error('❌ Error in testFetchVotes:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🗳️  Starting test vote extraction with new API approach...');
  console.log('📋 This will test the gruppering=votering_id approach');
  
  testFetchVotes().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testFetchVotes }; 