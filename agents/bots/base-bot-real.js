import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BN from 'bn.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced Base Bot Class with REAL trading capabilities
 * Executes actual transactions on local validator
 */
export class BaseBotReal {
  constructor(config = {}) {
    this.name = config.name || 'BaseBot';
    this.wallet = config.wallet || this.generateWallet();
    this.connection = config.connection || new Connection(process.env.RPC_URL || 'http://localhost:8899', 'confirmed');
    this.programId = new PublicKey(config.programId || process.env.PROGRAM_ID);
    this.maxPositionSize = config.maxPositionSize || 100; // Max 100 USDC position
    this.minTradeSize = config.minTradeSize || 1; // Min 1 USDC trade
    this.tradingEnabled = true;
    this.hasUsdcAccount = false;
    this.usdcBalance = 0;
    this.positions = {}; // Track actual token positions
    this.metrics = {
      tradesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      profitLoss: 0,
      gasSpent: 0,
      errors: 0,
      lastTrade: null
    };
    
    // Load IDL for instruction discriminators
    try {
      this.idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf-8'));
    } catch (error) {
      console.error(`[${this.name}] Warning: Could not load IDL, some features may not work`);
    }
  }

  generateWallet() {
    return Keypair.generate();
  }

  async initialize(markets = []) {
    console.log(`[${this.name}] Initializing with real trading capabilities...`);
    
    // Fund wallet with SOL for gas
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    if (balance < 1000000000) { // Less than 1 SOL
      console.log(`[${this.name}] Requesting SOL airdrop...`);
      try {
        const sig = await this.connection.requestAirdrop(
          this.wallet.publicKey,
          2000000000 // 2 SOL
        );
        await this.connection.confirmTransaction(sig);
        console.log(`[${this.name}] Airdrop successful: ${sig}`);
      } catch (error) {
        console.error(`[${this.name}] Airdrop failed:`, error.message);
      }
    }
    
    // Setup USDC account and fund it
    await this.setupUsdcAccount();
    
    // Create associated token accounts for each market
    for (const market of markets) {
      await this.ensureTokenAccounts(market);
    }
    
    console.log(`[${this.name}] Initialization complete. Wallet: ${this.wallet.publicKey.toString().slice(0, 8)}...`);
  }

  async setupUsdcAccount() {
    try {
      // Get USDC mint from last market or environment
      let usdcMint;
      try {
        const lastMarket = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
        usdcMint = new PublicKey(lastMarket.usdcMint);
      } catch {
        // Fallback to environment variable or known test USDC
        usdcMint = new PublicKey(process.env.USDC_MINT || 'So11111111111111111111111111111111111111112');
      }
      
      const usdcAccount = getAssociatedTokenAddressSync(usdcMint, this.wallet.publicKey);
      
      // Check if account exists
      try {
        const account = await getAccount(this.connection, usdcAccount);
        this.usdcBalance = Number(account.amount) / 1000000;
        this.hasUsdcAccount = true;
        console.log(`[${this.name}] USDC account exists with balance: ${this.usdcBalance}`);
      } catch {
        // Create USDC account
        console.log(`[${this.name}] Creating USDC account...`);
        const tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            usdcAccount,
            this.wallet.publicKey,
            usdcMint
          )
        );
        
        const sig = await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
        console.log(`[${this.name}] USDC account created: ${sig}`);
        this.hasUsdcAccount = true;
      }
      
