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

async function fetchAllVoteringar() {
  try {
    console.log('Starting voteringar extraction...');
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/voteringar-by-year';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Parliamentary sessions to fetch (from 2016 onwards as requested)
    const sessions = [
      '2016/17', '2017/18', '2018/19', '2019/20', // 2016-2020 election period
      '2020/21', '2021/22', '2022/23', '2023/24', // 2020-2024 election period
      '2024/25' // Current session
    ];
    
    console.log(`\nFetching voteringar for ${sessions.length} parliamentary sessions`);
    
    let totalFiles = 0;
    let totalVoteringar = 0;
    
    // Process each session
    for (const session of sessions) {
      console.log(`\nProcessing session: ${session}`);
      
      const voteringar = await fetchVoteringarForSession(session);
      
      // Create the votering data object
      const voteringData: VoteringData = {
        year: parseInt(session.split('/')[0]), // Use the first year of the session
        totalVoteringar: voteringar.length,
        voteringar: voteringar.sort((a: Votering, b: Votering) => a.votering_id.localeCompare(b.votering_id)),
        extractedAt: new Date().toISOString(),
        source: `Swedish Riksdag API - Parliamentary session ${session}`
      };
      
      // Create filename: voteringar-session.json
      const fileName = `voteringar-${session.replace('/', '-')}.json`;
      const filePath = path.join(outputDir, fileName);
      
      // Save the file
      fs.writeFileSync(filePath, JSON.stringify(voteringData, null, 2));
      totalFiles++;
      totalVoteringar += voteringar.length;
      
      console.log(`  Saved ${voteringar.length} voteringar to ${fileName}`);
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n✅ Completed! Created ${totalFiles} voteringar files with ${totalVoteringar} total voting sessions`);
    
    // Create a summary file
    const summary = {
      description: 'Summary of voteringar (voting sessions) extraction',
      extractedAt: new Date().toISOString(),
      sessionsProcessed: sessions,
      totalFilesCreated: totalFiles,
      totalVoteringarExtracted: totalVoteringar,
      outputDirectory: outputDir,
      fileNamingPattern: 'voteringar-YYYY-YY.json'
    };
    
    fs.writeFileSync(path.join(outputDir, '_summary.json'), JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${outputDir}/_summary.json`);
    
  } catch (error) {
    console.error('Error in fetchAllVoteringar:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🗳️  Starting voteringar extraction process...');
  console.log('📋 This will fetch all voting sessions (not individual votes) organized by year');
  
  fetchAllVoteringar().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { fetchAllVoteringar }; 