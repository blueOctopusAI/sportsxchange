#!/usr/bin/env node

/**
 * Move Market Price - Simple Version
 * Execute a trade to change market prices
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function moveMarket() {
  console.log('\n📈 Moving Market Price');
  console.log('='.repeat(50));

  // Load market data
  let market;
  try {
    market = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
    console.log('✅ Using market:', market.marketPda);
    console.log('   Teams:', market.teamA, 'vs', market.teamB);
  } catch {
    console.error('❌ No market found. Run create-usdc-market.js first!');
    process.exit(1);
  }

  // Initialize
  const connection = new Connection(process.env.RPC_URL || 'http://localhost:8899', 'confirmed');
  const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const programId = new PublicKey(process.env.PROGRAM_ID);

  console.log('Wallet:', wallet.publicKey.toString());

  // Check USDC balance
  const usdcMint = new PublicKey(market.usdcMint);
  const buyerUsdcAccount = getAssociatedTokenAddressSync(
    usdcMint,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    const usdcAccountInfo = await getAccount(connection, buyerUsdcAccount);
    const usdcBalance = Number(usdcAccountInfo.amount) / 1_000_000;
    console.log('USDC Balance:', usdcBalance);
    
    if (usdcBalance < 50) {
      console.error('❌ Not enough USDC for market move (need 50). Current:', usdcBalance);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ No USDC account. Run: node usdc-faucet.js');
    process.exit(1);
  }

  // Setup for buy
  const marketPda = new PublicKey(market.marketPda);
  const teamAMint = new PublicKey(market.teamAMint);
  const teamBMint = new PublicKey(market.teamBMint);
  const usdcVault = new PublicKey(market.usdcVault);

  const buyerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, wallet.publicKey);
  const buyerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, wallet.publicKey);

  // Buy Team A to move the market significantly
  const team = 0; // Team A
  const buyAmount = 50; // 50 USDC to create significant price movement
  
  console.log(`\n🎯 Buying Team A tokens for ${buyAmount} USDC to move market...`);

  const tx = new Transaction();

  // Create ATAs if needed
  const teamAAccountInfo = await connection.getAccountInfo(buyerTeamAAccount);
  const teamBAccountInfo = await connection.getAccountInfo(buyerTeamBAccount);

  if (!teamAAccountInfo) {
    console.log('   Creating Team A token account...');
    tx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        buyerTeamAAccount,
        wallet.publicKey,
        teamAMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  if (!teamBAccountInfo) {
    console.log('   Creating Team B token account...');
    tx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        buyerTeamBAccount,
        wallet.publicKey,
        teamBMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Buy instruction
  const buyIx = {
    programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: teamAMint, isSigner: false, isWritable: true },
      { pubkey: teamBMint, isSigner: false, isWritable: true },
      { pubkey: buyerTeamAAccount, isSigner: false, isWritable: true },
      { pubkey: buyerTeamBAccount, isSigner: false, isWritable: true },
      { pubkey: buyerUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: usdcVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([6, 20, 84, 191, 116, 79, 21, 147]), // buy_on_curve discriminator
      Buffer.from([team]), // team: 0 for A
      encodeU64(buyAmount * 1_000_000), // Convert to 6 decimals
      encodeU64(0), // min_tokens_out: 0 (no slippage protection)
    ])
  };

  tx.add(buyIx);

  try {
    console.log('\nExecuting transaction...');
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ Market moved successfully!');
    console.log('   Transaction:', sig);

    // Check new balances
    const teamAccount = await getAccount(connection, buyerTeamAAccount);
    const teamBalance = Number(teamAccount.amount) / 1_000_000;
    
    const usdcAccount = await getAccount(connection, buyerUsdcAccount);
    const newUsdcBalance = Number(usdcAccount.amount) / 1_000_000;

    console.log('\n💼 New Balances:');
    console.log('   Team A tokens received:', teamBalance);
    console.log('   USDC remaining:', newUsdcBalance);
    console.log('   USDC spent:', usdcBalance - newUsdcBalance);

    // Check vault balance to estimate new price
    const vaultAccount = await getAccount(connection, usdcVault);
    const vaultBalance = Number(vaultAccount.amount) / 1_000_000;
    console.log('   Vault USDC (pool value):', vaultBalance);

    // Rough price estimate
    const tokensPerUSDC = teamBalance / buyAmount;
    const estimatedNewPrice = 1 / tokensPerUSDC;
    
    console.log('\n📊 Market Impact:');
    console.log('   Starting price: ~$0.10');
    console.log('   Estimated new price: ~$' + estimatedNewPrice.toFixed(4));
    console.log('   Price increase: ~' + ((estimatedNewPrice - 0.1) / 0.1 * 100).toFixed(1) + '%');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Market has been moved!');
    console.log('Now run the intelligent MM test to see bots react:');
    console.log(`TEST_MARKET=${market.marketPda} node test-intelligent-mm.js`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Transaction failed:', error);
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

moveMarket().catch(console.error);
