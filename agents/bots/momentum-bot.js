import { BaseBot } from './base-bot.js';

/**
 * Momentum Bot
 * Follows and amplifies price trends
 */
export class MomentumBot extends BaseBot {
  constructor(config = {}) {
    super({
      ...config,
      name: config.name || 'MomentumTrader'
    });
    
    this.lookbackPeriod = config.lookbackPeriod || 10; // Look at last 10 price points
    this.momentumThreshold = config.momentumThreshold || 0.05; // 5% trend triggers action
    this.multiplier = config.multiplier || 2; // 2x position on strong trends
    this.priceHistory = new Map(); // Track price history per market
  }

  async execute(market) {
    try {
      const state = await this.getMarketState(market.publicKey);
      if (!state || state.tradingHalted) return;

      // Get current prices
      const priceA = this.calculatePrice(state.teamASupply, state.basePrice, state.slope);
      const priceB = this.calculatePrice(state.teamBSupply, state.basePrice, state.slope);

      // Update price history
      const marketKey = market.publicKey.toString();
      if (!this.priceHistory.has(marketKey)) {
        this.priceHistory.set(marketKey, { teamA: [], teamB: [] });
      }

      const history = this.priceHistory.get(marketKey);
      history.teamA.push(priceA);
      history.teamB.push(priceB);

      // Keep only recent history
      if (history.teamA.length > this.lookbackPeriod) {
        history.teamA.shift();
        history.teamB.shift();
      }

      // Need enough history to calculate momentum
      if (history.teamA.length < 3) {
        console.log(`[${this.name}] Building price history...`);
        return;
      }

      // Calculate momentum for each team
      const momentumA = this.calculateMomentum(history.teamA);
      const momentumB = this.calculateMomentum(history.teamB);

      console.log(`[${this.name}] Momentum - A: ${(momentumA * 100).toFixed(2)}%, B: ${(momentumB * 100).toFixed(2)}%`);

      // Trade based on momentum
      if (Math.abs(momentumA) > this.momentumThreshold) {
        await this.executeMomentumTrade(market, 0, momentumA, priceA);
      }

      if (Math.abs(momentumB) > this.momentumThreshold) {
        await this.executeMomentumTrade(market, 1, momentumB, priceB);
      }

    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error.message);
      this.metrics.errors++;
    }
  }

  calculateMomentum(priceHistory) {
    if (priceHistory.length < 2) return 0;

    // Simple momentum: percentage change from first to last price
    const firstPrice = priceHistory[0];
    const lastPrice = priceHistory[priceHistory.length - 1];
    
    return (lastPrice - firstPrice) / firstPrice;
  }

  async executeMomentumTrade(market, team, momentum, currentPrice) {
    const teamName = team === 0 ? 'A' : 'B';
    
    if (momentum > 0) {
      // Positive momentum - buy
      const baseSize = 10 + Math.random() * 20; // 10-30 USDC base
      const tradeSize = baseSize * (1 + Math.abs(momentum) * this.multiplier);
      
      console.log(`[${this.name}] MOMENTUM BUY: Team ${teamName} trending up ${(momentum * 100).toFixed(1)}%`);
      console.log(`[${this.name}] Buying $${tradeSize.toFixed(2)} at ${currentPrice.toFixed(4)}`);
      
      await this.buy(market.publicKey, team, tradeSize);
      
    } else {
      // Negative momentum - sell if we have position
      const position = await this.getTokenBalance(team === 0 ? market.teamAMint : market.teamBMint);
      
      if (position > 0) {
        const sellPercent = Math.min(Math.abs(momentum) * this.multiplier, 0.8); // Max 80% sell
        const sellAmount = Math.floor(position * sellPercent);
        
        console.log(`[${this.name}] MOMENTUM SELL: Team ${teamName} trending down ${(Math.abs(momentum) * 100).toFixed(1)}%`);
        console.log(`[${this.name}] Selling ${sellAmount} tokens (${(sellPercent * 100).toFixed(0)}% of position)`);
        
        await this.sell(market.publicKey, team, sellAmount);
      }
    }
  }

  getDescription() {
    return `Momentum Bot - Follows trends with ${this.momentumThreshold * 100}% threshold, ${this.multiplier}x multiplier`;
  }
}

export default MomentumBot;
