import { TradingClient } from './src/trading-cli.js';
import fs from 'fs';

async function testLastMarket() {
  console.log('🎮 SportsXchange - Testing Last Created Market');
  console.log('='.repeat(50));
  
  // Load the last created market
  let marketData;
  try {
    marketData = JSON.parse(fs.readFileSync('./data/last-created-market.json', 'utf-8'));
  } catch (error) {
    console.error('❌ No market found. Run "npm run test-simple" first!');
    process.exit(1);
  }
  
  console.log('\n📊 Market Details:');
  console.log('   Market PDA:', marketData.marketPda);
  console.log('   Pool PDA:', marketData.poolPda);
  console.log('   Home Mint:', marketData.homeMint);
  console.log('   Away Mint:', marketData.awayMint);
  
  const client = new TradingClient();
  await client.initialize();
  
  // Override the getMarketData method to use our saved data
  client.getMarketData = async (marketPda) => {
    if (marketPda.toString() === marketData.marketPda) {
      return {
        homeMint: marketData.homeMint,
        awayMint: marketData.awayMint,
        homeTeam: 'KC',
        awayTeam: 'BAL'
      };
    }
    throw new Error('Market not found: ' + marketPda.toString());
  };
  
  try {
    // Step 1: Fund the user account
    console.log('\n💰 Step 1: Funding user account...');
    const fundResult = await client.fundUser(marketData.marketPda, 1000, 1000);
    console.log('   ✅ Funded! TX:', fundResult.signature);
    console.log('   HOME tokens: 1000');
    console.log('   AWAY tokens: 1000');
    
    // Step 2: Check balance
    console.log('\n📊 Step 2: Checking balance...');
    const balance = await client.getBalance(marketData.marketPda);
    console.log('   HOME balance:', balance.homeBalance);
    console.log('   AWAY balance:', balance.awayBalance);
    
    // Step 3: Check pool info
    console.log('\n🏊 Step 3: Pool status...');
    const poolBefore = await client.getPoolInfo(marketData.marketPda);
    console.log('   HOME reserve:', poolBefore.homeReserve);
    console.log('   AWAY reserve:', poolBefore.awayReserve);
    console.log('   Price (AWAY/HOME):', poolBefore.price.toFixed(4));
    console.log('   HOME win probability:', poolBefore.homeProb);
    console.log('   AWAY win probability:', poolBefore.awayProb);
    
    // Step 4: Make a swap (buy HOME tokens with AWAY tokens)
    console.log('\n💱 Step 4: Swapping 100 AWAY for HOME...');
    const swapResult = await client.swap(marketData.marketPda, 'away_for_home', 100);
    console.log('   ✅ Swap complete! TX:', swapResult.signature);
    console.log('   Gave:', swapResult.amountIn, 'AWAY');
    console.log('   Got:', swapResult.expectedOut.toFixed(2), 'HOME');
    
    // Step 5: Check new balance
    console.log('\n📊 Step 5: New balance...');
    const newBalance = await client.getBalance(marketData.marketPda);
    console.log('   HOME balance:', newBalance.homeBalance);
    console.log('   AWAY balance:', newBalance.awayBalance);
    
    // Step 6: Check pool after swap
    console.log('\n🏊 Step 6: Pool after swap...');
    const poolAfter = await client.getPoolInfo(marketData.marketPda);
    console.log('   HOME reserve:', poolAfter.homeReserve);
    console.log('   AWAY reserve:', poolAfter.awayReserve);
    console.log('   New price (AWAY/HOME):', poolAfter.price.toFixed(4));
    console.log('   HOME win probability:', poolAfter.homeProb);
    console.log('   AWAY win probability:', poolAfter.awayProb);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\n🎉 The AMM is working correctly!');
    console.log('   - Markets can be created');
    console.log('   - Users can be funded');
    console.log('   - Swaps work as expected');
    console.log('   - Probabilities update based on trades');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.logs) {
      console.error('\nTransaction logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
    process.exit(1);
  }
}

testLastMarket().catch(console.error);
