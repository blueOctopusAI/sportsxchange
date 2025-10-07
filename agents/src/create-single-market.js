import { SolanaClient } from '../lib/solana-client.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function createSingleMarket() {
  console.log('🚀 SportsXchange - Create Single Market Test');
  console.log('='.repeat(50));

  const client = new SolanaClient();
  await client.initialize();

  // Test game data
  const gameId = "2024-WEEK10-TEST-" + Date.now();
  const homeTeam = "KC";
  const awayTeam = "BAL";

  console.log('\n📋 Game Details:');
  console.log('   Game ID:', gameId);
  console.log('   Home Team:', homeTeam);
  console.log('   Away Team:', awayTeam);

  try {
    // Step 1: Create market
    console.log('\n[Step 1/2] Creating market...');
    const marketResult = await client.createMarket(gameId, homeTeam, awayTeam);

    // Step 2: Initialize pool
    console.log('\n[Step 2/2] Initializing liquidity pool...');
    const poolResult = await client.initializePool(
      marketResult.marketPda,
      marketResult.homeMint,
      marketResult.awayMint
    );

    // Save results
    const results = {
      gameId,
      homeTeam,
      awayTeam,
      marketPda: marketResult.marketPda,
      poolPda: poolResult.poolPda,
      homeMint: marketResult.homeMint,
      awayMint: marketResult.awayMint,
      homeVault: poolResult.homeVault,
      awayVault: poolResult.awayVault,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(
      './data/last-created-market.json',
      JSON.stringify(results, null, 2)
    );

    console.log('\n' + '='.repeat(50));
    console.log('✅ SUCCESS! Market and pool created');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log('   Market PDA:', marketResult.marketPda);
    console.log('   Pool PDA:', poolResult.poolPda);
    console.log('   Ready for trading!');
    console.log('\n💾 Results saved to: data/last-created-market.json');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Run it
createSingleMarket().catch(console.error);
