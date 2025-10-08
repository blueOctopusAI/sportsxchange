import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, getAccount } from '@solana/spl-token';
import { BondingCurveClient } from './test-bonding-curve.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function setupTestEnvironment() {
  console.log('🚀 Setting Up Complete Test Environment');
  console.log('='.repeat(50));
  
  // 1. Load faucet data
  let usdcMint;
  try {
    const mintData = JSON.parse(fs.readFileSync('./data/test-usdc-mint.json', 'utf-8'));
    usdcMint = new PublicKey(mintData.mint);
    console.log('✅ Found test USDC mint:', usdcMint.toString());
  } catch {
    console.log('❌ No USDC mint found. Run usdc-faucet.js first!');
    return;
  }

  // 2. Check for existing market
  let market;
  try {
    market = JSON.parse(fs.readFileSync('./data/last-bonding-market.json', 'utf-8'));
    console.log('✅ Found existing market:', market.marketPda);
  } catch {
    console.log('⚠️  No market found. Creating a new one...');
    
    // Create a new market
    const client = new BondingCurveClient();
    await client.initialize();
    
    // Use the test USDC mint
    client.usdcMint = usdcMint;
    
    const gameId = "2024-NFL-WEEK15-" + Date.now();
    market = await client.createBondingCurveMarket(gameId, "CHIEFS", "RAVENS");
    
    // Save market with USDC mint
    market.usdcMint = usdcMint.toString();
    fs.writeFileSync('./data/last-bonding-market.json', JSON.stringify(market, null, 2));
  }

  // 3. Create mobile app config
  const mobileConfig = {
    PROGRAM_ID: process.env.PROGRAM_ID,
    RPC_URL: process.env.RPC_URL,
    USDC_MINT: usdcMint.toString(),
    TEST_WALLET: '3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk',
    MARKETS: [
      {
        marketPda: market.marketPda,
        gameId: market.gameId || 'TEST-GAME',
        teamA: 'CHIEFS',
        teamB: 'RAVENS',
        teamAMint: market.teamAMint,
        teamBMint: market.teamBMint,
        usdcVault: market.usdcVault,
        usdcMint: usdcMint.toString()
      }
    ]
  };

  // Save config for mobile app
  fs.writeFileSync(
    '../sportsxchange-mobile/config/test-env.json',
    JSON.stringify(mobileConfig, null, 2)
  );

  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST ENVIRONMENT READY!');
  console.log('='.repeat(50));
  
  console.log('\n📱 Mobile App Configuration:');
  console.log('   USDC Mint:', usdcMint.toString());
  console.log('   Market PDA:', market.marketPda);
  console.log('   Config saved to: sportsxchange-mobile/config/test-env.json');
  
  console.log('\n🎮 Next Steps:');
  console.log('   1. Get test USDC: node usdc-faucet.js');
  console.log('   2. Run mobile app: cd ../sportsxchange-mobile && npm start');
  console.log('   3. Trade on the bonding curve!');
  
  console.log('\n💡 Quick Commands:');
  console.log('   Get 1000 USDC: node usdc-faucet.js 3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk 1000');
  console.log('   Check balance: node check-bonding-balance.js');
  console.log('   Make a trade: node test-bonding-curve.js');
}

setupTestEnvironment().catch(console.error);
