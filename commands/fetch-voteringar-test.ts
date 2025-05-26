#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface Votering {
  votering_id: string;
  Ja: string;
  Nej: string;
  Frånvarande: string;
  Avstår: string;
}

interface VoteringData {
  year: number;
  totalVoteringar: number;
  voteringar: Votering[];
  extractedAt: string;
  source: string;
}

async function fetchVoteringarForSession(session: string): Promise<Votering[]> {
  const baseUrl = 'https://data.riksdagen.se/voteringlista/';
  
  // Parameters for the API call - fetch all voting sessions for the parliamentary session
  const params = new URLSearchParams({
    rm: session,
    sz: '10000', // Maximum per call
    utformat: 'json',
    gruppering: 'votering_id'
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  
  try {
    console.log(`  Fetching voteringar for session ${session}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    
    // Handle empty responses
    if (!data || data.trim() === '') {
      console.log(`    No data returned for session ${session}`);
      return [];
    }
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseError) {
      console.log(`    Invalid JSON response for session ${session}`);
      return [];
    }
    
    // Extract unique voting sessions from the response
    const voteringar: Votering[] = [];
    const seenVoteringIds = new Set<string>();
    
    if (jsonData.voteringlista && jsonData.voteringlista.votering) {
      const voterings = Array.isArray(jsonData.voteringlista.votering) 
        ? jsonData.voteringlista.votering 
        : [jsonData.voteringlista.votering];
      
      for (const votering of voterings) {
        if (votering.votering_id && !seenVoteringIds.has(votering.votering_id)) {
          seenVoteringIds.add(votering.votering_id);
          
          const voteringData: Votering = {
            votering_id: votering.votering_id,
            Ja: votering.Ja || '0',
            Nej: votering.Nej || '0',
            Frånvarande: votering.Frånvarande || '0',
            Avstår: votering.Avstår || '0'
          };
          voteringar.push(voteringData);
        }
      }
    }
    
    console.log(`    Found ${voteringar.length} unique voteringar for session ${session}`);
    return voteringar;
    
  } catch (error) {
    console.error(`    Error fetching voteringar for session ${session}:`, error);
    return [];
  }
}

async function testFetchVoteringar() {
  try {
    console.log('Starting voteringar test extraction...');
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/test-voteringar';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Test with 2023/24 session
    const testSession = '2023/24';
    
    console.log(`\nTesting voteringar extraction for session ${testSession}`);
    
    const voteringar = await fetchVoteringarForSession(testSession);
    
    // Create the votering data object
    const voteringData: VoteringData = {
      year: parseInt(testSession.split('/')[0]),
      totalVoteringar: voteringar.length,
      voteringar: voteringar.sort((a: Votering, b: Votering) => a.votering_id.localeCompare(b.votering_id)),
      extractedAt: new Date().toISOString(),
      source: `Swedish Riksdag API - Parliamentary session ${testSession} (TEST)`
    };
    
    // Create filename: voteringar-session.json
    const fileName = `voteringar-${testSession.replace('/', '-')}.json`;
    const filePath = path.join(outputDir, fileName);
    
    // Save the file
    fs.writeFileSync(filePath, JSON.stringify(voteringData, null, 2));
    
    console.log(`\n✅ Test completed! Saved ${voteringar.length} voteringar to ${fileName}`);
    
    // Show some sample data
    if (voteringar.length > 0) {
      console.log('\n📋 Sample voteringar:');
      voteringar.slice(0, 5).forEach((votering: Votering, index: number) => {
        console.log(`${index + 1}. ${votering.votering_id} - Ja: ${votering.Ja}, Nej: ${votering.Nej}, Frånvarande: ${votering.Frånvarande}, Avstår: ${votering.Avstår}`);
      });
      
      if (voteringar.length > 5) {
        console.log(`... and ${voteringar.length - 5} more`);
      }
    }
    
  } catch (error) {
    console.error('Error in testFetchVoteringar:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🗳️  Starting voteringar test extraction...');
  console.log('📋 This will fetch all voting sessions for 2023 as a test');
  
  testFetchVoteringar().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testFetchVoteringar }; 