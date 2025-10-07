import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

// Simple direct approach without Anchor Program wrapper
class SimpleSolanaClient {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.programId = new PublicKey(process.env.PROGRAM_ID);
  }

  async initialize() {
    // Load wallet
    const walletPath = process.env.WALLET_PATH;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

    // Connect to cluster
    this.connection = new Connection(process.env.RPC_URL, 'confirmed');
    
    console.log('✅ Simple Solana client initialized');
    console.log('   Wallet:', this.wallet.publicKey.toString());
    console.log('   Program:', this.programId.toString());
    console.log('   RPC:', process.env.RPC_URL);
  }

  async createMarketAndPool(gameId, homeTeam, awayTeam) {
    console.log(`\n📝 Creating market for ${gameId}...`);
    
    // Generate mint keypairs (Anchor will create them)
    const homeMint = Keypair.generate();
    const awayMint = Keypair.generate();

    // Derive PDAs
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      this.programId
    );

    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), marketPda.toBuffer()],
      this.programId
    );

    // Get vault ATAs
    const homeVault = await this.getAssociatedTokenAddress(homeMint.publicKey, poolPda);
    const awayVault = await this.getAssociatedTokenAddress(awayMint.publicKey, poolPda);

    console.log('   Market PDA:', marketPda.toString());
    console.log('   Pool PDA:', poolPda.toString());
    console.log('   Home Mint:', homeMint.publicKey.toString());
    console.log('   Away Mint:', awayMint.publicKey.toString());

    try {
      // Create transaction
      const tx = new Transaction();

      // Create market instruction (Anchor creates the mints internally)
      const createMarketIx = {
        programId: this.programId,
        keys: [
          { pubkey: marketPda, isSigner: false, isWritable: true },
          { pubkey: homeMint.publicKey, isSigner: true, isWritable: true },
          { pubkey: awayMint.publicKey, isSigner: true, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]), // discriminator for create_market
          this.encodeString(gameId),
          this.encodeString(homeTeam),
          this.encodeString(awayTeam),
        ])
      };

      tx.add(createMarketIx);

      // Initialize pool instruction  
      const initPoolIx = {
        programId: this.programId,
        keys: [
          { pubkey: marketPda, isSigner: false, isWritable: true },
          { pubkey: poolPda, isSigner: false, isWritable: true },
          { pubkey: homeMint.publicKey, isSigner: false, isWritable: true },
          { pubkey: awayMint.publicKey, isSigner: false, isWritable: true },
          { pubkey: homeVault, isSigner: false, isWritable: true },
          { pubkey: awayVault, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([95, 180, 10, 172, 84, 174, 232, 40]), // discriminator for initialize_pool
          this.encodeU64(1_000_000_000), // initial home amount (1000 tokens with 6 decimals)
          this.encodeU64(1_000_000_000), // initial away amount
        ])
      };

      tx.add(initPoolIx);

      // Send transaction
      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet, homeMint, awayMint],
        { commitment: 'confirmed' }
      );

      console.log('✅ Market and pool created!');
      console.log('   Transaction:', sig);

      return {
        marketPda: marketPda.toString(),
        poolPda: poolPda.toString(),
        homeMint: homeMint.publicKey.toString(),
        awayMint: awayMint.publicKey.toString(),
        homeVault: homeVault.toString(),
        awayVault: awayVault.toString(),
        tx: sig
      };

    } catch (error) {
      console.error('❌ Failed to create market:', error);
      
      // If we have transaction logs, show them
      if (error.logs) {
        console.error('\nTransaction logs:');
        error.logs.forEach(log => console.error('  ', log));
      }
      
      throw error;
    }
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
}

// Test it
async function testSimpleClient() {
  console.log('🚀 SportsXchange - Simple Market Creation Test');
  console.log('='.repeat(50));

  const client = new SimpleSolanaClient();
  await client.initialize();

  const gameId = "2024-WEEK10-SIMPLE-" + Date.now();
  const homeTeam = "KC";
  const awayTeam = "BAL";

  console.log('\n📋 Game Details:');
  console.log('   Game ID:', gameId);
  console.log('   Home Team:', homeTeam);
  console.log('   Away Team:', awayTeam);

  try {
    const result = await client.createMarketAndPool(gameId, homeTeam, awayTeam);
    
    // Save results
    fs.writeFileSync(
      './data/last-created-market.json',
      JSON.stringify(result, null, 2)
    );

    console.log('\n' + '='.repeat(50));
    console.log('✅ SUCCESS! Market and pool created');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log('   Market PDA:', result.marketPda);
    console.log('   Pool PDA:', result.poolPda);
    console.log('   Ready for trading!');
    console.log('\n💾 Results saved to: data/last-created-market.json');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

testSimpleClient().catch(console.error);
