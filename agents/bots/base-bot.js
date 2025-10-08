import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import BN from 'bn.js';

/**
 * Base Bot Class
 * All bots inherit from this
 */
export class BaseBot {
  constructor(config = {}) {
    this.name = config.name || 'BaseBot';
    this.wallet = config.wallet || this.generateWallet();
    this.connection = config.connection;
    this.programId = config.programId;
    this.maxPositionSize = config.maxPositionSize || 100; // Max 100 USDC position
    this.minTradeSize = config.minTradeSize || 1; // Min 1 USDC trade
    this.tradingEnabled = true;
    this.metrics = {
      tradesExecuted: 0,
      profitLoss: 0,
      errors: 0,
      lastTrade: null
    };
  }

  generateWallet() {
    return Keypair.generate();
  }

  async initialize(connection, programId) {
    this.connection = connection;
    this.programId = new PublicKey(programId);
    
    // Fund wallet if needed
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    if (balance < 1000000) { // Less than 0.001 SOL
      console.log(`[${this.name}] Requesting airdrop...`);
      try {
        const sig = await this.connection.requestAirdrop(
          this.wallet.publicKey,
          2000000000 // 2 SOL
        );
        await this.connection.confirmTransaction(sig);
        console.log(`[${this.name}] Airdrop successful`);
      } catch (error) {
        console.error(`[${this.name}] Airdrop failed:`, error.message);
      }
    }
  }

  /**
   * Get current market state
   */
  async getMarketState(marketPda) {
    try {
      // Check if we have a program with account methods (simulation mode)
      if (this.program && this.program.account && this.program.account.marketV2) {
        return await this.program.account.marketV2.fetch(marketPda);
      }
      
      // Fallback to simulated data for testing
      return {
        teamASupply: Math.floor(Math.random() * 1000) + 100,
        teamBSupply: Math.floor(Math.random() * 1000) + 100,
        poolValue: Math.floor(Math.random() * 10000) * 1000000,
        basePrice: 100000,
        slope: 10000,
        tradingHalted: false
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching market state:`, error.message);
      // Return simulated data on error
      return {
        teamASupply: 500,
        teamBSupply: 500,
        poolValue: 10000000,
        basePrice: 100000,
        slope: 10000,
        tradingHalted: false
      };
    }
  }

  /**
   * Calculate current price for a team
   */
  calculatePrice(supply, basePrice, slope) {
    return basePrice + (slope * supply / 1000000);
  }

  /**
   * Calculate tokens received for USDC amount
   */
  calculateTokensOut(usdcAmount, currentSupply, basePrice, slope) {
    const startPrice = this.calculatePrice(currentSupply, basePrice, slope);
    if (startPrice === 0) return 0;
    
    // Simplified calculation
    return Math.floor((usdcAmount * 1000000) / startPrice);
  }

  /**
   * Get bot's token balance
   */
  async getTokenBalance(mintAddress) {
    try {
      const tokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(mintAddress),
        this.wallet.publicKey
      );
      
      const account = await getAccount(this.connection, tokenAccount);
      return Number(account.amount) / 1000000; // Convert to USDC decimals
    } catch {
      return 0; // No account means 0 balance
    }
  }

  /**
   * Get current position for a team (simulation mode)
   */
  getPosition(market, team) {
    // In simulation, return a random position
    return Math.floor(Math.random() * 100);
  }

  /**
   * Get current price for a team
   */
  async getCurrentPrice(market, team) {
    const state = await this.getMarketState(market.publicKey);
    if (!state) return 0.1; // Default price
    
    const supply = team === 'A' ? state.teamASupply : state.teamBSupply;
    return this.calculatePrice(supply, state.basePrice, state.slope) / 1000000; // Convert to USDC
  }

  /**
   * Execute buy order
   */
  async buy(marketPda, team, usdcAmount) {
    try {
      console.log(`[${this.name}] Buying ${usdcAmount} USDC of Team ${team === 0 ? 'A' : 'B'}`);
      
      // In production, this would create and send the actual transaction
      // For now, we'll simulate it
      this.metrics.tradesExecuted++;
      this.metrics.lastTrade = {
        type: 'buy',
        team,
        amount: usdcAmount,
        timestamp: Date.now()
      };
      
      return {
        success: true,
        signature: 'simulated_' + Math.random().toString(36)
      };
    } catch (error) {
      console.error(`[${this.name}] Buy failed:`, error.message);
      this.metrics.errors++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute sell order
   */
  async sell(marketPda, team, tokenAmount) {
    try {
      console.log(`[${this.name}] Selling ${tokenAmount} tokens of Team ${team === 0 ? 'A' : 'B'}`);
      
      // In production, this would create and send the actual transaction
      // For now, we'll simulate it
      this.metrics.tradesExecuted++;
      this.metrics.lastTrade = {
        type: 'sell',
        team,
        amount: tokenAmount,
        timestamp: Date.now()
      };
      
      return {
        success: true,
        signature: 'simulated_' + Math.random().toString(36)
      };
    } catch (error) {
      console.error(`[${this.name}] Sell failed:`, error.message);
      this.metrics.errors++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Main execution loop - to be overridden by child classes
   */
  async execute(market) {
    throw new Error('Execute method must be implemented by child class');
  }

  /**
   * Get bot metrics
   */
  getMetrics() {
    return {
      name: this.name,
      ...this.metrics,
      walletAddress: this.wallet.publicKey.toString()
    };
  }

  /**
   * Stop trading
   */
  stop() {
    this.tradingEnabled = false;
    console.log(`[${this.name}] Trading stopped`);
  }

  /**
   * Resume trading
   */
  start() {
    this.tradingEnabled = true;
    console.log(`[${this.name}] Trading resumed`);
  }
}

/**
 * Helper function to encode u64 for Anchor
 */
export function encodeU64(num) {
  const bn = new BN(num);
  const buf = Buffer.alloc(8);
  bn.toArrayLike(Buffer, 'le', 8).copy(buf);
  return buf;
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
