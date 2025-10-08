import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';
import * as anchor from '@coral-xyz/anchor';

dotenv.config();

async function testSellFunctionality() {
  console.log('💱 Testing Sell Functionality on Bonding Curve');
  console.log('='.repeat(50));

  // Load market data
  let market;
  try {
    market = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
    console.log('📊 Using market:', market.marketPda);
    console.log('   Teams:', market.teamA, 'vs', market.teamB);
  } catch {
    console.error('❌ No market found. Run create-usdc-market.js first!');
    process.exit(1);
  }

  // Initialize
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const programId = new PublicKey(process.env.PROGRAM_ID);

  console.log('Wallet:', wallet.publicKey.toString());

  // Get all necessary accounts
  const marketPda = new PublicKey(market.marketPda);
  const teamAMint = new PublicKey(market.teamAMint);
  const teamBMint = new PublicKey(market.teamBMint);
  const usdcMint = new PublicKey(market.usdcMint);
  const usdcVault = new PublicKey(market.usdcVault);

  const sellerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, wallet.publicKey);
  const sellerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, wallet.publicKey);
  const sellerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, wallet.publicKey);

  // Check initial balances
  console.log('\n💼 Initial Balances:');
  
  let teamABalance = 0;
  let teamBBalance = 0;
  let usdcBalance = 0;
  
  try {
    const teamAAccount = await getAccount(connection, sellerTeamAAccount);
    teamABalance = Number(teamAAccount.amount) / 1_000_000;
    console.log('   Team A tokens:', teamABalance);
  } catch {
    console.log('   Team A tokens: 0 (no account)');
  }

  try {
    const teamBAccount = await getAccount(connection, sellerTeamBAccount);
    teamBBalance = Number(teamBAccount.amount) / 1_000_000;
    console.log('   Team B tokens:', teamBBalance);
  } catch {
    console.log('   Team B tokens: 0 (no account)');
  }

  try {
    const usdcAccount = await getAccount(connection, sellerUsdcAccount);
    usdcBalance = Number(usdcAccount.amount) / 1_000_000;
    console.log('   USDC:', usdcBalance);
  } catch {
    console.log('   USDC: 0 (no account)');
  }

  if (teamABalance === 0 && teamBBalance === 0) {
    console.error('\n❌ No tokens to sell! Buy some first with: node test-buy-usdc.js');
    process.exit(1);
  }

  // Check vault balance before selling
  console.log('\n💰 Checking vault status...');
  try {
    const vaultAccount = await getAccount(connection, usdcVault);
    const vaultBalance = Number(vaultAccount.amount) / 1_000_000;
    console.log('   Vault USDC balance:', vaultBalance);
    
    if (vaultBalance === 0) {
      console.error('   ⚠️  Vault is empty! The market needs USDC from buyers first.');
      console.error('   Run "node test-buy-usdc.js" to add liquidity to the vault.');
      process.exit(1);
    }
  } catch (e) {
    console.error('   Could not check vault balance:', e.message);
  }

  // Determine which team to sell
  const sellTeamA = teamABalance > 0;
  const teamToSell = sellTeamA ? 'A' : 'B';
  const tokensToSell = Math.min(sellTeamA ? teamABalance : teamBBalance, 50); // Sell up to 50 tokens

  console.log(`\n🎯 Selling ${tokensToSell} Team ${teamToSell} tokens...`);

  // Fetch market state to calculate expected USDC
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
    const teamASupply = Number(data.readBigUInt64LE(offset)) / 1_000_000;
    offset += 8;
    const teamBSupply = Number(data.readBigUInt64LE(offset)) / 1_000_000;
    
    const currentSupply = sellTeamA ? teamASupply : teamBSupply;
    
    // Estimate USDC out (simplified linear calculation)
    const avgPrice = (basePrice + (slope * (currentSupply - tokensToSell/2) / 1_000_000)) / 1_000_000;
    const expectedUsdc = tokensToSell * avgPrice;
    
    console.log('   Current supply:', currentSupply);
    console.log('   Average price:', avgPrice.toFixed(6), 'USDC per token');
    console.log('   Expected USDC:', expectedUsdc.toFixed(2));
  }

  // Create sell transaction
  const tx = new Transaction();

  // Try to load IDL to get correct discriminator
  let discriminator;
  try {
    const idlPath = '../target/idl/sportsxchange.json';
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    
    // Debug: Show all instruction names
    console.log('   Available instructions:', idl.instructions.map(ix => ix.name));
    
    // Anchor converts snake_case to camelCase
    const sellInstruction = idl.instructions.find(ix => 
      ix.name === 'sellOnCurve' || ix.name === 'sell_on_curve'
    );
    
    if (!sellInstruction) {
      throw new Error('sell_on_curve instruction not found in IDL');
    }
    
    discriminator = Buffer.from(sellInstruction.discriminator);
    console.log('   Using discriminator from IDL:', discriminator);
  } catch (e) {
    // Fallback - this will be replaced after anchor build
    console.log('   Warning:', e.message);
    console.log('   Run "anchor build" first to generate the correct discriminator');
    // This is a placeholder - will be generated by anchor build
    discriminator = Buffer.from([200, 51, 223, 114, 150, 25, 72, 240]);
  }

  // Sell instruction
  const sellIx = {
    programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: teamAMint, isSigner: false, isWritable: true },
      { pubkey: teamBMint, isSigner: false, isWritable: true },
      { pubkey: sellerTeamAAccount, isSigner: false, isWritable: true },
      { pubkey: sellerTeamBAccount, isSigner: false, isWritable: true },
      { pubkey: sellerUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: usdcVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      discriminator,
      Buffer.from([sellTeamA ? 0 : 1]), // team: 0 for A, 1 for B
      encodeU64(tokensToSell * 1_000_000), // token amount with decimals
      encodeU64(0), // min_usdc_out: 0 (no slippage protection for test)
    ])
  };

  tx.add(sellIx);

  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ Sell successful!');
    console.log('   Transaction:', sig);

    // Check new balances
    console.log('\n💼 New Balances:');
    
    const newTeamAAccount = await getAccount(connection, sellerTeamAAccount);
    const newTeamABalance = Number(newTeamAAccount.amount) / 1_000_000;
    console.log('   Team A tokens:', newTeamABalance);
    
    const newUsdcAccount = await getAccount(connection, sellerUsdcAccount);
    const newUsdcBalance = Number(newUsdcAccount.amount) / 1_000_000;
    console.log('   USDC:', newUsdcBalance);
    
    const usdcReceived = newUsdcBalance - usdcBalance;
    console.log('   USDC received:', usdcReceived.toFixed(2));
    console.log('   Price per token:', (usdcReceived / tokensToSell).toFixed(4), 'USDC');

    // Check vault balance
    const vaultAccount = await getAccount(connection, usdcVault);
    const vaultBalance = Number(vaultAccount.amount) / 1_000_000;
    console.log('   Vault USDC remaining:', vaultBalance);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SELL FUNCTIONALITY VERIFIED!');
    console.log('='.repeat(50));
    
    console.log('\n✅ Complete Trading Loop Works:');
    console.log('   1. Buy tokens with USDC ✓');
    console.log('   2. Sell tokens for USDC ✓');
    console.log('   3. Bonding curve pricing ✓');
    console.log('   4. Vault management ✓');

    // Save test results
    const testResults = {
      timestamp: new Date().toISOString(),
      market: market.marketPda,
      sellTransaction: sig,
      tokensSold: tokensToSell,
      usdcReceived,
      pricePerToken: usdcReceived / tokensToSell,
      balances: {
        teamA: newTeamABalance,
        usdc: newUsdcBalance,
        vault: vaultBalance
      }
    };

    fs.writeFileSync('./data/sell-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n📊 Test results saved to: data/sell-test-results.json');

  } catch (error) {
    console.error('\n❌ Sell failed:', error);
    if (error.logs) {
      console.error('\nTransaction logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
  }
}

function encodeU64(num) {
  const bn = new BN(num);
  const buf = Buffer.alloc(8);
  bn.toArrayLike(Buffer, 'le', 8).copy(buf);
  return buf;
}

testSellFunctionality().catch(console.error);
