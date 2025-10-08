import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import BN from 'bn.js';

// Bonding Curve Market Interface
interface BondingCurveMarket {
  marketPda: string;
  gameId: string;
  teamA: string;
  teamB: string;
  teamAMint: string;
  teamBMint: string;
  usdcVault: string;
  basePrice: number;
  slope: number;
  teamASupply: number;
  teamBSupply: number;
  poolValue: number;
}

export class SportsXchangeClient {
  private connection: Connection;
  private programId: PublicKey;
  private usdcMint: PublicKey;

  constructor(
    rpcUrl: string = 'http://127.0.0.1:8899',
    programId: string = '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH',
    usdcMint?: string
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    // Use provided USDC mint or a default test one
    this.usdcMint = usdcMint ? new PublicKey(usdcMint) : PublicKey.default;
  }

  /**
   * Set the USDC mint address (for test USDC)
   */
  setUsdcMint(mintAddress: string) {
    this.usdcMint = new PublicKey(mintAddress);
  }

  /**
   * Fetch market data from blockchain
   */
  async getMarketData(marketPda: string): Promise<BondingCurveMarket | null> {
    try {
      const market = new PublicKey(marketPda);
      const accountInfo = await this.connection.getAccountInfo(market);
      
      if (!accountInfo || !accountInfo.data) {
        console.log('Market account not found');
        return null;
      }

      // Parse the market data based on MarketV2 structure
      const data = accountInfo.data;
      let offset = 8; // Skip discriminator
      
      // Read authority (32 bytes)
      offset += 32;
      
      // Read game_id string
      const gameIdLen = data.readUInt32LE(offset);
      offset += 4;
      const gameId = data.slice(offset, offset + gameIdLen).toString('utf-8');
      offset += gameIdLen;
      
      // Read team_a string
      const teamALen = data.readUInt32LE(offset);
      offset += 4;
      const teamA = data.slice(offset, offset + teamALen).toString('utf-8');
      offset += teamALen;
      
      // Read team_b string
      const teamBLen = data.readUInt32LE(offset);
      offset += 4;
      const teamB = data.slice(offset, offset + teamBLen).toString('utf-8');
      offset += teamBLen;
      
      // Read mints and vault (32 bytes each)
      const teamAMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const teamBMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const usdcVault = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      // Read bonding curve parameters
      const basePrice = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const slope = Number(data.readBigUInt64LE(offset));
      offset += 8;
      
      // Read supplies and pool value
      const teamASupply = Number(data.readBigUInt64LE(offset)) / 1_000_000;
      offset += 8;
      const teamBSupply = Number(data.readBigUInt64LE(offset)) / 1_000_000;
      offset += 8;
      const poolValue = Number(data.readBigUInt64LE(offset)) / 1_000_000;
      
      return {
        marketPda,
        gameId,
        teamA,
        teamB,
        teamAMint: teamAMint.toString(),
        teamBMint: teamBMint.toString(),
        usdcVault: usdcVault.toString(),
        basePrice,
        slope,
        teamASupply,
        teamBSupply,
        poolValue,
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }

  /**
   * Calculate tokens out for a given USDC amount (linear bonding curve)
   */
  calculateTokensOut(usdcAmount: number, currentSupply: number, basePrice: number, slope: number): number {
    // Linear bonding curve: price = basePrice + (slope * supply / 1_000_000)
    const startPrice = basePrice + (slope * currentSupply / 1_000_000);
    
    if (startPrice === 0) return 0;
    
    // Simplified calculation for small purchases
    // For production, implement proper integration
    const tokens = (usdcAmount * 1_000_000) / startPrice;
    return tokens;
  }

  /**
   * Calculate USDC needed for a given amount of tokens
   */
  calculateUsdcIn(tokenAmount: number, currentSupply: number, basePrice: number, slope: number): number {
    const startPrice = basePrice + (slope * currentSupply / 1_000_000);
    const endPrice = basePrice + (slope * (currentSupply + tokenAmount) / 1_000_000);
    const avgPrice = (startPrice + endPrice) / 2;
    
    return (tokenAmount * avgPrice) / 1_000_000;
  }

  /**
   * Buy tokens on the bonding curve
   */
  async buyOnCurve(
    marketPda: string,
    team: 'A' | 'B',
    usdcAmount: number,
    walletPubkey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    const market = await this.getMarketData(marketPda);
    if (!market) throw new Error('Market not found');

    const marketKey = new PublicKey(marketPda);
    const teamAMint = new PublicKey(market.teamAMint);
    const teamBMint = new PublicKey(market.teamBMint);
    const usdcVault = new PublicKey(market.usdcVault);

    // Get user's USDC account
    const buyerUsdcAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get user's team token accounts
    const buyerTeamAAccount = await getAssociatedTokenAddress(
      teamAMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const buyerTeamBAccount = await getAssociatedTokenAddress(
      teamBMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction();

    // Ensure token accounts exist
    const teamAAccountInfo = await this.connection.getAccountInfo(buyerTeamAAccount);
    const teamBAccountInfo = await this.connection.getAccountInfo(buyerTeamBAccount);

    if (!teamAAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          walletPubkey,
          buyerTeamAAccount,
          walletPubkey,
          teamAMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    if (!teamBAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          walletPubkey,
          buyerTeamBAccount,
          walletPubkey,
          teamBMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Buy instruction
    const buyIx = {
      programId: this.programId,
      keys: [
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: marketKey, isSigner: false, isWritable: true },
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
        Buffer.from([team === 'A' ? 0 : 1]), // team: 0 for A, 1 for B
        this.encodeU64(usdcAmount * 1_000_000), // USDC amount with decimals
        this.encodeU64(0), // min_tokens_out (0 for no slippage protection)
      ])
    };

    tx.add(buyIx);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletPubkey;

    // Sign and send
    const signedTx = await signTransaction(tx);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize());
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  /**
   * Sell tokens on the bonding curve
   */
  async sellOnCurve(
    marketPda: string,
    team: 'A' | 'B',
    tokenAmount: number,
    walletPubkey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    const market = await this.getMarketData(marketPda);
    if (!market) throw new Error('Market not found');

    const marketKey = new PublicKey(marketPda);
    const teamAMint = new PublicKey(market.teamAMint);
    const teamBMint = new PublicKey(market.teamBMint);
    const usdcVault = new PublicKey(market.usdcVault);

    // Get user accounts
    const sellerUsdcAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      walletPubkey
    );

    const sellerTeamAAccount = await getAssociatedTokenAddress(
      teamAMint,
      walletPubkey
    );

    const sellerTeamBAccount = await getAssociatedTokenAddress(
      teamBMint,
      walletPubkey
    );

    const tx = new Transaction();

    // Sell instruction
    const sellIx = {
      programId: this.programId,
      keys: [
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: marketKey, isSigner: false, isWritable: true },
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
        Buffer.from([158, 242, 158, 47, 48, 215, 214, 209]), // sell_on_curve discriminator
        Buffer.from([team === 'A' ? 0 : 1]), // team
        this.encodeU64(tokenAmount * 1_000_000), // token amount with decimals
        this.encodeU64(0), // min_usdc_out (0 for no slippage protection)
      ])
    };

    tx.add(sellIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletPubkey;

    const signedTx = await signTransaction(tx);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize());
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  /**
   * Get user's token balances for a market
   */
  async getUserBalances(
    marketPda: string,
    walletPubkey: PublicKey
  ): Promise<{ teamA: number; teamB: number; usdc: number }> {
    const market = await this.getMarketData(marketPda);
    if (!market) {
      return { teamA: 0, teamB: 0, usdc: 0 };
    }

    try {
      const teamAMint = new PublicKey(market.teamAMint);
      const teamBMint = new PublicKey(market.teamBMint);

      // Get ATAs
      const teamAAccount = await getAssociatedTokenAddress(teamAMint, walletPubkey);
      const teamBAccount = await getAssociatedTokenAddress(teamBMint, walletPubkey);
      const usdcAccount = await getAssociatedTokenAddress(this.usdcMint, walletPubkey);

      // Fetch balances
      let teamABalance = 0;
      let teamBBalance = 0;
      let usdcBalance = 0;

      try {
        const teamAInfo = await getAccount(this.connection, teamAAccount);
        teamABalance = Number(teamAInfo.amount) / 1_000_000;
      } catch {}

      try {
        const teamBInfo = await getAccount(this.connection, teamBAccount);
        teamBBalance = Number(teamBInfo.amount) / 1_000_000;
      } catch {}

      try {
        const usdcInfo = await getAccount(this.connection, usdcAccount);
        usdcBalance = Number(usdcInfo.amount) / 1_000_000;
      } catch {}

      return { teamA: teamABalance, teamB: teamBBalance, usdc: usdcBalance };
    } catch (error) {
      console.error('Error fetching balances:', error);
      return { teamA: 0, teamB: 0, usdc: 0 };
    }
  }

  /**
   * Get all markets (would need an indexer in production)
   */
  async getAllMarkets(): Promise<BondingCurveMarket[]> {
    // In production, you'd use an indexer or store market list on-chain
    // For now, we'll use known markets from test data
    const knownMarkets = [
      '2QYdDgN5u4VnAV7bQXtptBHBZpGwNkkfh1bJYuQP4toH', // Latest test market
      // Add more as created
    ];

    const markets: BondingCurveMarket[] = [];
    
    for (const marketPda of knownMarkets) {
      const market = await this.getMarketData(marketPda);
      if (market) {
        markets.push(market);
      }
    }

    return markets;
  }

  /**
   * Calculate market probabilities based on supply
   */
  calculateProbabilities(market: BondingCurveMarket): { teamAProb: number; teamBProb: number } {
    // In a bonding curve, we can use the pool value distribution
    // or token supplies to estimate probabilities
    
    if (market.teamASupply === 0 && market.teamBSupply === 0) {
      return { teamAProb: 50, teamBProb: 50 };
    }

    const totalSupply = market.teamASupply + market.teamBSupply;
    const teamAProb = (market.teamASupply / totalSupply) * 100;
    const teamBProb = (market.teamBSupply / totalSupply) * 100;

    return { teamAProb, teamBProb };
  }

  private encodeU64(num: number): Buffer {
    const bn = new BN(num);
    const buf = Buffer.alloc(8);
    bn.toArrayLike(Buffer, 'le', 8).copy(buf);
    return buf;
  }
}
