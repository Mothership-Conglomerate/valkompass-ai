#!/usr/bin/env node

import fs from 'fs';

async function fetchPoliticians() {
  const url = 'https://data.riksdagen.se/voteringlista/';
  
  try {
    console.log('Fetching politician list from Riksdag page...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Fetched HTML page (${html.length} characters)`);
    
    // Extract the politician dropdown (select with name="iid")
    const selectMatch = html.match(/<select[^>]*name="iid"[^>]*>([\s\S]*?)<\/select>/);
    
    if (!selectMatch) {
      console.log('Could not find politician select element');
      return [];
    }
    
    console.log('Found politician select element');
    const selectContent = selectMatch[1];
    
    // Extract all option elements with both value (ID) and text (name)
    const optionMatches = selectContent.match(/<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/g);
    
    if (!optionMatches) {
      console.log('Could not find option elements');
      return [];
    }
    
    const politicians: Array<{id: string, name: string}> = [];
    
    for (const option of optionMatches) {
      const match = option.match(/<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/);
      if (match) {
        const politicianId = match[1].trim();
        const politicianName = match[2].trim();
        
        // Skip the "[Välj ledamot]" option and empty values
        if (politicianName !== '[Välj ledamot]' && politicianName.length > 0 && politicianId.length > 0) {
          politicians.push({
            id: politicianId,
            name: politicianName
          });
        }
      }
    }
    
    console.log(`\nFound ${politicians.length} politicians:`);
    politicians.slice(0, 10).forEach((politician, index) => {
      console.log(`${index + 1}. ${politician.name} (ID: ${politician.id})`);
    });
    
    if (politicians.length > 10) {
      console.log(`... and ${politicians.length - 10} more`);
    }
    
    // Save to file
    const outputData = {
      totalCount: politicians.length,
      politicians: politicians.sort((a, b) => a.name.localeCompare(b.name)),
      extractedAt: new Date().toISOString(),
      source: 'Extracted from Riksdag HTML select element'
    };
    
    fs.writeFileSync('../knowledge-base/documents/voting/politicians.json', JSON.stringify(outputData, null, 2));
    console.log(`\nSaved ${politicians.length} politicians to knowledge-base/documents/voting/politicians.json`);
    
    return politicians;
    
  } catch (error) {
    console.error('Error fetching politicians:', error);
    return [];
  }
}



// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPoliticians().then(politicians => {
    if (politicians.length === 0) {
      console.log('No politicians found. Please check the extraction logic.');
      process.exit(1);
    } else {
      console.log(`\nSuccessfully extracted ${politicians.length} politicians!`);
    }
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { fetchPoliticians }; 