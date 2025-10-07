#!/usr/bin/env node
import { TradingClient } from './src/trading-cli.js';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTrading() {
  console.log('\n' + '='.repeat(60));
  console.log('TRADING DEBUG TEST');
  console.log('='.repeat(60) + '\n');

  const client = new TradingClient();
  await client.initialize();
  
  // Load agent state to get active markets
  const statePath = path.join(__dirname, 'data/agent-state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  if (state.activeMarkets.length === 0) {
    console.log('❌ No active markets found!');
    console.log('Please create some markets first using:');
    console.log('  npm run test-simple');
    process.exit(1);
  }
  
  // Test with the first market
  const market = state.activeMarkets[0];
  const marketPda = market.marketPda;
  const teams = market.gameId.split('-').slice(-2);
  
  console.log('📊 Testing with Market:', teams[0], 'vs', teams[1]);
  console.log('   Market Address:', marketPda);
  console.log('');
  
  try {
    // Step 1: Check initial balance
    console.log('Step 1: Checking initial balance...');
    const initialBalance = await client.getBalance(marketPda);
    console.log('✅ Initial Balance:');
    console.log('   HOME:', initialBalance.homeBalance);
    console.log('   AWAY:', initialBalance.awayBalance);
    console.log('');
    
    // Step 2: Get pool info
    console.log('Step 2: Getting pool info...');
    const poolInfo = await client.getPoolInfo(marketPda);
    console.log('✅ Pool Info:');
    console.log('   HOME Reserve:', poolInfo.homeReserve);
    console.log('   AWAY Reserve:', poolInfo.awayReserve);
    console.log('   HOME Probability:', poolInfo.homeProb);
    console.log('   AWAY Probability:', poolInfo.awayProb);
    console.log('');
    
    // Step 3: Fund account if needed
    if (initialBalance.homeBalance === 0 && initialBalance.awayBalance === 0) {
      console.log('Step 3: Funding account with test tokens...');
      console.log('   HOME: 100 tokens');
      console.log('   AWAY: 100 tokens');
      
      try {
        const fundResult = await client.fundUser(marketPda, 100, 100);
        console.log('✅ Funding successful!');
        console.log('   Transaction:', fundResult.signature.slice(0, 20) + '...');
      } catch (error) {
        console.error('❌ Funding failed:', error.message);
        console.log('\nDEBUG INFO:');
        console.log('Error code:', error.logs ? error.logs.join('\n') : 'No logs');
        throw error;
      }
      
      // Check balance after funding
      const fundedBalance = await client.getBalance(marketPda);
      console.log('   New HOME Balance:', fundedBalance.homeBalance);
      console.log('   New AWAY Balance:', fundedBalance.awayBalance);
      console.log('');
    } else {
      console.log('Step 3: Account already funded, skipping...');
      console.log('');
    }
    
    // Step 4: Test a small swap
    console.log('Step 4: Testing swap (buying HOME with 10 AWAY)...');
    try {
      const swapResult = await client.swap(marketPda, 'away_for_home', 10);
      console.log('✅ Swap successful!');
      console.log('   Transaction:', swapResult.signature.slice(0, 20) + '...');
      console.log('   Amount In:', swapResult.amountIn);
      console.log('   Expected Out:', swapResult.expectedOut);
      console.log('');
      
      // Check balance after swap
      const swappedBalance = await client.getBalance(marketPda);
      console.log('   Updated Balance:');
      console.log('   HOME:', swappedBalance.homeBalance);
      console.log('   AWAY:', swappedBalance.awayBalance);
    } catch (error) {
      console.error('❌ Swap failed:', error.message);
      console.log('\nDEBUG INFO:');
      console.log('Error code:', error.logs ? error.logs.join('\n') : 'No logs');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.log('\nFull error details:');
    console.log(JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

// Run the test
testTrading().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
