#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';

// Same interfaces as the main script
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
    console.log(`📡 Fetching metadata for votering: ${voteringId}`);
    
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
    
    console.log(`  📝 Title: ${titel || 'Not found'}`);
    console.log(`  🔗 Document URL: ${documentUrlMatch ? documentUrlMatch[1] : 'Not found'}`);
    
    // If we have a document URL, fetch the "Beslut i korthet" text
    if (documentUrlMatch) {
      try {
        console.log(`  📄 Fetching document text...`);
        const documentResponse = await fetch(documentUrlMatch[1]);
        
        if (documentResponse.ok) {
          const documentData = await documentResponse.text();
          
          // Extract "Beslut i korthet" text
          const beslutMatch = documentData.match(/<uppgift[^>]*>[\s\S]*?<namn[^>]*>Beslut i korthet<\/namn>[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>[\s\S]*?<\/uppgift>/i);
          
          if (beslutMatch) {
            const rawText = beslutMatch[1].trim();
            const decodedText = decodeHtmlEntities(rawText);
            beslut_i_korthet = stripHtmlTags(decodedText);
            console.log(`  ✅ Found "Beslut i korthet" (${beslut_i_korthet.length} chars)`);
            console.log(`  📄 Preview: ${beslut_i_korthet.substring(0, 200)}...`);
          } else {
            console.log(`  ⚠️  "Beslut i korthet" not found in document`);
          }
        } else {
          console.log(`  ⚠️  Failed to fetch document text: ${documentResponse.status}`);
        }
      } catch (docError) {
        console.log(`  ⚠️  Error fetching document: ${docError}`);
      }
    }
    
    return { titel, beslut_i_korthet };
    
  } catch (error) {
    console.log(`  ❌ Error fetching metadata: ${error}`);
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// Test function
async function testEnrichment() {
  const inputFile = `../knowledge-base/documents/voting/voteringar-by-year/voteringar-2023-24.json`;
  
  console.log('🧪 Testing voteringar enrichment (replacement mode)...');
  console.log(`📂 File to be replaced: ${inputFile}`);
  console.log(`⚠️  Note: This is a test - no files will be modified`);
  
  if (!existsSync(inputFile)) {
    console.log(`❌ Input file not found: ${inputFile}`);
    return;
  }
  
  try {
    // Load existing voteringar data
    const rawData = readFileSync(inputFile, 'utf-8');
    const voteringarData: VoteringarData = JSON.parse(rawData);
    
    console.log(`📊 Found ${voteringarData.voteringar.length} voteringar for 2023-24`);
    console.log(`🧪 Testing with first 3 voteringar...\n`);
    
    // Test with first 3 voteringar
    const testVoteringar = voteringarData.voteringar.slice(0, 3);
    
    for (let i = 0; i < testVoteringar.length; i++) {
      const votering = testVoteringar[i];
      console.log(`\n--- Test ${i + 1}/3 ---`);
      console.log(`Votering ID: ${votering.votering_id}`);
      
      const metadata = await fetchVoteringMetadata(votering.votering_id);
      
      const enrichedVotering: EnrichedVotering = {
        ...votering,
        titel: metadata.titel,
        beslut_i_korthet: metadata.beslut_i_korthet,
        enrichment_error: metadata.error
      };
      
      console.log(`\n📋 Enriched result:`);
      console.log(JSON.stringify(enrichedVotering, null, 2));
    }
    
    console.log(`\n✅ Test completed successfully!`);
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
  }
}

// Run the test
testEnrichment().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
}); 