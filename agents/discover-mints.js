#!/usr/bin/env node
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function discoverMints() {
  console.log('\n' + '='.repeat(60));
  console.log('DISCOVERING MARKET MINTS FROM BLOCKCHAIN');
  console.log('='.repeat(60) + '\n');

  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const programId = new PublicKey(process.env.PROGRAM_ID);
  
  // Load state
  const statePath = path.join(__dirname, 'data/agent-state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  const updatedMarkets = [];
  
  for (const market of state.activeMarkets) {
    console.log(`\nChecking ${market.gameId}...`);
    console.log(`Market PDA: ${market.marketPda}`);
    
    try {
      const marketPubkey = new PublicKey(market.marketPda);
      const accountInfo = await connection.getAccountInfo(marketPubkey);
      
      if (accountInfo && accountInfo.data) {
        // Parse market account data
        // Structure: discriminator(8) + authority(32) + game_id_len(4) + game_id(50) + home_team_len(4) + home_team(20) + away_team_len(4) + away_team(20) + home_mint(32) + away_mint(32)
        const data = accountInfo.data;
        
        // Skip to mints
        let offset = 8; // discriminator
        offset += 32; // authority
        
        // Read game_id length and skip
        const gameIdLen = data.readUInt32LE(offset);
        offset += 4 + gameIdLen;
        
        // Read home_team length and skip
        const homeTeamLen = data.readUInt32LE(offset);
        offset += 4 + homeTeamLen;
        
        // Read away_team length and skip
        const awayTeamLen = data.readUInt32LE(offset);
        offset += 4 + awayTeamLen;
        
        // Read home_mint (32 bytes)
        const homeMintBytes = data.slice(offset, offset + 32);
        const homeMint = new PublicKey(homeMintBytes).toString();
        offset += 32;
        
        // Read away_mint (32 bytes)
        const awayMintBytes = data.slice(offset, offset + 32);
        const awayMint = new PublicKey(awayMintBytes).toString();
        
        console.log(`✅ Found mints:`);
        console.log(`   Home Mint: ${homeMint}`);
        console.log(`   Away Mint: ${awayMint}`);
        
        updatedMarkets.push({
          ...market,
          homeMint,
          awayMint
        });
      } else {
        console.log('❌ Could not fetch market account');
        updatedMarkets.push(market);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      updatedMarkets.push(market);
    }
  }
  
  // Update the state file with mints
  state.activeMarkets = updatedMarkets;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Updated agent-state.json with mint addresses');
  console.log('='.repeat(60) + '\n');
  
  // Also generate the mapping for trading-cli.js
  console.log('Copy this mapping to trading-cli.js:\n');
  console.log('const marketMints = {');
  for (const market of updatedMarkets) {
    if (market.homeMint && market.awayMint) {
      const teams = market.gameId.split('-').slice(-2);
      console.log(`  '${market.marketPda}': {`);
      console.log(`    homeMint: '${market.homeMint}',`);
      console.log(`    awayMint: '${market.awayMint}',`);
      console.log(`    homeTeam: '${teams[0]}',`);
      console.log(`    awayTeam: '${teams[1]}'`);
      console.log(`  },`);
    }
  }
  console.log('};');
}

discoverMints().catch(console.error);
