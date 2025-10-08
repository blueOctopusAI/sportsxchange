import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function buyWithUSDC() {
  console.log('💰 Testing Buy with USDC on Bonding Curve');
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
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
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
    
    if (usdcBalance < 10) {
      console.error('❌ Not enough USDC. Run: node usdc-faucet.js');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ No USDC account. Run: node usdc-faucet.js');
    process.exit(1);
  }

  // Buy tokens
  const marketPda = new PublicKey(market.marketPda);
  const teamAMint = new PublicKey(market.teamAMint);
  const teamBMint = new PublicKey(market.teamBMint);
  const usdcVault = new PublicKey(market.usdcVault);

  const buyerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, wallet.publicKey);
  const buyerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, wallet.publicKey);

  console.log('\n🎯 Buying Team A tokens for 10 USDC...');

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
      Buffer.from([0]), // team: 0 for A
      encodeU64(10 * 1_000_000), // 10 USDC
      encodeU64(0), // min_tokens_out: 0 (no slippage protection)
    ])
  };

  tx.add(buyIx);

  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ Purchase successful!');
    console.log('   Transaction:', sig);

    // Check new balances
    const teamAAccount = await getAccount(connection, buyerTeamAAccount);
    const teamABalance = Number(teamAAccount.amount) / 1_000_000;
    
    const usdcAccount = await getAccount(connection, buyerUsdcAccount);
    const newUsdcBalance = Number(usdcAccount.amount) / 1_000_000;

    console.log('\n💼 New Balances:');
    console.log('   Team A tokens:', teamABalance);
    console.log('   USDC remaining:', newUsdcBalance);
    console.log('   Tokens per USDC:', (teamABalance / 10).toFixed(2));

    // Check vault balance
    const vaultAccount = await getAccount(connection, usdcVault);
    const vaultBalance = Number(vaultAccount.amount) / 1_000_000;
    console.log('   Vault USDC:', vaultBalance);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 BONDING CURVE WITH USDC IS WORKING!');
    console.log('='.repeat(50));
    console.log('\n📱 The mobile app can now:');
    console.log('   1. Connect to this market');
    console.log('   2. Buy/sell with real USDC');
    console.log('   3. See actual balances update');

  } catch (error) {
    console.error('❌ Purchase failed:', error);
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

buyWithUSDC().catch(console.error);
