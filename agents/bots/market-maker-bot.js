/**
 * Market Maker Bot
 * Provides liquidity by maintaining positions on both sides
 */

import { BaseBot } from './base-bot.js';

export class MarketMakerBot extends BaseBot {
    constructor(config = {}) {
        super('MarketMaker', config);
        
        // Market maker specific config
        this.spreadPercent = config.spreadPercent || 0.02;  // 2% spread
        this.maxPositionUSDC = config.maxPositionUSDC || 100;  // Max 100 USDC exposure per side
        this.minTradeSize = config.minTradeSize || 5;  // Min 5 USDC per trade
        this.maxTradeSize = config.maxTradeSize || 20;  // Max 20 USDC per trade
        this.rebalanceThreshold = 0.7;  // Rebalance when 70% exposed on one side
    }

    async execute(market) {
        try {
            // Get current market state
            const marketData = await this.program.account.marketV2.fetch(market.publicKey);
            
            // Get current prices for both teams
            const priceA = await this.getCurrentPrice(market, 'A');
            const priceB = await this.getCurrentPrice(market, 'B');
            
            // Get our current positions
            const positionA = this.getPosition(market, 'A');
            const positionB = this.getPosition(market, 'B');
            
            // Calculate position values in USDC
            const positionValueA = positionA * priceA;
            const positionValueB = positionB * priceB;
            
            // Determine if we need to provide liquidity
            const shouldBuyA = positionValueA < this.maxPositionUSDC * this.rebalanceThreshold;
            const shouldBuyB = positionValueB < this.maxPositionUSDC * this.rebalanceThreshold;
            
            // Calculate trade sizes
            const tradeSize = Math.random() * (this.maxTradeSize - this.minTradeSize) + this.minTradeSize;
            
            // Execute trades to provide liquidity
            if (shouldBuyA && Math.random() < 0.5) {
                // Buy Team A tokens if we're under-exposed
                console.log(`[MarketMaker] Providing liquidity for Team A at ${priceA.toFixed(4)} USDC`);
                await this.buy(market, 'A', tradeSize);
            }
            
            if (shouldBuyB && Math.random() < 0.5) {
                // Buy Team B tokens if we're under-exposed
                console.log(`[MarketMaker] Providing liquidity for Team B at ${priceB.toFixed(4)} USDC`);
                await this.buy(market, 'B', tradeSize);
            }
            
            // Rebalance if too exposed on one side
            if (positionValueA > this.maxPositionUSDC * 1.2 && positionA > 10) {
                // Sell some Team A tokens
                const sellAmount = Math.floor(positionA * 0.2);  // Sell 20% of position
                console.log(`[MarketMaker] Rebalancing - selling ${sellAmount} Team A tokens`);
                await this.sell(market, 'A', sellAmount);
            }
            
            if (positionValueB > this.maxPositionUSDC * 1.2 && positionB > 10) {
                // Sell some Team B tokens
                const sellAmount = Math.floor(positionB * 0.2);  // Sell 20% of position
                console.log(`[MarketMaker] Rebalancing - selling ${sellAmount} Team B tokens`);
                await this.sell(market, 'B', sellAmount);
            }
            
            // Log current state
            console.log(`[MarketMaker] Positions - A: ${positionA} tokens ($${positionValueA.toFixed(2)}), B: ${positionB} tokens ($${positionValueB.toFixed(2)})`);
            
        } catch (error) {
            console.error(`[MarketMaker] Execution error:`, error.message);
            this.metrics.errors.push({
                type: 'execution',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get strategy description
     */
    getDescription() {
        return `Market Maker Bot - Provides liquidity with ${this.spreadPercent * 100}% spread, max ${this.maxPositionUSDC} USDC per side`;
    }
}

export default MarketMakerBot;
