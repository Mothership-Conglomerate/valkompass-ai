#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface Politician {
  name: string;
  id: string;
}

interface VoteringarData {
  year: number;
  totalVoteringar: number;
  voteringar: any[];
  extractedAt: string;
  source: string;
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

// Map parliamentary sessions to years
const sessionToYear: Record<string, number> = {
  '2016/17': 2016,
  '2017/18': 2017,
  '2018/19': 2018,
  '2019/20': 2019,
  '2020/21': 2020,
  '2021/22': 2021,
  '2022/23': 2022,
  '2023/24': 2023,
  '2024/25': 2024
};

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

async function fetchVotesForPoliticianConcurrently(politician: Politician, sessions: string[], outputDir: string): Promise<{ files: number; votes: number }> {
  console.log(`  Processing ${politician.name} (ID: ${politician.id}) - ${sessions.length} sessions concurrently...`);
  
  // Process sessions in batches of 10
  const batchSize = 10;
  let totalFiles = 0;
  let totalVotes = 0;
  
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    console.log(`    Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessions.length / batchSize)}: Processing sessions ${batch.join(', ')}`);
    
    // Create promises for concurrent execution
    const batchPromises = batch.map(async (session) => {
      const year = sessionToYear[session];
      
      try {
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
          source: `Swedish Riksdag API - Individual votes for ${politician.name} in ${session}`
        };
        
        // Create filename: politician-name-year.json
        const charMap: Record<string, string> = { 'å': 'a', 'ä': 'a', 'ö': 'o' };
        const safeFileName = politician.name
          .toLowerCase()
          .replace(/[åäö]/g, (match: string) => charMap[match] || match)
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const fileName = `${safeFileName}-${year}.json`;
        const filePath = path.join(outputDir, fileName);
        
        // Save the file
        fs.writeFileSync(filePath, JSON.stringify(voteData, null, 2));
        
        return {
          session,
          year,
          votes: votes.length,
          fileName,
          success: true
        };
      } catch (error) {
        console.error(`      Error processing ${session} for ${politician.name}:`, error);
        return {
          session,
          year,
          votes: 0,
          fileName: '',
          success: false
        };
      }
    });
    
    // Wait for all promises in this batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    for (const result of batchResults) {
      if (result.success) {
        totalFiles++;
        totalVotes += result.votes;
        console.log(`      ✅ ${result.session} (${result.year}): ${result.votes} votes → ${result.fileName}`);
      } else {
        console.log(`      ❌ ${result.session} (${result.year}): Failed`);
      }
    }
    
    // Small delay between batches to avoid overwhelming the server
    if (i + batchSize < sessions.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return { files: totalFiles, votes: totalVotes };
}

function getParliamentarySessions(): string[] {
  return [
    '2016/17', '2017/18', '2018/19', '2019/20', // 2016-2020 election period
    '2020/21', '2021/22', '2022/23', '2023/24', // 2020-2024 election period
    '2024/25' // Current session
  ];
}

async function fetchAllVotes() {
  try {
    console.log('🗳️  Starting comprehensive vote extraction with concurrent processing...');
    console.log('📋 This will fetch individual votes for each politician across all parliamentary sessions');
    console.log('⚡ Processing 10 sessions concurrently per politician for better performance');
    
    // Load politicians
    console.log('\nReading politicians.json...');
    const politiciansData = JSON.parse(fs.readFileSync('../knowledge-base/documents/voting/politicians.json', 'utf8'));
    console.log(`Found ${politiciansData.politicians.length} politicians`);
    
    // Get parliamentary sessions
    const sessions = getParliamentarySessions();
    console.log(`Processing ${sessions.length} parliamentary sessions: ${sessions.join(', ')}`);
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/by-politician-year';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`\n🚀 Processing ${politiciansData.politicians.length} politicians across ${sessions.length} sessions`);
    console.log(`📊 Expected total files: ${politiciansData.politicians.length * sessions.length}`);
    
    let totalFiles = 0;
    let processedPoliticians = 0;
    let totalVotesExtracted = 0;
    const startTime = Date.now();
    
    // Process each politician with concurrent session processing
    for (const politician of politiciansData.politicians) {
      processedPoliticians++;
      const politicianStartTime = Date.now();
      
      console.log(`\n[${processedPoliticians}/${politiciansData.politicians.length}] Processing: ${politician.name}`);
      
      if (!politician.id || !politician.name) {
        console.log(`  ❌ Skipping invalid politician entry`);
        continue;
      }
      
      // Process all sessions for this politician concurrently (in batches of 4)
      const result = await fetchVotesForPoliticianConcurrently(politician, sessions, outputDir);
      
      totalFiles += result.files;
      totalVotesExtracted += result.votes;
      
      const politicianTime = ((Date.now() - politicianStartTime) / 1000).toFixed(1);
      console.log(`  ✅ Completed ${politician.name}: ${result.files} files, ${result.votes} votes (${politicianTime}s)`);
      
      // Progress update every 10 politicians
      if (processedPoliticians % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const avgTimePerPolitician = (Date.now() - startTime) / processedPoliticians / 1000;
        const estimatedTotal = (avgTimePerPolitician * politiciansData.politicians.length / 60).toFixed(1);
        console.log(`\n📊 Progress: ${processedPoliticians}/${politiciansData.politicians.length} politicians (${elapsed}min elapsed, ~${estimatedTotal}min total estimated)`);
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n🎉 Completed! Created ${totalFiles} vote files with ${totalVotesExtracted} total votes in ${totalTime} minutes`);
    
    // Create a summary file
    const summary = {
      description: 'Summary of comprehensive voting data extraction with concurrent processing',
      extractedAt: new Date().toISOString(),
      totalPoliticians: politiciansData.politicians.length,
      sessionsProcessed: sessions,
      totalFilesCreated: totalFiles,
      totalVotesExtracted: totalVotesExtracted,
      processingTimeMinutes: parseFloat(totalTime),
             concurrencyLevel: '10 sessions per politician',
      outputDirectory: outputDir,
      fileNamingPattern: 'politician-name-year.json',
             methodology: 'Fetched individual votes using gruppering=votering_id with politician ID and parliamentary session, processed 10 sessions concurrently per politician'
    };
    
    fs.writeFileSync(path.join(outputDir, '_summary.json'), JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${outputDir}/_summary.json`);
    
  } catch (error) {
    console.error('❌ Error in fetchAllVotes:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🗳️  Starting comprehensive vote extraction process with concurrent processing...');
  console.log('📋 This will fetch individual votes for each politician for each parliamentary session');
      console.log('⚡ Processing 10 sessions concurrently per politician for better performance');
  
  fetchAllVotes().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { fetchAllVotes }; 