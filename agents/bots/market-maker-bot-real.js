/**
 * Market Maker Bot with REAL Trading
 * Provides liquidity by maintaining positions on both sides
 */

import { BaseBotReal } from './base-bot-real.js';
import { PublicKey } from '@solana/web3.js';

export class MarketMakerBot extends BaseBotReal {
    constructor(config = {}) {
        super({
            name: config.name || 'MarketMaker',
            ...config
        });
        
        // Market maker specific config
        this.config = {
            spreadPercent: config.spreadPercent || 0.02,  // 2% spread
            maxPositionUSDC: config.maxPositionUSDC || 100,  // Max 100 USDC exposure per side
            minTradeSize: config.minTradeSize || 5,  // Min 5 USDC per trade
            maxTradeSize: config.maxTradeSize || 20,  // Max 20 USDC per trade
            rebalanceThreshold: config.rebalanceThreshold || 0.7,  // Rebalance when 70% exposed on one side
        };
    }

    async execute(market) {
        try {
            // Get real market state from blockchain
            const marketPda = market.publicKey || new PublicKey(market.marketPda);
            const marketState = await this.getMarketState(marketPda);
            
            if (marketState.tradingHalted) {
                console.log(`[${this.name}] Market is halted, skipping`);
                return;
            }
            
            // Calculate current prices for both teams
            const priceA = this.calculatePrice(marketState.teamASupply, marketState.basePrice, marketState.slope) / 1000000;
            const priceB = this.calculatePrice(marketState.teamBSupply, marketState.basePrice, marketState.slope) / 1000000;
            
            // Get our real token positions
            const positionA = await this.getTokenBalance(market.teamAMint);
            const positionB = await this.getTokenBalance(market.teamBMint);
            
            // Calculate position values in USDC
            const positionValueA = positionA * priceA;
            const positionValueB = positionB * priceB;
            
            // Check our USDC balance
            await this.updateUsdcBalance();
            
            console.log(`[${this.name}] Market state - Team A: ${priceA.toFixed(4)} USDC (${positionA.toFixed(2)} tokens), Team B: ${priceB.toFixed(4)} USDC (${positionB.toFixed(2)} tokens)`);
            console.log(`[${this.name}] USDC Balance: ${this.usdcBalance.toFixed(2)}, Position values - A: $${positionValueA.toFixed(2)}, B: $${positionValueB.toFixed(2)}`);
            
            // Determine if we need to provide liquidity
            const shouldBuyA = positionValueA < this.config.maxPositionUSDC * this.config.rebalanceThreshold;
            const shouldBuyB = positionValueB < this.config.maxPositionUSDC * this.config.rebalanceThreshold;
            
            // Calculate trade size (random within range, but limited by balance)
            const baseTradeSize = Math.random() * (this.config.maxTradeSize - this.config.minTradeSize) + this.config.minTradeSize;
            const tradeSize = Math.min(baseTradeSize, this.usdcBalance * 0.2); // Use max 20% of balance per trade
            
            // Execute trades to provide liquidity
            if (shouldBuyA && this.usdcBalance >= this.config.minTradeSize && Math.random() < 0.3) {
                // Buy Team A tokens if we're under-exposed (30% chance per tick)
                const buyAmount = Math.min(tradeSize, this.config.maxPositionUSDC - positionValueA);
                if (buyAmount >= this.config.minTradeSize) {
                    console.log(`[${this.name}] Providing liquidity: buying ${buyAmount.toFixed(2)} USDC of Team A at ${priceA.toFixed(4)} USDC`);
                    const result = await this.buy(market, 0, buyAmount);
                    if (result.success) {
                        console.log(`[${this.name}] ✅ Buy executed: ${result.signature.slice(0, 8)}...`);
                    }
                }
            }
            
            if (shouldBuyB && this.usdcBalance >= this.config.minTradeSize && Math.random() < 0.3) {
                // Buy Team B tokens if we're under-exposed (30% chance per tick)
                const buyAmount = Math.min(tradeSize, this.config.maxPositionUSDC - positionValueB);
                if (buyAmount >= this.config.minTradeSize) {
                    console.log(`[${this.name}] Providing liquidity: buying ${buyAmount.toFixed(2)} USDC of Team B at ${priceB.toFixed(4)} USDC`);
                    const result = await this.buy(market, 1, buyAmount);
                    if (result.success) {
                        console.log(`[${this.name}] ✅ Buy executed: ${result.signature.slice(0, 8)}...`);
                    }
                }
            }
            
            // Rebalance if too exposed on one side
            if (positionValueA > this.config.maxPositionUSDC * 1.2 && positionA > 10) {
                // Sell some Team A tokens
                const sellAmount = Math.floor(positionA * 0.2);  // Sell 20% of position
                console.log(`[${this.name}] Rebalancing - selling ${sellAmount} Team A tokens`);
                const result = await this.sell(market, 0, sellAmount);
                if (result.success) {
                    console.log(`[${this.name}] ✅ Rebalance sell executed: ${result.signature.slice(0, 8)}...`);
                }
            }
            
            if (positionValueB > this.config.maxPositionUSDC * 1.2 && positionB > 10) {
                // Sell some Team B tokens
                const sellAmount = Math.floor(positionB * 0.2);  // Sell 20% of position
                console.log(`[${this.name}] Rebalancing - selling ${sellAmount} Team B tokens`);
                const result = await this.sell(market, 1, sellAmount);
                if (result.success) {
                    console.log(`[${this.name}] ✅ Rebalance sell executed: ${result.signature.slice(0, 8)}...`);
                }
            }
            
        } catch (error) {
            console.error(`[${this.name}] Execution error:`, error.message);
            this.metrics.errors++;
        }
    }

    /**
     * Get strategy description
     */
    getDescription() {
        return `Market Maker Bot - Provides liquidity with ${this.config.spreadPercent * 100}% spread, max ${this.config.maxPositionUSDC} USDC per side`;
    }
}

export default MarketMakerBot;
