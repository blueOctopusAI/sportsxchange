/**
 * Random Retail Bot
 * Simulates unpredictable retail trader behavior
 */

import { BaseBot } from './base-bot.js';

export class RandomRetailBot extends BaseBot {
    constructor(config = {}) {
        super('RandomRetail', config);
        
        // Retail trader config
        this.minTradeSize = config.minTradeSize || 1;    // Min 1 USDC
        this.maxTradeSize = config.maxTradeSize || 25;   // Max 25 USDC  
        this.tradeFrequency = config.tradeFrequency || 0.3;  // 30% chance to trade each round
        this.sellProbability = config.sellProbability || 0.2;  // 20% chance to sell vs buy
        this.favoriteTeam = config.favoriteTeam || null;  // Bias towards one team
        this.panicSellThreshold = config.panicSellThreshold || 0.8;  // Panic sell if down 20%
        
        // Track purchase prices for panic selling
        this.purchasePrices = new Map();
    }

    async execute(market) {
        try {
            // Random retail traders don't always trade
            if (Math.random() > this.tradeFrequency) {
                console.log(`[RandomRetail] Sitting out this round`);
                return;
            }

            // Get current market state
            const priceA = await this.getCurrentPrice(market, 'A');
            const priceB = await this.getCurrentPrice(market, 'B');
            
            // Get our positions
            const positionA = this.getPosition(market, 'A');
            const positionB = this.getPosition(market, 'B');
            
            // Decide action: buy or sell?
            const shouldSell = Math.random() < this.sellProbability;
            
            if (shouldSell && (positionA > 0 || positionB > 0)) {
                // Selling logic - might panic sell
                await this.executeSell(market, priceA, priceB, positionA, positionB);
            } else {
                // Buying logic - might FOMO buy
                await this.executeBuy(market, priceA, priceB);
            }
            
        } catch (error) {
            console.error(`[RandomRetail] Execution error:`, error.message);
            this.metrics.errors.push({
                type: 'execution',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    async executeBuy(market, priceA, priceB) {
        // Choose team (with potential bias)
        let team;
        if (this.favoriteTeam) {
            // 70% chance to buy favorite team
            team = Math.random() < 0.7 ? this.favoriteTeam : (this.favoriteTeam === 'A' ? 'B' : 'A');
        } else {
            // Random choice, but slightly influenced by which is cheaper
            const cheaperTeam = priceA < priceB ? 'A' : 'B';
            team = Math.random() < 0.6 ? cheaperTeam : (cheaperTeam === 'A' ? 'B' : 'A');
        }
        
        // Random trade size with occasional FOMO (larger trades)
        let tradeSize = Math.random() * (this.maxTradeSize - this.minTradeSize) + this.minTradeSize;
        
        // 10% chance of FOMO - double the trade size
        if (Math.random() < 0.1) {
            tradeSize *= 2;
            console.log(`[RandomRetail] FOMO buying!`);
        }
        
        const price = team === 'A' ? priceA : priceB;
        console.log(`[RandomRetail] Buying ${tradeSize.toFixed(2)} USDC of Team ${team} at ${price.toFixed(4)} USDC`);
        
        // Execute buy
        await this.buy(market, team, tradeSize);
        
        // Track purchase price for panic sell logic
        const marketKey = market.publicKey.toString();
        if (!this.purchasePrices.has(marketKey)) {
            this.purchasePrices.set(marketKey, {});
        }
        this.purchasePrices.get(marketKey)[team] = price;
    }

    async executeSell(market, priceA, priceB, positionA, positionB) {
        // Determine which position to sell
        let team;
        let position;
        let currentPrice;
        
        if (positionA > 0 && positionB > 0) {
            // Has both, sell random one
            team = Math.random() < 0.5 ? 'A' : 'B';
        } else if (positionA > 0) {
            team = 'A';
        } else {
            team = 'B';
        }
        
        position = team === 'A' ? positionA : positionB;
        currentPrice = team === 'A' ? priceA : priceB;
        
        // Check for panic sell condition
        const marketKey = market.publicKey.toString();
        const purchasePrice = this.purchasePrices.get(marketKey)?.[team] || currentPrice;
        const priceRatio = currentPrice / purchasePrice;
        
        let sellAmount;
        if (priceRatio < this.panicSellThreshold) {
            // Panic sell most of position
            sellAmount = Math.floor(position * 0.8);
            console.log(`[RandomRetail] PANIC SELLING! Price down ${((1 - priceRatio) * 100).toFixed(1)}%`);
        } else {
            // Normal sell - random portion
            sellAmount = Math.floor(position * (Math.random() * 0.5 + 0.1));  // Sell 10-60% of position
        }
        
        if (sellAmount > 0) {
            console.log(`[RandomRetail] Selling ${sellAmount} Team ${team} tokens at ${currentPrice.toFixed(4)} USDC`);
            await this.sell(market, team, sellAmount);
        }
    }

    getDescription() {
        return `Random Retail Bot - Trades ${this.minTradeSize}-${this.maxTradeSize} USDC with ${this.tradeFrequency * 100}% frequency`;
    }
}

export default RandomRetailBot;
