import { BaseBot } from './base-bot.js';

/**
 * Arbitrage Bot
 * Exploits price differences between teams when probabilities don't sum to ~1
 */
export class ArbitrageBot extends BaseBot {
  constructor(config = {}) {
    super({
      ...config,
      name: config.name || 'Arbitrageur'
    });
    
    this.minProfitPercent = config.minProfitPercent || 0.001; // 0.1% minimum profit
    this.maxPositionSize = config.maxPositionSize || 500; // Max 500 USDC per arbitrage
    this.aggressiveness = config.aggressiveness || 0.8; // Use 80% of available opportunity
  }

  async execute(market) {
    try {
      // Get current market state
      const state = await this.getMarketState(market.publicKey);
      if (!state || state.tradingHalted) return;

      // Calculate current prices
      const priceA = this.calculatePrice(state.teamASupply, state.basePrice, state.slope);
      const priceB = this.calculatePrice(state.teamBSupply, state.basePrice, state.slope);

      // Calculate implied probabilities (inverse of price)
      const impliedProbA = 1 / priceA;
      const impliedProbB = 1 / priceB;
      const totalProb = impliedProbA + impliedProbB;

      console.log(`[${this.name}] Prices - A: ${priceA.toFixed(4)}, B: ${priceB.toFixed(4)}`);
      console.log(`[${this.name}] Total probability: ${totalProb.toFixed(4)}`);

      // Check for arbitrage opportunity
      if (totalProb < (1 - this.minProfitPercent)) {
        // Probabilities sum to less than 1 - buy both for guaranteed profit
        await this.executeArbitrage(market, priceA, priceB, totalProb);
      } else if (Math.abs(priceA - priceB) > 0.3 && totalProb > 1.05) {
        // Large price divergence - bet on convergence
        await this.executeConvergenceTrade(market, priceA, priceB);
      }

    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error.message);
      this.metrics.errors++;
    }
  }

  async executeArbitrage(market, priceA, priceB, totalProb) {
    const expectedProfit = (1 - totalProb);
    const investmentSize = Math.min(
      this.maxPositionSize * this.aggressiveness,
      100 // Cap at 100 USDC per trade
    );

    // Calculate implied probabilities
    const impliedProbA = 1 / priceA;
    const impliedProbB = 1 / priceB;
    
    // Calculate optimal allocation between teams
    const optimalA = investmentSize * (impliedProbB / totalProb);
    const optimalB = investmentSize * (impliedProbA / totalProb);

    console.log(`[${this.name}] ARBITRAGE OPPORTUNITY! Expected profit: ${(expectedProfit * 100).toFixed(2)}%`);
    console.log(`[${this.name}] Buying $${optimalA.toFixed(2)} of Team A and $${optimalB.toFixed(2)} of Team B`);

    // Execute both buys
    await this.buy(market.publicKey, 0, optimalA);
    await this.buy(market.publicKey, 1, optimalB);

    this.metrics.profitLoss += investmentSize * expectedProfit; // Track expected profit
  }

  async executeConvergenceTrade(market, priceA, priceB) {
    // Bet on price convergence - buy the cheaper one
    const cheaper = priceA < priceB ? 0 : 1;
    const priceDiff = Math.abs(priceA - priceB);
    
    // Size based on price difference
    const tradeSize = Math.min(
      priceDiff * 100 * this.aggressiveness,
      this.maxPositionSize
    );

    console.log(`[${this.name}] Convergence trade: Buying $${tradeSize.toFixed(2)} of Team ${cheaper === 0 ? 'A' : 'B'} (cheaper)`);
    
    await this.buy(market.publicKey, cheaper, tradeSize);
  }

  getDescription() {
    return `Arbitrage Bot - Exploits pricing inefficiencies with ${this.minProfitPercent * 100}% min profit`;
  }
}

export default ArbitrageBot;