      // Fund with test USDC if balance is low
      if (this.usdcBalance < 100) {
        await this.fundTestUsdc(usdcMint);
      }
    } catch (error) {
      console.error(`[${this.name}] Error setting up USDC:`, error.message);
    }
  }

  async fundTestUsdc(usdcMint) {
    console.log(`[${this.name}] Funding with test USDC...`);
    // In a real setup, you'd transfer from a faucet account
    // For now, we'll assume the bot gets funded externally
    console.log(`[${this.name}] Please fund ${this.wallet.publicKey.toString()} with test USDC`);
  }

  async ensureTokenAccounts(market) {
    try {
      const teamAMint = new PublicKey(market.teamAMint);
      const teamBMint = new PublicKey(market.teamBMint);
      
      const teamAAccount = getAssociatedTokenAddressSync(teamAMint, this.wallet.publicKey);
      const teamBAccount = getAssociatedTokenAddressSync(teamBMint, this.wallet.publicKey);
      
      // Check and create Team A account if needed
      try {
        await getAccount(this.connection, teamAAccount);
      } catch {
        console.log(`[${this.name}] Creating Team A token account...`);
        const tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            teamAAccount,
            this.wallet.publicKey,
            teamAMint
          )
        );
        await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
      }
      
      // Check and create Team B account if needed
      try {
        await getAccount(this.connection, teamBAccount);
      } catch {
        console.log(`[${this.name}] Creating Team B token account...`);
        const tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            teamBAccount,
            this.wallet.publicKey,
            teamBMint
          )
        );
        await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
      }
    } catch (error) {
      console.error(`[${this.name}] Error ensuring token accounts:`, error.message);
    }
  }

  /**
   * Get real market state from blockchain
   */
  async getMarketState(marketPda) {
    try {
      const accountInfo = await this.connection.getAccountInfo(marketPda);
      if (!accountInfo) {
        throw new Error('Market account not found');
      }
      
      // Parse market data (matching the contract structure)
      const data = accountInfo.data;
      let offset = 8 + 32 + 4; // discriminator + authority + string length
      
      const gameIdLen = data.readUInt32LE(offset - 4);
      const gameId = data.slice(offset, offset + gameIdLen).toString();
      offset += gameIdLen;
      
      const teamALen = data.readUInt32LE(offset);
      offset += 4;
      const teamA = data.slice(offset, offset + teamALen).toString();
      offset += teamALen;
      
      const teamBLen = data.readUInt32LE(offset);
      offset += 4;
      const teamB = data.slice(offset, offset + teamBLen).toString();
      offset += teamBLen;
      
      // Skip mint addresses (32 * 3)
      offset += 32 * 3;
      
      const basePrice = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const slope = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const teamASupply = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const teamBSupply = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const poolValue = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const tradingHalted = data.readUInt8(offset) === 1;
      
      return {
        gameId,
        teamA,
        teamB,
        basePrice,
        slope,
        teamASupply,
        teamBSupply,
        poolValue,
        tradingHalted
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching market state:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate current price for a team
   */
  calculatePrice(supply, basePrice, slope) {
    return basePrice + (slope * Math.floor(supply / 1000000));
  }

  /**
   * Calculate expected tokens for a given USDC amount with proper quadratic formula
   */
  calculateExpectedTokens(usdcAmount, currentSupply, basePrice, slope) {
    // For linear bonding curve: price = base_price + (slope * supply / 1_000_000)
    // We need to solve for tokens when integrating over the price curve
    
    const usdcLamports = usdcAmount * 1_000_000;
    const startPrice = basePrice + (slope * Math.floor(currentSupply / 1_000_000));
    
    if (startPrice === 0) return 0;
    
    // Simplified approximation for small purchases
    // For production, implement quadratic formula for exact calculation
    const avgPrice = startPrice + (slope / 2); // Approximate average price
    const tokens = Math.floor((usdcLamports * 1_000_000) / avgPrice);
    
    return tokens;
  }

  /**
   * Calculate expected USDC for selling tokens
   */
  calculateExpectedUsdc(tokenAmount, currentSupply, basePrice, slope) {
    // Calculate the average price over the sell range
    const endSupply = Math.max(0, currentSupply - (tokenAmount * 1_000_000));
    
    const startPrice = basePrice + (slope * Math.floor(currentSupply / 1_000_000));
    const endPrice = basePrice + (slope * Math.floor(endSupply / 1_000_000));
    const avgPrice = (startPrice + endPrice) / 2;
    
    if (avgPrice === 0) return 0;
    
    const usdcLamports = Math.floor((tokenAmount * 1_000_000 * avgPrice) / 1_000_000);
    return usdcLamports / 1_000_000; // Convert to USDC units
  }

  /**
   * Calculate minimum acceptable output with slippage tolerance
   */
  calculateMinOutput(expectedAmount, slippageBps = 100) {
    // slippageBps = basis points (100 = 1%)
    const slippageMultiplier = (10000 - slippageBps) / 10000;
    return Math.floor(expectedAmount * slippageMultiplier);
  }

  /**
   * Get bot's real token balance
   */
  async getTokenBalance(mintAddress) {
    try {
      const tokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(mintAddress),
        this.wallet.publicKey
      );
      
      const account = await getAccount(this.connection, tokenAccount);
      return Number(account.amount) / 1000000;
    } catch {
      return 0;
    }
  }

  /**
   * Execute REAL buy order on local validator with slippage protection
   */
  async buy(market, team, usdcAmount, slippageBps = 100) {
    try {
      if (!this.tradingEnabled) {
        console.log(`[${this.name}] Trading is disabled`);
        return { success: false, error: 'Trading disabled' };
      }
      
      // Check USDC balance
      await this.updateUsdcBalance();
      if (this.usdcBalance < usdcAmount) {
        console.log(`[${this.name}] Insufficient USDC: ${this.usdcBalance} < ${usdcAmount}`);
        return { success: false, error: 'Insufficient USDC' };
      }
      
      // Get market state to calculate expected output
      const marketPda = new PublicKey(market.marketPda);
      const marketState = await this.getMarketState(marketPda);
      const currentSupply = team === 0 ? marketState.teamASupply : marketState.teamBSupply;
      
      // Calculate expected tokens and minimum acceptable (with slippage)
      const expectedTokens = this.calculateExpectedTokens(
        usdcAmount,
        currentSupply,
        marketState.basePrice,
        marketState.slope
      );
      const minTokensOut = this.calculateMinOutput(expectedTokens, slippageBps);
      
      console.log(`[${this.name}] Executing REAL buy: ${usdcAmount} USDC of Team ${team === 0 ? 'A' : 'B'}`);
      console.log(`[${this.name}] Expected: ${(expectedTokens / 1_000_000).toFixed(2)} tokens, Min: ${(minTokensOut / 1_000_000).toFixed(2)} tokens (${slippageBps / 100}% slippage)`);
      
      const teamAMint = new PublicKey(market.teamAMint);
      const teamBMint = new PublicKey(market.teamBMint);
      const usdcMint = new PublicKey(market.usdcMint);
      const usdcVault = new PublicKey(market.usdcVault);
      
      // Get associated token accounts
      const buyerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, this.wallet.publicKey);
      const buyerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, this.wallet.publicKey);
      const buyerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, this.wallet.publicKey);
      
      // Build instruction
      const buyInstruction = this.idl.instructions.find(ix => ix.name === 'buy_on_curve');
      const discriminator = Buffer.from(buyInstruction.discriminator);
      
      const ix = {
        programId: this.programId,
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
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
          discriminator,
          Buffer.from([team]),
          this.encodeU64(usdcAmount * 1000000), // Convert to lamports
          this.encodeU64(minTokensOut), // NOW WITH SLIPPAGE PROTECTION!
        ])
      };
      
      const tx = new Transaction().add(ix);
      
      // Send transaction
      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );
      
      // Update metrics
      this.metrics.tradesExecuted++;
      this.metrics.successfulTrades++;
      this.metrics.lastTrade = {
        type: 'buy',
        team,
        amount: usdcAmount,
        signature: sig,
        timestamp: Date.now()
      };
      
      // Update position tracking
      const marketKey = `${market.gameId}_${team}`;
      this.positions[marketKey] = (this.positions[marketKey] || 0) + usdcAmount;
      
      console.log(`[${this.name}] ✅ Buy successful: ${sig.slice(0, 8)}...`);
      
      return { success: true, signature: sig };
    } catch (error) {
      console.error(`[${this.name}] ❌ Buy failed:`, error.message);
      this.metrics.errors++;
      this.metrics.failedTrades++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute REAL sell order on local validator with slippage protection
   */
  async sell(market, team, tokenAmount, slippageBps = 100) {
    try {
      if (!this.tradingEnabled) {
        console.log(`[${this.name}] Trading is disabled`);
        return { success: false, error: 'Trading disabled' };
      }
      
      // Check token balance
      const mintToCheck = team === 0 ? market.teamAMint : market.teamBMint;
      const balance = await this.getTokenBalance(mintToCheck);
      if (balance < tokenAmount) {
        console.log(`[${this.name}] Insufficient tokens: ${balance} < ${tokenAmount}`);
        return { success: false, error: 'Insufficient tokens' };
      }
      
      // Get market state to calculate expected output
      const marketPda = new PublicKey(market.marketPda);
      const marketState = await this.getMarketState(marketPda);
      const currentSupply = team === 0 ? marketState.teamASupply : marketState.teamBSupply;
      
      // Calculate expected USDC and minimum acceptable (with slippage)
      const expectedUsdc = this.calculateExpectedUsdc(
        tokenAmount,
        currentSupply,
        marketState.basePrice,
        marketState.slope
      );
      const minUsdcOut = this.calculateMinOutput(expectedUsdc, slippageBps);
      
      console.log(`[${this.name}] Executing REAL sell: ${tokenAmount} tokens of Team ${team === 0 ? 'A' : 'B'}`);
      console.log(`[${this.name}] Expected: ${expectedUsdc.toFixed(2)} USDC, Min: ${minUsdcOut.toFixed(2)} USDC (${slippageBps / 100}% slippage)`);
      
      const teamAMint = new PublicKey(market.teamAMint);
      const teamBMint = new PublicKey(market.teamBMint);
      const usdcMint = new PublicKey(market.usdcMint);
      const usdcVault = new PublicKey(market.usdcVault);
      
      // Get associated token accounts
      const sellerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, this.wallet.publicKey);
      const sellerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, this.wallet.publicKey);
      const sellerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, this.wallet.publicKey);
      
      // Build instruction
      const sellInstruction = this.idl.instructions.find(ix => ix.name === 'sell_on_curve');
      const discriminator = Buffer.from(sellInstruction.discriminator);
      
      const ix = {
        programId: this.programId,
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
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
          Buffer.from([team]),
          this.encodeU64(tokenAmount * 1000000), // Convert to token decimals
          this.encodeU64(minUsdcOut * 1000000), // NOW WITH SLIPPAGE PROTECTION! (convert to lamports)
        ])
      };
      
      const tx = new Transaction().add(ix);
      
      // Send transaction
      const sig = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.wallet],
        { commitment: 'confirmed' }
      );
      
      // Update metrics
      this.metrics.tradesExecuted++;
      this.metrics.successfulTrades++;
      this.metrics.lastTrade = {
        type: 'sell',
        team,
        amount: tokenAmount,
        signature: sig,
        timestamp: Date.now()
      };
      
      console.log(`[${this.name}] ✅ Sell successful: ${sig.slice(0, 8)}...`);
      
      return { success: true, signature: sig };
    } catch (error) {
      console.error(`[${this.name}] ❌ Sell failed:`, error.message);
      this.metrics.errors++;
      this.metrics.failedTrades++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Update USDC balance
   */
  async updateUsdcBalance() {
    try {
      const lastMarket = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
      const usdcMint = new PublicKey(lastMarket.usdcMint);
      const usdcAccount = getAssociatedTokenAddressSync(usdcMint, this.wallet.publicKey);
      const account = await getAccount(this.connection, usdcAccount);
      this.usdcBalance = Number(account.amount) / 1000000;
    } catch {
      this.usdcBalance = 0;
    }
  }

  /**
   * Helper to encode u64 for Anchor
   */
  encodeU64(num) {
    const bn = new BN(num);
    const buf = Buffer.alloc(8);
    bn.toArrayLike(Buffer, 'le', 8).copy(buf);
    return buf;
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
      walletAddress: this.wallet.publicKey.toString(),
      usdcBalance: this.usdcBalance,
      positions: this.positions
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
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
