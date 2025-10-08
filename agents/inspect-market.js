import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function inspectMarketState() {
  console.log('🔍 Inspecting Market State vs Vault Balance');
  console.log('='.repeat(50));

  // Load market
  const market = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
  console.log('Market PDA:', market.marketPda);
  
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const marketPda = new PublicKey(market.marketPda);
  const usdcVault = new PublicKey(market.usdcVault);

  // Get market account data
  const marketAccountInfo = await connection.getAccountInfo(marketPda);
  if (marketAccountInfo) {
    const data = marketAccountInfo.data;
    let offset = 8 + 32 + 4; // Skip discriminator, authority, and string length
    
    // Skip game_id string
    const gameIdLen = data.readUInt32LE(offset - 4);
    offset += gameIdLen;
    
    // Skip team strings
    const teamALen = data.readUInt32LE(offset);
    offset += 4 + teamALen;
    const teamBLen = data.readUInt32LE(offset);
    offset += 4 + teamBLen;
    
    // Skip mints and vault (32 bytes each)
    offset += 32 * 3;
    
    // Read bonding curve parameters
    const basePrice = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const slope = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // Read current supplies
    const teamASupply = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const teamBSupply = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // Read pool_value
    const poolValue = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // Read flags
    const tradingHalted = data.readUInt8(offset) === 1;
    offset += 1;
    const isResolved = data.readUInt8(offset) === 1;
    
    console.log('\n📊 Market State:');
    console.log('   Base price:', basePrice / 1_000_000, 'USDC');
    console.log('   Slope:', slope);
    console.log('   Team A supply:', teamASupply / 1_000_000, 'tokens');
    console.log('   Team B supply:', teamBSupply / 1_000_000, 'tokens');
    console.log('   Pool value:', poolValue / 1_000_000, 'USDC');
    console.log('   Trading halted:', tradingHalted);
    console.log('   Is resolved:', isResolved);
    
    // Get actual vault balance
    try {
      const vaultAccount = await getAccount(connection, usdcVault);
      const vaultBalance = Number(vaultAccount.amount) / 1_000_000;
      
      console.log('\n💰 Actual Vault:');
      console.log('   Vault balance:', vaultBalance, 'USDC');
      console.log('   Pool value:', poolValue / 1_000_000, 'USDC');
      
      if (vaultBalance !== poolValue / 1_000_000) {
        console.log('\n⚠️  MISMATCH DETECTED!');
        console.log('   Vault has', vaultBalance, 'USDC');
        console.log('   But pool_value says', poolValue / 1_000_000, 'USDC');
        console.log('   Difference:', vaultBalance - poolValue / 1_000_000, 'USDC');
        
        console.log('\n🔧 This explains the InsufficientPoolBalance error!');
        console.log('   The sell instruction checks pool_value, not vault balance.');
        console.log('   The pool_value field is out of sync with reality.');
      } else {
        console.log('\n✅ Vault and pool_value match!');
      }
      
      // Calculate expected USDC for selling tokens
      const tokensToSell = 50;
      const currentSupply = teamASupply / 1_000_000;
      const avgPrice = (basePrice + (slope * (currentSupply - tokensToSell/2) / 1_000_000)) / 1_000_000;
      const expectedUsdc = tokensToSell * avgPrice;
      
      console.log('\n📈 If you sell 50 Team A tokens:');
      console.log('   Expected USDC:', expectedUsdc.toFixed(2));
      console.log('   Pool value has:', poolValue / 1_000_000, 'USDC');
      console.log('   Can sell?', expectedUsdc <= poolValue / 1_000_000 ? '✅ Yes' : '❌ No');
      
    } catch (e) {
      console.error('   Could not check vault balance:', e.message);
    }
  }
}

inspectMarketState().catch(console.error);
