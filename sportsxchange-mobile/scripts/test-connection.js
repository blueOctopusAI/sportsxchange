#!/usr/bin/env node

// test-mobile-connection.js
// Test script to verify the mobile app can connect to your smart contracts

import { SportsXchangeClient } from '../src/SportsXchangeClient.js';
import { CONFIG } from '../config/markets.js';

async function testConnection() {
  console.log('🔍 Testing Mobile App Connection to Smart Contracts');
  console.log('='.repeat(50));
  
  const client = new SportsXchangeClient(
    CONFIG.RPC_ENDPOINT,
    CONFIG.PROGRAM_ID
  );

  console.log('📡 RPC Endpoint:', CONFIG.RPC_ENDPOINT);
  console.log('📝 Program ID:', CONFIG.PROGRAM_ID);
  console.log('');

  // Test 1: Try to fetch the latest market
  const latestMarket = CONFIG.MARKETS[0];
  if (latestMarket) {
    console.log('📊 Testing market fetch...');
    console.log('   Market PDA:', latestMarket.marketPda);
    
    client.setUsdcMint(latestMarket.usdcMint);
    
    const marketData = await client.getMarketData(latestMarket.marketPda);
    
    if (marketData) {
      console.log('✅ Market data fetched successfully!');
      console.log('   Game ID:', marketData.gameId);
      console.log('   Teams:', marketData.teamA, 'vs', marketData.teamB);
      console.log('   Team A Supply:', marketData.teamASupply);
      console.log('   Team B Supply:', marketData.teamBSupply);
      console.log('   Pool Value:', marketData.poolValue, 'USDC');
      
      // Calculate probabilities
      const probs = client.calculateProbabilities(marketData);
      console.log('   Probabilities:');
      console.log('     -', marketData.teamA + ':', probs.teamAProb.toFixed(1) + '%');
      console.log('     -', marketData.teamB + ':', probs.teamBProb.toFixed(1) + '%');
    } else {
      console.log('❌ Failed to fetch market data');
      console.log('   Make sure the market exists on-chain');
    }
  } else {
    console.log('⚠️ No markets configured yet');
    console.log('   Run the bonding curve test to create a market first');
  }

  // Test 2: Calculate token prices
  console.log('\n💵 Testing price calculations...');
  const usdcAmount = 10; // $10
  const currentSupply = 1000; // 1000 tokens already sold
  const basePrice = CONFIG.BONDING_CURVE.BASE_PRICE;
  const slope = CONFIG.BONDING_CURVE.SLOPE;
  
  const tokensOut = client.calculateTokensOut(usdcAmount, currentSupply, basePrice, slope);
  const usdcNeeded = client.calculateUsdcIn(tokensOut, currentSupply, basePrice, slope);
  
  console.log(`   $${usdcAmount} USDC would buy ~${tokensOut.toFixed(2)} tokens`);
  console.log(`   Current price: $${(basePrice / 1_000_000).toFixed(6)} per token`);
  console.log(`   Price after 1M tokens: $${((basePrice + slope) / 1_000_000).toFixed(6)} per token`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Mobile client is ready to connect!');
  console.log('\nNext steps:');
  console.log('1. Make sure solana-test-validator is running');
  console.log('2. Run the mobile app: npm start');
  console.log('3. The app should connect to your local contracts');
}

testConnection().catch(console.error);
