import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { 
  PublicKey, 
  SystemProgram, 
  Transaction,
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint
} from '@solana/spl-token';

export class BondingCurveClient {
  private program: Program;
  private provider: anchor.AnchorProvider;
  private usdcMint: PublicKey;

  constructor(
    program: Program,
    provider: anchor.AnchorProvider,
    usdcMint: PublicKey
  ) {
    this.program = program;
    this.provider = provider;
    this.usdcMint = usdcMint;
  }

  /**
   * Create a new market with bonding curves
   */
  async createMarketV2(
    gameId: string,
    teamA: string,
    teamB: string,
    k: number = 0.0001,  // Default from simulation
    n: number = 1.5      // Default from simulation
  ): Promise<{
    marketPda: PublicKey;
    teamAMint: PublicKey;
    teamBMint: PublicKey;
    usdcVault: PublicKey;
    tx: string;
  }> {
    // Scale k and n for on-chain representation
    const kScaled = new BN(k * 1e9);
    const nScaled = new BN(n * 100);

    // Derive PDAs
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(gameId)],
      this.program.programId
    );

    const [teamAMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('team_a_mint'), Buffer.from(gameId)],
      this.program.programId
    );

    const [teamBMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('team_b_mint'), Buffer.from(gameId)],
      this.program.programId
    );

    const [usdcVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('usdc_vault'), Buffer.from(gameId)],
      this.program.programId
    );

    const tx = await this.program.methods
      .createMarketV2(gameId, teamA, teamB, kScaled, nScaled)
      .accounts({
        authority: this.provider.wallet.publicKey,
        market: marketPda,
        teamAMint,
        teamBMint,
        usdcVault,
        usdcMint: this.usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('Market created:', {
      gameId,
      market: marketPda.toString(),
      tx
    });

    return {
      marketPda,
      teamAMint,
      teamBMint,
      usdcVault,
      tx
    };
  }

  /**
   * Buy team tokens on bonding curve
   */
  async buyOnCurve(
    marketPda: PublicKey,
    team: 'A' | 'B',
    usdcAmount: number,
    slippageBps: number = 100  // 1% default slippage
  ): Promise<{
    tokensReceived: number;
    tx: string;
  }> {
    const market = await this.program.account.marketV2.fetch(marketPda);
    
    // Calculate expected tokens and min out with slippage
    const currentSupply = team === 'A' 
      ? market.teamASupply.toNumber() 
      : market.teamBSupply.toNumber();
    
    const expectedTokens = this.calculateTokensOut(
      usdcAmount,
      currentSupply,
      market.kValue.toNumber() / 1e9,
      market.nValue.toNumber() / 100
    );
    
    const minTokensOut = new BN(
      expectedTokens * (10000 - slippageBps) / 10000
    );

    // Get user token accounts
    const teamAMint = market.teamAMint;
    const teamBMint = market.teamBMint;
    
    const buyerTeamAAccount = await getAssociatedTokenAddress(
      teamAMint,
      this.provider.wallet.publicKey
    );
    
    const buyerTeamBAccount = await getAssociatedTokenAddress(
      teamBMint,
      this.provider.wallet.publicKey
    );
    
    const buyerUsdcAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      this.provider.wallet.publicKey
    );

    // Create ATAs if needed
    const tx = new Transaction();
    
    if (!(await this.provider.connection.getAccountInfo(buyerTeamAAccount))) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          this.provider.wallet.publicKey,
          buyerTeamAAccount,
          this.provider.wallet.publicKey,
          teamAMint
        )
      );
    }
    
    if (!(await this.provider.connection.getAccountInfo(buyerTeamBAccount))) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          this.provider.wallet.publicKey,
          buyerTeamBAccount,
          this.provider.wallet.publicKey,
          teamBMint
        )
      );
    }

    // Add buy instruction
    const buyIx = await this.program.methods
      .buyOnCurve(
        team === 'A' ? 0 : 1,
        new BN(usdcAmount * 1e6),  // Convert to USDC decimals
        minTokensOut
      )
      .accounts({
        buyer: this.provider.wallet.publicKey,
        market: marketPda,
        teamAMint,
        teamBMint,
        buyerTeamAAccount,
        buyerTeamBAccount,
        buyerUsdc: buyerUsdcAccount,
        usdcVault: market.usdcVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    
    tx.add(buyIx);

    const txSig = await sendAndConfirmTransaction(
      this.provider.connection,
      tx,
      [this.provider.wallet.payer]
    );

    console.log('Buy successful:', {
      team,
      usdcAmount,
      expectedTokens,
      tx: txSig
    });

    return {
      tokensReceived: expectedTokens,
      tx: txSig
    };
  }

  /**
   * Sell team tokens on bonding curve
   */
  async sellOnCurve(
    marketPda: PublicKey,
    team: 'A' | 'B',
    tokenAmount: number,
    slippageBps: number = 100
  ): Promise<{
    usdcReceived: number;
    tx: string;
  }> {
    const market = await this.program.account.marketV2.fetch(marketPda);
    
    // Calculate expected USDC and min out with slippage
    const currentSupply = team === 'A' 
      ? market.teamASupply.toNumber() 
      : market.teamBSupply.toNumber();
    
    const expectedUsdc = this.calculateUsdcOut(
      tokenAmount,
      currentSupply,
      market.kValue.toNumber() / 1e9,
      market.nValue.toNumber() / 100
    );
    
    const minUsdcOut = new BN(
      expectedUsdc * (10000 - slippageBps) / 10000 * 1e6
    );

    // Get accounts
    const teamAMint = market.teamAMint;
    const teamBMint = market.teamBMint;
    
    const sellerTeamAAccount = await getAssociatedTokenAddress(
      teamAMint,
      this.provider.wallet.publicKey
    );
    
    const sellerTeamBAccount = await getAssociatedTokenAddress(
      teamBMint,
      this.provider.wallet.publicKey
    );
    
    const sellerUsdcAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      this.provider.wallet.publicKey
    );

    const tx = await this.program.methods
      .sellOnCurve(
        team === 'A' ? 0 : 1,
        new BN(tokenAmount * 1e6),
        minUsdcOut
      )
      .accounts({
        seller: this.provider.wallet.publicKey,
        market: marketPda,
        teamAMint,
        teamBMint,
        sellerTeamAAccount,
        sellerTeamBAccount,
        sellerUsdc: sellerUsdcAccount,
        usdcVault: market.usdcVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Sell successful:', {
      team,
      tokenAmount,
      expectedUsdc,
      tx
    });

    return {
      usdcReceived: expectedUsdc,
      tx
    };
  }

  /**
   * Get current market data
   */
  async getMarketData(marketPda: PublicKey) {
    const market = await this.program.account.marketV2.fetch(marketPda);
    
    const teamASupply = market.teamASupply.toNumber() / 1e6;
    const teamBSupply = market.teamBSupply.toNumber() / 1e6;
    const poolValue = market.poolValue.toNumber() / 1e6;
    
    // Calculate current prices
    const k = market.kValue.toNumber() / 1e9;
    const n = market.nValue.toNumber() / 100;
    
    const teamAPrice = this.calculatePrice(teamASupply, k, n);
    const teamBPrice = this.calculatePrice(teamBSupply, k, n);
    
    // Calculate implied probabilities (simplified)
    const totalValue = teamASupply * teamAPrice + teamBSupply * teamBPrice;
    const teamAProb = totalValue > 0 
      ? (teamASupply * teamAPrice) / totalValue * 100 
      : 50;
    const teamBProb = totalValue > 0 
      ? (teamBSupply * teamBPrice) / totalValue * 100 
      : 50;

    return {
      gameId: market.gameId,
      teamA: market.teamA,
      teamB: market.teamB,
      teamASupply,
      teamBSupply,
      teamAPrice,
      teamBPrice,
      teamAProb: teamAProb.toFixed(1) + '%',
      teamBProb: teamBProb.toFixed(1) + '%',
      poolValue,
      tradingHalted: market.tradingHalted,
      isResolved: market.isResolved,
      winner: market.winner
    };
  }

  /**
   * Calculate tokens received for USDC amount
   */
  private calculateTokensOut(
    usdcAmount: number,
    currentSupply: number,
    k: number,
    n: number
  ): number {
    let tokensOut = 0;
    const steps = 100;
    const usdcPerStep = usdcAmount / steps;
    
    for (let i = 0; i < steps; i++) {
      const price = this.calculatePrice(currentSupply + tokensOut, k, n);
      if (price === 0) return 0;
      
      const tokensThisStep = usdcPerStep / price;
      tokensOut += tokensThisStep;
    }
    
    return Math.floor(tokensOut * 1e6) / 1e6;
  }

  /**
   * Calculate USDC received for token amount
   */
  private calculateUsdcOut(
    tokenAmount: number,
    currentSupply: number,
    k: number,
    n: number
  ): number {
    let usdcOut = 0;
    const steps = 100;
    const tokensPerStep = tokenAmount / steps;
    
    for (let i = 0; i < steps; i++) {
      const supplyAtStep = currentSupply - (tokensPerStep * i);
      const price = this.calculatePrice(supplyAtStep, k, n);
      
      const usdcThisStep = tokensPerStep * price;
      usdcOut += usdcThisStep;
    }
    
    return Math.floor(usdcOut * 100) / 100;
  }

  /**
   * Calculate price at given supply
   */
  private calculatePrice(supply: number, k: number, n: number): number {
    if (supply <= 0) return k;
    return k * Math.pow(supply, n);
  }

  /**
   * Halt trading (admin only)
   */
  async haltTrading(marketPda: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .haltTrading()
      .accounts({
        authority: this.provider.wallet.publicKey,
        market: marketPda,
      })
      .rpc();

    console.log('Trading halted:', tx);
    return tx;
  }

  /**
   * Resolve market with winner (admin only)
   */
  async resolveMarket(
    marketPda: PublicKey,
    winner: 'A' | 'B'
  ): Promise<string> {
    const tx = await this.program.methods
      .resolveMarket(winner === 'A' ? 0 : 1)
      .accounts({
        authority: this.provider.wallet.publicKey,
        market: marketPda,
      })
      .rpc();

    console.log('Market resolved:', {
      winner,
      tx
    });
    return tx;
  }

  /**
   * Claim winnings after resolution
   */
  async claimWinnings(marketPda: PublicKey): Promise<{
    payout: number;
    tx: string;
  }> {
    const market = await this.program.account.marketV2.fetch(marketPda);
    
    // Get user accounts
    const userTeamAAccount = await getAssociatedTokenAddress(
      market.teamAMint,
      this.provider.wallet.publicKey
    );
    
    const userTeamBAccount = await getAssociatedTokenAddress(
      market.teamBMint,
      this.provider.wallet.publicKey
    );
    
    const userUsdcAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      this.provider.wallet.publicKey
    );

    const tx = await this.program.methods
      .claimWinnings()
      .accounts({
        user: this.provider.wallet.publicKey,
        market: marketPda,
        teamAMint: market.teamAMint,
        teamBMint: market.teamBMint,
        userTeamAAccount,
        userTeamBAccount,
        userUsdc: userUsdcAccount,
        usdcVault: market.usdcVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Winnings claimed:', tx);

    // Calculate actual payout (would need to check balances)
    return {
      payout: 0,  // TODO: Calculate from events
      tx
    };
  }
}

export default BondingCurveClient;
