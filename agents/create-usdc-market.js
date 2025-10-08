import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function createMarketWithTestUSDC() {
  console.log('🎮 Creating Bonding Curve Market with Test USDC');
  console.log('='.repeat(50));

  // Load test USDC mint
  let usdcMint;
  try {
    const mintData = JSON.parse(fs.readFileSync('./data/test-usdc-mint.json', 'utf-8'));
    usdcMint = new PublicKey(mintData.mint);
    console.log('✅ Using test USDC:', usdcMint.toString());
  } catch {
    console.error('❌ No test USDC found. Run usdc-faucet.js first!');
    process.exit(1);
  }

  // Initialize
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const programId = new PublicKey(process.env.PROGRAM_ID);

  console.log('Wallet:', wallet.publicKey.toString());
  console.log('Program:', programId.toString());

  // Create market
  const gameId = "2024-NFL-WEEK15-" + Date.now();
  const teamA = "CHIEFS";
  const teamB = "BILLS";

  console.log('\n📊 Creating market:', teamA, 'vs', teamB);
  console.log('Game ID:', gameId);

  // Derive PDAs
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(gameId)],
    programId
  );

  const [teamAMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("team_a_mint"), Buffer.from(gameId)],
    programId
  );

  const [teamBMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("team_b_mint"), Buffer.from(gameId)],
    programId
  );

  const [usdcVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("usdc_vault"), Buffer.from(gameId)],
    programId
  );

  console.log('Market PDA:', marketPda.toString());

  try {
    const tx = new Transaction();

    // Linear bonding curve parameters
    const basePrice = new BN(100_000); // 0.0001 USDC per token
    const slope = new BN(10_000);      // Price increases linearly

    // Create market instruction
    const createMarketIx = {
      programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: marketPda, isSigner: false, isWritable: true },
        { pubkey: teamAMint, isSigner: false, isWritable: true },
        { pubkey: teamBMint, isSigner: false, isWritable: true },
        { pubkey: usdcVault, isSigner: false, isWritable: true },
        { pubkey: usdcMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([193, 18, 155, 62, 161, 124, 80, 25]), // create_market_v2 discriminator
        encodeString(gameId),
        encodeString(teamA),
        encodeString(teamB),
        basePrice.toArrayLike(Buffer, 'le', 8),
        slope.toArrayLike(Buffer, 'le', 8),
      ])
    };

    tx.add(createMarketIx);

    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ Market created! Transaction:', sig);

    // Save market data
    const marketData = {
      marketPda: marketPda.toString(),
      gameId,
      teamA,
      teamB,
      teamAMint: teamAMint.toString(),
      teamBMint: teamBMint.toString(),
      usdcVault: usdcVault.toString(),
      usdcMint: usdcMint.toString(),
      basePrice: 100_000,
      slope: 10_000,
      createdAt: new Date().toISOString(),
      tx: sig
    };

    fs.writeFileSync('./data/last-usdc-market.json', JSON.stringify(marketData, null, 2));

    // Update mobile config
    const mobileConfig = {
      PROGRAM_ID: programId.toString(),
      RPC_URL: process.env.RPC_URL,
      USDC_MINT: usdcMint.toString(),
      TEST_WALLET: wallet.publicKey.toString(),
      LATEST_MARKET: marketData
    };

    fs.writeFileSync('../sportsxchange-mobile/config/current-market.json', JSON.stringify(mobileConfig, null, 2));

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SUCCESS! Market ready for trading');
    console.log('='.repeat(50));
    console.log('\n📱 Mobile App Config Updated:');
    console.log('   sportsxchange-mobile/config/current-market.json');
    console.log('\n💰 You have 1000 USDC to trade with');
    console.log('\n🎮 Next: Test buying tokens with USDC');
    
    return marketData;

  } catch (error) {
    console.error('❌ Failed to create market:', error);
    throw error;
  }
}

function encodeString(str) {
  const bytes = Buffer.from(str, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

createMarketWithTestUSDC().catch(console.error);
