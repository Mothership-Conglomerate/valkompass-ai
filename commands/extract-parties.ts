#!/usr/bin/env node

import fs from 'fs';

async function extractParties() {
  try {
    console.log('Reading politicians.json...');
    const politiciansData = JSON.parse(fs.readFileSync('../knowledge-base/documents/voting/politicians.json', 'utf8'));
    
    const partyInitials = new Set<string>();
    
    // Extract party initials from politician names and normalize case
    const partyInitialsRaw = new Set<string>();
    
    for (const politician of politiciansData.politicians) {
      // Extract party from format: "LastName, FirstName (PARTY)"
      const partyMatch = politician.match(/\(([^)]+)\)$/);
      if (partyMatch) {
        const party = partyMatch[1].trim();
        partyInitialsRaw.add(party);
      }
    }
    
    console.log(`Found ${partyInitialsRaw.size} raw party initials (before case normalization):`);
    Array.from(partyInitialsRaw).sort().forEach((party, index) => {
      console.log(`${index + 1}. ${party}`);
    });
    
    // Normalize case and aggregate parties
    const normalizedParties = new Map<string, string>();
    
    // Map party initials to full names (using uppercase as canonical form)
    const partyMapping: Record<string, string> = {
      'S': 'Socialdemokraterna',
      'M': 'Moderaterna', 
      'SD': 'Sverigedemokraterna',
      'C': 'Centerpartiet',
      'V': 'Vänsterpartiet',
      'KD': 'Kristdemokraterna',
      'L': 'Liberalerna',
      'MP': 'Miljöpartiet de gröna',
      'FP': 'Folkpartiet liberalerna', // Historical name for Liberalerna
      '-': 'Partilös',
      'NY': 'Ny demokrati',
      'KDS': 'Kristdemokratiska samhällspartiet'
    };
    
    // Process each raw party initial
    for (const rawParty of partyInitialsRaw) {
      const normalizedKey = rawParty.toUpperCase();
      
      if (partyMapping[normalizedKey]) {
        normalizedParties.set(normalizedKey, partyMapping[normalizedKey]);
      } else {
        // For unknown parties, use the normalized key
        normalizedParties.set(normalizedKey, normalizedKey);
        console.log(`⚠️  Unknown party initial: ${rawParty} (normalized to ${normalizedKey}) - please add mapping`);
      }
    }
    
    console.log(`\nAfter case normalization, found ${normalizedParties.size} unique parties:`);
    Array.from(normalizedParties.keys()).sort().forEach((party, index) => {
      console.log(`${index + 1}. ${party} → ${normalizedParties.get(party)}`);
    });
    
    // Create the parties object
    const parties: Record<string, string> = {};
    for (const [key, value] of normalizedParties) {
      parties[key] = value;
    }
    
    const outputData = {
      description: 'Swedish political parties mapping from initials to full names',
      extractedAt: new Date().toISOString(),
      totalParties: Object.keys(parties).length,
      source: 'Extracted from politicians.json',
      parties: parties
    };
    
    // Save to file
    fs.writeFileSync('../knowledge-base/documents/voting/parties.json', JSON.stringify(outputData, null, 2));
    console.log(`\nSaved ${Object.keys(parties).length} parties to knowledge-base/documents/voting/parties.json`);
    
    return parties;
    
  } catch (error) {
    console.error('Error extracting parties:', error);
    return {};
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  extractParties().then(parties => {
    if (Object.keys(parties).length === 0) {
      console.log('No parties found. Please check the extraction logic.');
      process.exit(1);
    } else {
      console.log(`\nSuccessfully extracted ${Object.keys(parties).length} parties!`);
    }
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { extractParties }; 