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

async function testConcurrentFetching(politicians: Politician[], sessions: string[]): Promise<void> {
  console.log(`\n🚀 Testing concurrent fetching for ${politicians.length} politicians across ${sessions.length} sessions`);
  
  const startTime = Date.now();
  
  // Process all politicians concurrently
  const politicianPromises = politicians.map(async (politician) => {
    console.log(`  Processing ${politician.name} concurrently...`);
    
    // Process all sessions for this politician concurrently
    const sessionPromises = sessions.map(async (session) => {
      const votes = await fetchVotesForPoliticianAndSession(politician, session);
      return {
        politician: politician.name,
        session,
        votes: votes.length,
        voteBreakdown: votes.reduce((acc, vote) => {
          acc[vote.vote] = (acc[vote.vote] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    });
    
    const sessionResults = await Promise.all(sessionPromises);
    return {
      politician: politician.name,
      sessions: sessionResults
    };
  });
  
  const results = await Promise.all(politicianPromises);
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⚡ Concurrent processing completed in ${totalTime} seconds`);
  
  // Display results
  for (const result of results) {
    console.log(`\n📊 ${result.politician}:`);
    for (const session of result.sessions) {
      console.log(`  ${session.session}: ${session.votes} votes`, session.voteBreakdown);
    }
  }
}

async function testFetchVotes() {
  try {
    console.log('🗳️  Starting test vote extraction with concurrent processing...');
    console.log('📋 This will test the concurrent gruppering=votering_id approach');
    
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
    
    // Test with multiple sessions
    const testSessions = ['2022/23', '2023/24'];
    console.log(`\nTesting with parliamentary sessions: ${testSessions.join(', ')}`);
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/test-votes-concurrent';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Test concurrent processing
    await testConcurrentFetching(testPoliticians, testSessions);
    
    console.log('\n📁 Now saving files sequentially for comparison...');
    
    let totalVotes = 0;
    
    // Process each test politician and session
    for (const politician of testPoliticians) {
      for (const session of testSessions) {
        const year = session === '2022/23' ? 2022 : 2023;
        
        console.log(`\nProcessing: ${politician.name} for ${session} (${year})`);
        
        const votes = await fetchVotesForPoliticianAndSession(politician, session);
        
        // Create the vote data object
        const voteData: PoliticianVoteData = {
          politician: politician.name,
          politicianId: politician.id,
          parliamentarySession: session,
          year: year,
          totalVotes: votes.length,
          votes: votes.sort((a, b) => a.votering_id.localeCompare(b.votering_id)),
          extractedAt: new Date().toISOString(),
          source: `Swedish Riksdag API - Test concurrent votes for ${politician.name} in ${session}`
        };
        
        // Create filename: politician-name-year.json
        const charMap: Record<string, string> = { 'å': 'a', 'ä': 'a', 'ö': 'o' };
        const safeFileName = politician.name
          .toLowerCase()
          .replace(/[åäö]/g, (match: string) => charMap[match] || match)
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const fileName = `${safeFileName}-${year}-concurrent-test.json`;
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
      }
    }
    
    console.log(`\n🎉 Test completed! Found ${totalVotes} total votes across ${testPoliticians.length} politicians and ${testSessions.length} sessions`);
    
    // Test with Magdalena Andersson specifically (from your example)
    console.log('\n🔍 Testing with Magdalena Andersson (from your example)...');
    const magdalenaId = '098412828516';
    const magdalena = politiciansData.politicians.find((p: Politician) => p.id === magdalenaId);
    
    if (magdalena) {
      console.log(`Found Magdalena Andersson: ${magdalena.name} (ID: ${magdalena.id})`);
      
      // Test concurrent fetching for multiple sessions
      const magdalenaSessions = ['2022/23', '2023/24'];
      const magdalenaStartTime = Date.now();
      
      const magdalenaPromises = magdalenaSessions.map(async (session) => {
        const votes = await fetchVotesForPoliticianAndSession(magdalena, session);
        return { session, votes: votes.length };
      });
      
      const magdalenaResults = await Promise.all(magdalenaPromises);
      const magdalenaTime = ((Date.now() - magdalenaStartTime) / 1000).toFixed(1);
      
      console.log(`Magdalena Andersson concurrent results (${magdalenaTime}s):`);
      for (const result of magdalenaResults) {
        console.log(`  ${result.session}: ${result.votes} votes`);
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
  console.log('🗳️  Starting test vote extraction with concurrent processing...');
  console.log('📋 This will test the concurrent gruppering=votering_id approach');
  
  testFetchVotes().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testFetchVotes }; 