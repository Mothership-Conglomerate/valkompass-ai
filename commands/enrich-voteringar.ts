#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Interfaces for the data structures
interface Votering {
  votering_id: string;
  Ja: string;
  Nej: string;
  Frånvarande: string;
  Avstår: string;
}

interface VoteringarData {
  year: number;
  totalVoteringar: number;
  voteringar: Votering[];
}

interface EnrichedVotering extends Votering {
  titel?: string;
  beslut_i_korthet?: string;
  enrichment_error?: string;
}

interface EnrichedVoteringarData {
  year: number;
  totalVoteringar: number;
  voteringar: EnrichedVotering[];
}

// Function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Function to strip HTML tags and clean text
function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')    // Replace multiple whitespace with single space
    .trim();
}

// Function to fetch votering metadata
async function fetchVoteringMetadata(voteringId: string): Promise<{ titel?: string; beslut_i_korthet?: string; error?: string }> {
  try {
    console.log(`  📡 Fetching metadata for votering: ${voteringId}`);
    
    // Fetch votering metadata
    const voteringUrl = `https://data.riksdagen.se/votering/${voteringId}`;
    const voteringResponse = await fetch(voteringUrl);
    
    if (!voteringResponse.ok) {
      throw new Error(`HTTP error fetching votering! status: ${voteringResponse.status}`);
    }
    
    const voteringData = await voteringResponse.text();
    
    // Extract title and document URL
    const titleMatch = voteringData.match(/<titel[^>]*>([^<]+)<\/titel>/i);
    const documentUrlMatch = voteringData.match(/<dokument_url_text[^>]*>([^<]+)<\/dokument_url_text>/i);
    
    const titel = titleMatch ? titleMatch[1].trim() : undefined;
    let beslut_i_korthet: string | undefined;
    
    // If we have a document URL, fetch the "Beslut i korthet" text
    if (documentUrlMatch) {
      try {
        console.log(`    📄 Fetching document text from: ${documentUrlMatch[1]}`);
        const documentResponse = await fetch(documentUrlMatch[1]);
        
        if (documentResponse.ok) {
          const documentData = await documentResponse.text();
          
          // Extract "Beslut i korthet" text
          const beslutMatch = documentData.match(/<uppgift[^>]*>[\s\S]*?<namn[^>]*>Beslut i korthet<\/namn>[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>[\s\S]*?<\/uppgift>/i);
          
          if (beslutMatch) {
            const rawText = beslutMatch[1].trim();
            const decodedText = decodeHtmlEntities(rawText);
            beslut_i_korthet = stripHtmlTags(decodedText);
            console.log(`    ✅ Found "Beslut i korthet" (${beslut_i_korthet.length} chars)`);
          } else {
            console.log(`    ⚠️  "Beslut i korthet" not found in document`);
          }
        } else {
          console.log(`    ⚠️  Failed to fetch document text: ${documentResponse.status}`);
        }
      } catch (docError) {
        console.log(`    ⚠️  Error fetching document: ${docError}`);
      }
    }
    
    return { titel, beslut_i_korthet };
    
  } catch (error) {
    console.log(`    ❌ Error fetching metadata: ${error}`);
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// Function to enrich voteringar for a specific year
async function enrichVoteringarForYear(year: string): Promise<void> {
  const inputFile = `../knowledge-base/documents/voting/voteringar-by-year/voteringar-${year}.json`;
  
  console.log(`\n🔄 Processing year: ${year}`);
  console.log(`📂 Input/Output: ${inputFile}`);
  
  if (!existsSync(inputFile)) {
    console.log(`❌ Input file not found: ${inputFile}`);
    return;
  }
  
  try {
    // Load existing voteringar data
    const rawData = readFileSync(inputFile, 'utf-8');
    const voteringarData: VoteringarData = JSON.parse(rawData);
    
    console.log(`📊 Found ${voteringarData.voteringar.length} voteringar for year ${year}`);
    
    // Create enriched data structure
    const enrichedData: EnrichedVoteringarData = {
      year: voteringarData.year,
      totalVoteringar: voteringarData.totalVoteringar,
      voteringar: []
    };
    
    // Process voteringar in batches to avoid overwhelming the API
    const batchSize = 5;
    const totalBatches = Math.ceil(voteringarData.voteringar.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, voteringarData.voteringar.length);
      const batch = voteringarData.voteringar.slice(startIndex, endIndex);
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (voteringar ${startIndex + 1}-${endIndex})`);
      
      // Process batch concurrently
      const enrichmentPromises = batch.map(async (votering) => {
        const metadata = await fetchVoteringMetadata(votering.votering_id);
        
        const enrichedVotering: EnrichedVotering = {
          ...votering,
          titel: metadata.titel,
          beslut_i_korthet: metadata.beslut_i_korthet,
          enrichment_error: metadata.error
        };
        
        return enrichedVotering;
      });
      
      const enrichedBatch = await Promise.all(enrichmentPromises);
      enrichedData.voteringar.push(...enrichedBatch);
    }
    
    // Save enriched data (replace original file)
    writeFileSync(inputFile, JSON.stringify(enrichedData, null, 2));
    
    // Summary
    const withTitle = enrichedData.voteringar.filter(v => v.titel).length;
    const withBeslut = enrichedData.voteringar.filter(v => v.beslut_i_korthet).length;
    const withErrors = enrichedData.voteringar.filter(v => v.enrichment_error).length;
    
    console.log(`\n✅ Enrichment complete for year ${year}:`);
    console.log(`📊 Total voteringar: ${enrichedData.voteringar.length}`);
    console.log(`📝 With title: ${withTitle}`);
    console.log(`📄 With "Beslut i korthet": ${withBeslut}`);
    console.log(`❌ With errors: ${withErrors}`);
    console.log(`💾 File updated: ${inputFile}`);
    
  } catch (error) {
    console.error(`❌ Error processing year ${year}:`, error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Define all available years in chronological order
  const allYears = [
    '2016-17',
    '2017-18', 
    '2018-19',
    '2019-20',
    '2020-21',
    '2021-22',
    '2022-23',
    '2023-24',
    '2024-25'
  ];
  
  let yearsToProcess: string[];
  
  if (args.length === 0) {
    console.log('🔄 No specific years provided - processing ALL years');
    console.log(`📊 This will process ${allYears.length} years with approximately 6,456 total voteringar`);
    console.log('⚠️  This operation will take significant time and make many API requests');
    console.log('⚠️  Original files will be overwritten with enriched data');
    yearsToProcess = allYears;
  } else {
    yearsToProcess = args;
  }
  
  console.log('🚀 Starting voteringar enrichment...');
  console.log(`📅 Years to process: ${yearsToProcess.join(', ')}`);
  
  for (const year of yearsToProcess) {
    await enrichVoteringarForYear(year);
  }
  
  console.log('\n🎉 All enrichment tasks completed!');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  console.log('\n📖 Usage:');
  console.log('  bunx tsx enrich-voteringar.ts                    # Process all years (2016-17 to 2024-25)');
  console.log('  bunx tsx enrich-voteringar.ts 2023-24           # Process specific year');
  console.log('  bunx tsx enrich-voteringar.ts 2022-23 2023-24   # Process multiple years');
  process.exit(1);
}); 