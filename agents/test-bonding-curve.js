import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

class BondingCurveClient {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.programId = new PublicKey(process.env.PROGRAM_ID);
    this.usdcMint = null; // Will create a test USDC
  }

  async initialize() {
    const walletPath = process.env.WALLET_PATH;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    this.connection = new Connection(process.env.RPC_URL, 'confirmed');
    
    console.log('✅ Bonding curve client initialized');
    console.log('   Wallet:', this.wallet.publicKey.toString());
    console.log('   Program:', this.programId.toString());
  }

  async setupTestUSDC() {
    console.log('\n💵 Setting up test USDC...');
    
    // Create a test USDC mint
    this.usdcMint = await createMint(
      this.connection,
      this.wallet,
      this.wallet.publicKey,
      null,
      6, // 6 decimals like real USDC
      undefined,
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );
    
    console.log('   USDC Mint:', this.usdcMint.toString());
    
    // Get or create wallet's USDC account
    const walletUsdcAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.wallet,
      this.usdcMint,
      this.wallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Mint 10,000 test USDC to wallet
    await mintTo(
      this.connection,
      this.wallet,
      this.usdcMint,
      walletUsdcAccount.address,
      this.wallet,
      10_000_000_000, // 10,000 USDC with 6 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );
    
    console.log('   ✅ Minted 10,000 test USDC');
    
    return this.usdcMint;
  }

  async createBondingCurveMarket(gameId, teamA, teamB) {
    console.log(`\n📝 Creating bonding curve market for ${gameId}...`);
    
    // Derive PDAs
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      this.programId
    );

    const [teamAMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("team_a_mint"), Buffer.from(gameId)],
      this.programId
    );

    const [teamBMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("team_b_mint"), Buffer.from(gameId)],
      this.programId
    );

    const [usdcVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("usdc_vault"), Buffer.from(gameId)],
      this.programId
    );

    console.log('   Market PDA:', marketPda.toString());
    console.log('   Team A Mint:', teamAMint.toString());
    console.log('   Team B Mint:', teamBMint.toString());
    console.log('   USDC Vault:', usdcVault.toString());

    try {
      const tx = new Transaction();

      // Linear bonding curve parameters
      const basePrice = new BN(100_000); // 0.0001 SOL per token initial price
      const slope = new BN(10_000);      // Price increases by 0.00001 SOL per million tokens

      // Create market instruction with bonding curve
      const createMarketIx = {
        programId: this.programId,
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: marketPda, isSigner: false, isWritable: true },
          { pubkey: teamAMint, isSigner: false, isWritable: true },
          { pubkey: teamBMint, isSigner: false, isWritable: true },
          { pubkey: usdcVault, isSigner: false, isWritable: true },
          { pubkey: this.usdcMint, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([193, 18, 155, 62, 161, 124, 80, 25]), // discriminator for create_market_v2
          this.encodeString(gameId),
          this.encodeString(teamA),
          this.encodeString(teamB),
          basePrice.toArrayLike(Buffer, 'le', 8),
          slope.toArrayLike(Buffer, 'le', 8),
        ])
      };

      tx.add(createMarketIx);

      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );

      console.log('✅ Bonding curve market created!');
      console.log('   Transaction:', sig);
      console.log('   Base price: 0.0001 SOL per token');
      console.log('   Slope: Price increases linearly with supply');

      return {
        marketPda: marketPda.toString(),
        teamAMint: teamAMint.toString(),
        teamBMint: teamBMint.toString(),
        usdcVault: usdcVault.toString(),
        tx: sig
      };

    } catch (error) {
      console.error('❌ Failed to create market:', error);
      if (error.logs) {
        console.error('\nTransaction logs:');
        error.logs.forEach(log => console.error('  ', log));
      }
      throw error;
    }
  }

  async buyOnCurve(marketPda, team, usdcAmount, gameId) {
    console.log(`\n💰 Buying Team ${team === 0 ? 'A' : 'B'} tokens for ${usdcAmount} USDC...`);
    
    const market = new PublicKey(marketPda);
    
    // Use the gameId passed in to derive PDAs
    const [teamAMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("team_a_mint"), Buffer.from(gameId)],
      this.programId
    );

    const [teamBMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("team_b_mint"), Buffer.from(gameId)],
      this.programId
    );

    const [usdcVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("usdc_vault"), Buffer.from(gameId)],
      this.programId
    );

    // Get user token accounts
    const buyerUsdcAccount = await this.getAssociatedTokenAddress(this.usdcMint, this.wallet.publicKey);
    const buyerTeamAAccount = await this.getAssociatedTokenAddress(teamAMint, this.wallet.publicKey);
    const buyerTeamBAccount = await this.getAssociatedTokenAddress(teamBMint, this.wallet.publicKey);

    // Create ATAs if they don't exist
    const teamAAccountInfo = await this.connection.getAccountInfo(buyerTeamAAccount);
    const teamBAccountInfo = await this.connection.getAccountInfo(buyerTeamBAccount);
    
    if (!teamAAccountInfo || !teamBAccountInfo) {
      const setupTx = new Transaction();
      
      if (!teamAAccountInfo) {
        console.log('   Creating Team A token account...');
        const createTeamAAccountIx = {
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: buyerTeamAAccount, isSigner: false, isWritable: true },
            { pubkey: this.wallet.publicKey, isSigner: false, isWritable: false },
            { pubkey: teamAMint, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data: Buffer.alloc(0),
        };
        setupTx.add(createTeamAAccountIx);
      }
      
      if (!teamBAccountInfo) {
        console.log('   Creating Team B token account...');
        const createTeamBAccountIx = {
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: buyerTeamBAccount, isSigner: false, isWritable: true },
            { pubkey: this.wallet.publicKey, isSigner: false, isWritable: false },
            { pubkey: teamBMint, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data: Buffer.alloc(0),
        };
        setupTx.add(createTeamBAccountIx);
      }
      
      if (setupTx.instructions.length > 0) {
        await sendAndConfirmTransaction(
          this.connection,
          setupTx,
          [this.wallet],
          { commitment: 'confirmed' }
        );
        console.log('   Token accounts created');
      }
    }

    const tx = new Transaction();

    // Buy instruction with correct discriminator
    const buyIx = {
      programId: this.programId,
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: market, isSigner: false, isWritable: true },
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
        Buffer.from([6, 20, 84, 191, 116, 79, 21, 147]), // discriminator for buy_on_curve
        Buffer.from([team]), // team: 0 or 1
        this.encodeU64(usdcAmount * 1_000_000), // USDC amount with decimals
        this.encodeU64(0), // min_tokens_out (0 for no slippage protection in test)
      ])
    };

    tx.add(buyIx);

    try {
      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );

      console.log('   ✅ Purchase complete! TX:', sig);
      
      // Estimate tokens received (simplified for linear curve)
      const estimatedTokens = this.estimateTokensOut(usdcAmount, 0, 100000, 10000);
      console.log('   Estimated tokens received:', estimatedTokens.toFixed(2));

      return { tx: sig, usdcSpent: usdcAmount };

    } catch (error) {
      console.error('❌ Failed to buy tokens:', error);
      if (error.logs) {
        console.error('\nTransaction logs:');
        error.logs.forEach(log => console.error('  ', log));
      }
      throw error;
    }
  }

  // Helper functions
  estimateTokensOut(usdcAmount, currentSupply, basePrice, slope) {
    // Linear bonding curve estimation
    const startPrice = basePrice + (slope * currentSupply / 1000000);
    if (startPrice === 0) return 0;
    return usdcAmount / startPrice * 1000000; // Scale for decimals
  }

  encodeString(str) {
    const bytes = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(bytes.length, 0);
    return Buffer.concat([len, bytes]);
  }

  encodeU64(num) {
    const bn = new BN(num);
    const buf = Buffer.alloc(8);
    bn.toArrayLike(Buffer, 'le', 8).copy(buf);
    return buf;
  }

  async getAssociatedTokenAddress(mint, owner) {
    const [address] = PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return address;
  }

  async ensureTokenAccountExists(mint) {
    const ata = await this.getAssociatedTokenAddress(mint, this.wallet.publicKey);
    const accountInfo = await this.connection.getAccountInfo(ata);
    
    if (!accountInfo) {
      const tx = new Transaction();
      const createAtaIx = {
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: ata, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.alloc(0),
      };
      tx.add(createAtaIx);
      
      await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );
    }
  }
}

