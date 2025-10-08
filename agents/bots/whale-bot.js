import { BaseBot } from './base-bot.js';

/**
 * Whale Bot
 * Makes large trades to move markets significantly
 */
export class WhaleBot extends BaseBot {
  constructor(config = {}) {
    super({
      ...config,
      name: config.name || 'Whale'
    });
    
    this.minTradeSize = config.minTradeSize || 100; // Min 100 USDC
    this.maxTradeSize = config.maxTradeSize || 1000; // Max 1000 USDC
    this.frequency = config.frequency || 0.05; // 5% chance to trade per tick
    this.strategy = config.strategy || 'value'; // value, pump, dump, manipulate
    this.targetTeam = config.targetTeam || null; // Preference for a team
  }

  async execute(market) {
    try {
      // Whales trade infrequently but with size
      if (Math.random() > this.frequency) return;

      const state = await this.getMarketState(market.publicKey);
      if (!state || state.tradingHalted) return;

      // Execute strategy
      switch (this.strategy) {
        case 'value':
          await this.executeValueStrategy(market, state);
          break;
        case 'pump':
          await this.executePumpStrategy(market, state);
          break;
        case 'dump':
          await this.executeDumpStrategy(market, state);
          break;
        case 'manipulate':
          await this.executeManipulationStrategy(market, state);
          break;
        default:
          await this.executeValueStrategy(market, state);
      }

    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error.message);
      this.metrics.errors++;
    }
  }

  async executeValueStrategy(market, state) {
    // Look for undervalued teams based on supply imbalance
    const priceA = this.calculatePrice(state.teamASupply, state.basePrice, state.slope);
    const priceB = this.calculatePrice(state.teamBSupply, state.basePrice, state.slope);
    
    // Buy the cheaper team with conviction
    const cheaperTeam = priceA < priceB ? 0 : 1;
    const priceDiff = Math.abs(priceA - priceB);
    
    if (priceDiff > 0.2) { // Significant price difference
      const tradeSize = this.minTradeSize + Math.random() * (this.maxTradeSize - this.minTradeSize);
      
      console.log(`[${this.name}] VALUE INVESTMENT: Team ${cheaperTeam === 0 ? 'A' : 'B'} undervalued by ${(priceDiff * 100).toFixed(1)}%`);
      console.log(`[${this.name}] Investing $${tradeSize.toFixed(2)} at ${(cheaperTeam === 0 ? priceA : priceB).toFixed(4)}`);
      
      await this.buy(market.publicKey, cheaperTeam, tradeSize);
    }
  }

  async executePumpStrategy(market, state) {
    // Pump a specific team's price
    const targetTeam = this.targetTeam !== null ? 
      (this.targetTeam === 'A' ? 0 : 1) : 
      Math.floor(Math.random() * 2);
    
    const tradeSize = this.maxTradeSize * (0.7 + Math.random() * 0.3); // 70-100% of max
    
    console.log(`[${this.name}] PUMP: Driving up Team ${targetTeam === 0 ? 'A' : 'B'} price`);
    console.log(`[${this.name}] Massive buy: $${tradeSize.toFixed(2)}`);
    
    // Execute multiple smaller buys to create momentum
    const numBuys = 3;
    for (let i = 0; i < numBuys; i++) {
      await this.buy(market.publicKey, targetTeam, tradeSize / numBuys);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between buys
    }
  }

  async executeDumpStrategy(market, state) {
    // Dump positions to crash price
    const teamA = await this.getTokenBalance(market.teamAMint);
    const teamB = await this.getTokenBalance(market.teamBMint);
    
    if (teamA > 100 || teamB > 100) {
      const dumpTeam = teamA > teamB ? 0 : 1;
      const dumpAmount = Math.floor((dumpTeam === 0 ? teamA : teamB) * 0.8); // Dump 80%
      
      console.log(`[${this.name}] DUMP: Crashing Team ${dumpTeam === 0 ? 'A' : 'B'} price`);
      console.log(`[${this.name}] Dumping ${dumpAmount} tokens`);
      
      await this.sell(market.publicKey, dumpTeam, dumpAmount);
    } else {
      // No position to dump, maybe pump first
      await this.executePumpStrategy(market, state);
    }
  }

  async executeManipulationStrategy(market, state) {
    // Create false signals by alternating buys/sells
    const priceA = this.calculatePrice(state.teamASupply, state.basePrice, state.slope);
    const priceB = this.calculatePrice(state.teamBSupply, state.basePrice, state.slope);
    
    // Alternate between teams to create volatility
    const lastTrade = this.metrics.lastTrade;
    const targetTeam = lastTrade && lastTrade.team === 0 ? 1 : 0;
    
    const tradeSize = this.minTradeSize + Math.random() * 200; // 100-300 USDC
    
    console.log(`[${this.name}] MANIPULATION: Creating volatility`);
    console.log(`[${this.name}] ${lastTrade?.type === 'buy' ? 'Selling' : 'Buying'} Team ${targetTeam === 0 ? 'A' : 'B'} with $${tradeSize.toFixed(2)}`);
    
    if (lastTrade?.type === 'buy') {
      // Try to sell if we have position
      const position = await this.getTokenBalance(targetTeam === 0 ? market.teamAMint : market.teamBMint);
      if (position > 0) {
        await this.sell(market.publicKey, targetTeam, Math.floor(position * 0.5));
      } else {
        await this.buy(market.publicKey, targetTeam, tradeSize);
      }
    } else {
      await this.buy(market.publicKey, targetTeam, tradeSize);
    }
  }

  getDescription() {
    return `Whale Bot - ${this.strategy} strategy with $${this.minTradeSize}-${this.maxTradeSize} trades`;
  }
}

export default WhaleBot;
