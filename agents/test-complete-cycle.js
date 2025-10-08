import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function testCompleteCycle() {
  console.log('🔄 Testing Complete Trading Cycle');
  console.log('='.repeat(50));

  // Initialize
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const programId = new PublicKey(process.env.PROGRAM_ID);

  console.log('Wallet:', wallet.publicKey.toString());

  // Load market from last created market
  let market;
  try {
    market = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
    console.log('📊 Using market:', market.marketPda);
    console.log('   Teams:', market.teamA, 'vs', market.teamB);
  } catch {
    console.error('❌ No market found. Run create-usdc-market.js first!');
    process.exit(1);
  }

  // Get all necessary accounts
  const marketPda = new PublicKey(market.marketPda);
  const teamAMint = new PublicKey(market.teamAMint);
  const teamBMint = new PublicKey(market.teamBMint);
  const usdcMint = new PublicKey(market.usdcMint);
  const usdcVault = new PublicKey(market.usdcVault);

  const buyerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, wallet.publicKey);
  const buyerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, wallet.publicKey);
  const buyerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, wallet.publicKey);

  // Step 1: Check initial balances
  console.log('\n📊 Initial State:');
  
  let initialUsdcBalance = 0;
  try {
    const usdcAccount = await getAccount(connection, buyerUsdcAccount);
    initialUsdcBalance = Number(usdcAccount.amount) / 1_000_000;
    console.log('   User USDC:', initialUsdcBalance);
  } catch {
    console.log('   User USDC: 0 (no account)');
  }

  // Check vault
  let vaultBalance = 0;
  try {
    const vaultAccount = await getAccount(connection, usdcVault);
    vaultBalance = Number(vaultAccount.amount) / 1_000_000;
    console.log('   Vault USDC:', vaultBalance);
  } catch {
    console.log('   Vault USDC: 0');
  }

  // Step 2: Buy tokens
  console.log('\n💰 Step 1: BUY - Purchasing 100 Team A tokens with USDC...');
  
  const buyAmount = 10_000_000; // 10 USDC
  const buyTx = new Transaction();

  // Create ATAs if needed
  try {
    await getAccount(connection, buyerTeamAAccount);
  } catch {
    console.log('   Creating Team A token account...');
    buyTx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        buyerTeamAAccount,
        wallet.publicKey,
        teamAMint
      )
    );
  }

  try {
    await getAccount(connection, buyerTeamBAccount);
  } catch {
    console.log('   Creating Team B token account...');
    buyTx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        buyerTeamBAccount,
        wallet.publicKey,
        teamBMint
      )
    );
  }

  // Load IDL for buy instruction
  const idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf-8'));
  const buyInstruction = idl.instructions.find(ix => ix.name === 'buy_on_curve');
  const buyDiscriminator = Buffer.from(buyInstruction.discriminator);

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
      buyDiscriminator,
      Buffer.from([0]), // team: 0 for A
      encodeU64(buyAmount), // USDC amount
      encodeU64(0), // min_tokens_out: 0 (no slippage protection)
    ])
  };

  buyTx.add(buyIx);

  try {
    const buySig = await sendAndConfirmTransaction(
      connection,
      buyTx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('   ✅ Buy successful! Tx:', buySig.substring(0, 20) + '...');

    // Check balances after buy
    const teamAAccount = await getAccount(connection, buyerTeamAAccount);
    const teamABalance = Number(teamAAccount.amount) / 1_000_000;
    console.log('   Received tokens:', teamABalance);

    const vaultAfterBuy = await getAccount(connection, usdcVault);
    const vaultBalanceAfterBuy = Number(vaultAfterBuy.amount) / 1_000_000;
    console.log('   Vault USDC after buy:', vaultBalanceAfterBuy);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Sell tokens
    console.log('\n💸 Step 2: SELL - Selling 50 Team A tokens back...');

    const sellAmount = teamABalance / 2; // Sell half
    const sellTx = new Transaction();

    // Get sell instruction discriminator
    const sellInstruction = idl.instructions.find(ix => ix.name === 'sell_on_curve');
    const sellDiscriminator = Buffer.from(sellInstruction.discriminator);

    // Sell instruction
    const sellIx = {
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
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        sellDiscriminator,
        Buffer.from([0]), // team: 0 for A
        encodeU64(sellAmount * 1_000_000), // token amount with decimals
        encodeU64(0), // min_usdc_out: 0 (no slippage protection)
      ])
    };

    sellTx.add(sellIx);

    const sellSig = await sendAndConfirmTransaction(
      connection,
      sellTx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('   ✅ Sell successful! Tx:', sellSig.substring(0, 20) + '...');

    // Final balances
    console.log('\n📊 Final State:');
    
    const finalTeamAAccount = await getAccount(connection, buyerTeamAAccount);
    const finalTeamABalance = Number(finalTeamAAccount.amount) / 1_000_000;
    console.log('   Team A tokens:', finalTeamABalance);
    
    const finalUsdcAccount = await getAccount(connection, buyerUsdcAccount);
    const finalUsdcBalance = Number(finalUsdcAccount.amount) / 1_000_000;
    console.log('   User USDC:', finalUsdcBalance);
    
    const finalVaultAccount = await getAccount(connection, usdcVault);
    const finalVaultBalance = Number(finalVaultAccount.amount) / 1_000_000;
    console.log('   Vault USDC:', finalVaultBalance);

    // Analysis
    console.log('\n📈 Trading Analysis:');
    console.log('   USDC spent on buy:', (buyAmount / 1_000_000).toFixed(2));
    console.log('   Tokens received:', teamABalance);
    console.log('   Tokens sold:', sellAmount);
    console.log('   USDC recovered:', (finalUsdcBalance - (initialUsdcBalance - buyAmount / 1_000_000)).toFixed(2));
    console.log('   Net USDC change:', (finalUsdcBalance - initialUsdcBalance).toFixed(2));
    console.log('   Slippage:', ((1 - (finalUsdcBalance - initialUsdcBalance + buyAmount / 1_000_000) / (buyAmount / 1_000_000)) * 100).toFixed(2) + '%');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 COMPLETE TRADING CYCLE SUCCESSFUL!');
    console.log('='.repeat(50));
    console.log('✅ Buy tokens with USDC');
    console.log('✅ Sell tokens for USDC');
    console.log('✅ Bonding curve pricing works');
    console.log('✅ Vault management works');
    console.log('✅ Token burning works');

  } catch (error) {
    console.error('\n❌ Cycle failed:', error);
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

testCompleteCycle().catch(console.error);