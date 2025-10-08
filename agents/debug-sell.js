import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function debugSellCalculation() {
  console.log('🔍 Debug Sell Calculation');
  console.log('='.repeat(50));

  // Load market
  const market = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const programId = new PublicKey(process.env.PROGRAM_ID);

  const marketPda = new PublicKey(market.marketPda);
  const teamAMint = new PublicKey(market.teamAMint);
  const sellerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, wallet.publicKey);

  // Get current token balance
  let teamABalance = 0;
  try {
    const account = await getAccount(connection, sellerTeamAAccount);
    teamABalance = Number(account.amount);
    console.log('Team A tokens (raw):', teamABalance);
    console.log('Team A tokens (decimals):', teamABalance / 1_000_000);
  } catch {
    console.error('No Team A tokens to sell!');
    process.exit(1);
  }

  // Get market state
  const marketAccountInfo = await connection.getAccountInfo(marketPda);
  const data = marketAccountInfo.data;
  let offset = 8 + 32 + 4;
  
  const gameIdLen = data.readUInt32LE(offset - 4);
  offset += gameIdLen;
  
  const teamALen = data.readUInt32LE(offset);
  offset += 4 + teamALen;
  const teamBLen = data.readUInt32LE(offset);
  offset += 4 + teamBLen;
  
  offset += 32 * 3; // Skip mints and vault
  
  const basePrice = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const slope = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const teamASupply = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const teamBSupply = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const poolValue = Number(data.readBigUInt64LE(offset));

  console.log('\n📊 Market State (raw values):');
  console.log('   Base price:', basePrice);
  console.log('   Slope:', slope);
  console.log('   Team A supply:', teamASupply);
  console.log('   Pool value:', poolValue);

  // Test different sell amounts
  const testAmounts = [10, 25, 50, 54];
  
  console.log('\n💰 Sell Calculations:');
  for (const amount of testAmounts) {
    const tokenAmount = amount * 1_000_000; // Convert to raw amount
    
    // This mirrors the smart contract calculation
    const endSupply = teamASupply - tokenAmount;
    const startPrice = basePrice + (slope * Math.floor(teamASupply / 1_000_000));
    const endPrice = basePrice + (slope * Math.floor(endSupply / 1_000_000));
    const avgPrice = Math.floor((startPrice + endPrice) / 2);
    const usdcOut = Math.floor((tokenAmount * avgPrice) / 1_000_000);
    
    console.log(`\n   Selling ${amount} tokens:`);
    console.log(`      Current supply: ${teamASupply / 1_000_000}`);
    console.log(`      End supply: ${endSupply / 1_000_000}`);
    console.log(`      Start price: ${startPrice}`);
    console.log(`      End price: ${endPrice}`);
    console.log(`      Avg price: ${avgPrice}`);
    console.log(`      USDC out (raw): ${usdcOut}`);
    console.log(`      USDC out (decimal): ${usdcOut / 1_000_000}`);
    console.log(`      Pool has: ${poolValue / 1_000_000} USDC`);
    console.log(`      Can sell? ${usdcOut <= poolValue ? '✅' : '❌'}`);
    
    if (usdcOut > poolValue) {
      console.log(`      ⚠️  Would fail: needs ${usdcOut} but pool only has ${poolValue}`);
    }
  }

  // Now try the actual sell with the maximum safe amount
  const maxSafeTokens = Math.floor(54 * 1_000_000); // Try 54 tokens
  console.log(`\n🎯 Attempting to sell ${maxSafeTokens / 1_000_000} tokens...`);

  const tx = new Transaction();
  const idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf-8'));
  const sellInstruction = idl.instructions.find(ix => ix.name === 'sell_on_curve');
  const discriminator = Buffer.from(sellInstruction.discriminator);

  const teamBMint = new PublicKey(market.teamBMint);
  const usdcMint = new PublicKey(market.usdcMint);
  const usdcVault = new PublicKey(market.usdcVault);
  const sellerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, wallet.publicKey);
  const sellerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, wallet.publicKey);

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
      Buffer.from([0]), // team A
      encodeU64(maxSafeTokens),
      encodeU64(0), // min_usdc_out
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

    console.log('\n✅ Sell successful! Tx:', sig);

    // Check new balances
    const newTeamAAccount = await getAccount(connection, sellerTeamAAccount);
    const newBalance = Number(newTeamAAccount.amount) / 1_000_000;
    console.log('   Remaining tokens:', newBalance);
    
    const usdcAccount = await getAccount(connection, sellerUsdcAccount);
    const usdcBalance = Number(usdcAccount.amount) / 1_000_000;
    console.log('   USDC balance:', usdcBalance);

  } catch (error) {
    console.error('\n❌ Sell failed:', error.message);
    if (error.logs) {
      console.error('\nLogs:');
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

debugSellCalculation().catch(console.error);