// Test the bonding curve
async function testBondingCurve() {
  console.log('🚀 SportsXchange - Bonding Curve Test');
  console.log('='.repeat(50));

  const client = new BondingCurveClient();
  await client.initialize();

  // Setup test USDC
  await client.setupTestUSDC();

  const gameId = "2024-BONDING-" + Date.now();
  const teamA = "CHIEFS";
  const teamB = "RAVENS";

  console.log('\n📋 Game Details:');
  console.log('   Game ID:', gameId);
  console.log('   Team A:', teamA);
  console.log('   Team B:', teamB);

  try {
    // Create bonding curve market
    const market = await client.createBondingCurveMarket(gameId, teamA, teamB);
    
    // Save market data
    fs.writeFileSync(
      './data/last-bonding-market.json',
      JSON.stringify({
        ...market,
        gameId,
        usdcMint: client.usdcMint.toString()
      }, null, 2)
    );

    // Buy Team A tokens (first buyer gets best price)
    console.log('\n📈 Testing bonding curve purchases...');
    
    console.log('\n🔸 First buyer (best price):');
    await client.buyOnCurve(market.marketPda, 0, 1, gameId); // Buy Team A for $1 (smaller amount to test)
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ BONDING CURVE MARKET CREATED!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log('   Market PDA:', market.marketPda);
    console.log('   Team A Mint:', market.teamAMint);
    console.log('   Team B Mint:', market.teamBMint);
    console.log('   USDC Vault:', market.usdcVault);
    console.log('\n💡 Early buyers get exponentially more tokens!');
    console.log('   First $100 → ~10,000 tokens');
    console.log('   After $10k volume → $100 gets ~100 tokens');
    console.log('\n💾 Market saved to: data/last-bonding-market.json');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBondingCurve().catch(console.error);
