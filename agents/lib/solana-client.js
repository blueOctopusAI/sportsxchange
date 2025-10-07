import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BN from 'bn.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SolanaClient {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.programId = null;
  }

  async initialize() {
    // Load wallet
    const walletPath = process.env.WALLET_PATH;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

    // Connect to cluster
    this.connection = new Connection(process.env.RPC_URL, 'confirmed');
    
    // Set program ID
    this.programId = new PublicKey(process.env.PROGRAM_ID);
    
    console.log('✅ Solana client initialized');
    console.log('   Wallet:', this.wallet.publicKey.toString());
    console.log('   Program:', this.programId.toString());
    console.log('   RPC:', process.env.RPC_URL);
  }

  async createMarket(gameId, homeTeam, awayTeam) {
    // Generate mints
    const homeMint = Keypair.generate();
    const awayMint = Keypair.generate();

    // Derive PDA
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      this.programId
    );

    console.log(`\n📝 Creating market for ${gameId}...`);
    console.log('   Market PDA:', marketPda.toString());

    try {
      const tx = new Transaction();

      // Create market instruction
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
          Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]), // discriminator
          this.encodeString(gameId),
          this.encodeString(homeTeam),
          this.encodeString(awayTeam),
        ])
      };

      tx.add(createMarketIx);

      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet, homeMint, awayMint],
        { commitment: 'confirmed' }
      );

      console.log('✅ Market created!');
      console.log('   Transaction:', sig);
      console.log('   Home Mint:', homeMint.publicKey.toString());
      console.log('   Away Mint:', awayMint.publicKey.toString());

      return {
        marketPda: marketPda.toString(),
        homeMint: homeMint.publicKey.toString(),
        awayMint: awayMint.publicKey.toString(),
        tx: sig
      };
    } catch (error) {
      console.error('❌ Failed to create market:', error);
      throw error;
    }
  }

  async initializePool(marketPda, homeMintPubkey, awayMintPubkey) {
    const market = new PublicKey(marketPda);
    const homeMint = new PublicKey(homeMintPubkey);
    const awayMint = new PublicKey(awayMintPubkey);

    // Derive pool PDA
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), market.toBuffer()],
      this.programId
    );

    // Get vault addresses
    const homeVault = await this.getAssociatedTokenAddress(homeMint, poolPda);
    const awayVault = await this.getAssociatedTokenAddress(awayMint, poolPda);

    const initialAmount = 1_000_000_000; // 1000 tokens with 6 decimals

    console.log(`\n💧 Initializing pool...`);
    console.log('   Pool PDA:', poolPda.toString());
    console.log('   Initial liquidity: 1000 HOME / 1000 AWAY');

    try {
      const tx = new Transaction();

      const initPoolIx = {
        programId: this.programId,
        keys: [
          { pubkey: market, isSigner: false, isWritable: true },
          { pubkey: poolPda, isSigner: false, isWritable: true },
          { pubkey: homeMint, isSigner: false, isWritable: true },
          { pubkey: awayMint, isSigner: false, isWritable: true },
          { pubkey: homeVault, isSigner: false, isWritable: true },
          { pubkey: awayVault, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([95, 180, 10, 172, 84, 174, 232, 40]), // discriminator
          this.encodeU64(initialAmount),
          this.encodeU64(initialAmount),
        ])
      };

      tx.add(initPoolIx);

      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );

      console.log('✅ Pool initialized!');
      console.log('   Transaction:', sig);
      console.log('   Home Vault:', homeVault.toString());
      console.log('   Away Vault:', awayVault.toString());

      return {
        poolPda: poolPda.toString(),
        homeVault: homeVault.toString(),
        awayVault: awayVault.toString(),
        tx: sig
      };
    } catch (error) {
      console.error('❌ Failed to initialize pool:', error);
      throw error;
    }
  }

  async resolveMarket(marketPda, winner) {
    const market = new PublicKey(marketPda);
    
    // Winner: 0 for Home, 1 for Away
    const winnerValue = winner.toLowerCase() === 'home' ? 0 : 1;

    console.log(`\n🏆 Resolving market...`);
    console.log('   Winner:', winner.toUpperCase());

    try {
      const tx = new Transaction();

      const resolveIx = {
        programId: this.programId,
        keys: [
          { pubkey: market, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([155, 23, 80, 173, 46, 74, 23, 239]), // discriminator
          Buffer.from([winnerValue]), // TeamSide enum
        ])
      };

      tx.add(resolveIx);

      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );

      console.log('✅ Market resolved!');
      console.log('   Transaction:', sig);

      return { tx: sig };
    } catch (error) {
      console.error('❌ Failed to resolve market:', error);
      throw error;
    }
  }

  // Helper functions
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

  async getMarketData(marketPda) {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(marketPda));
      if (!accountInfo) return null;
      
      // Parse the data manually if needed
      // For now, just return that it exists
      return { exists: true, data: accountInfo.data };
    } catch (error) {
      console.error('Failed to fetch market:', error);
      return null;
    }
  }

  async getPoolData(poolPda) {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(poolPda));
      if (!accountInfo) return null;
      
      // Parse the data manually if needed
      return { exists: true, data: accountInfo.data };
    } catch (error) {
      console.error('Failed to fetch pool:', error);
      return null;
    }
  }
}
