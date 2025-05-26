#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface Politician {
  name: string;
  id: string;
}

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

// No longer needed - we'll use the politician data directly from the JSON file

async function fetchAllVotes() {
  try {
    console.log('Reading politicians.json...');
    const politiciansData = JSON.parse(fs.readFileSync('../knowledge-base/documents/voting/politicians.json', 'utf8'));
    
    // Create output directory
    const outputDir = '../knowledge-base/documents/voting/by-politician-year';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Years to fetch (from 2016 onwards as requested)
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let year = 2016; year <= currentYear; year++) {
      years.push(year);
    }
    
    console.log(`\nFetching votes for ${politiciansData.politicians.length} politicians across ${years.length} years (${years[0]}-${years[years.length - 1]})`);
    
    let totalFiles = 0;
    let processedPoliticians = 0;
    
    // Process each politician
    for (const politician of politiciansData.politicians) {
      processedPoliticians++;
      console.log(`\n[${processedPoliticians}/${politiciansData.politicians.length}] Processing: ${politician.name} (ID: ${politician.id})`);
      
      if (!politician.id || !politician.name) {
        console.log(`  Skipping invalid politician entry: ${politician}`);
        continue;
      }
      
      // Process each year for this politician
      for (const year of years) {
        const votes = await fetchVotesForPolitician(politician.id, politician.name, year);
        
        // Create the vote data object
        const voteData: VoteData = {
          politician: politician.name,
          year: year,
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
        
        const fileName = `${safeFileName}-${year}.json`;
        const filePath = path.join(outputDir, fileName);
        
        // Save the file
        fs.writeFileSync(filePath, JSON.stringify(voteData, null, 2));
        totalFiles++;
        
        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n✅ Completed! Created ${totalFiles} vote files in ${outputDir}`);
    
    // Create a summary file
    const summary = {
      description: 'Summary of voting data extraction',
      extractedAt: new Date().toISOString(),
      totalPoliticians: politiciansData.politicians.length,
      yearsProcessed: years,
      totalFilesCreated: totalFiles,
      outputDirectory: outputDir
    };
    
    fs.writeFileSync(path.join(outputDir, '_summary.json'), JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${outputDir}/_summary.json`);
    
  } catch (error) {
    console.error('Error in fetchAllVotes:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🗳️  Starting vote extraction process...');
  console.log('⚠️  Note: This will create many files and may take a long time!');
  console.log('⚠️  Note: Currently using placeholder IDs - needs real politician IDs from website');
  
  fetchAllVotes().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { fetchAllVotes }; 