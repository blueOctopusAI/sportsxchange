/**
 * Intelligent Market Maker Bot
 * Sophisticated liquidity provision with calculated spreads and risk management
 */

import { BaseBotReal } from './base-bot-real.js';
import { PublicKey } from '@solana/web3.js';

export class IntelligentMarketMakerBot extends BaseBotReal {
    constructor(config = {}) {
        super({
            name: config.name || 'SmartMM',
            ...config
        });
        
        // Intelligent market maker config
        this.config = {
            // Spread calculation parameters
            baseSpreadBps: config.baseSpreadBps || 100,  // 1% base spread
            minSpreadBps: config.minSpreadBps || 50,      // 0.5% minimum
            maxSpreadBps: config.maxSpreadBps || 300,     // 3% maximum
            
            // Position sizing
            maxPositionUSDC: config.maxPositionUSDC || 200,  // Max exposure per side
            minOrderSize: config.minOrderSize || 10,          // Minimum order
            maxOrderSize: config.maxOrderSize || 50,          // Maximum single order
            
            // Risk parameters
            inventoryTargetRatio: config.inventoryTargetRatio || 0.5,  // Target 50/50 balance
            maxInventoryDeviation: config.maxInventoryDeviation || 0.3, // Max 30% imbalance
            
            // Market analysis
            priceHistorySize: config.priceHistorySize || 20,  // Track last 20 prices
            volumeHistorySize: config.volumeHistorySize || 10, // Track last 10 volumes
            
            // Execution
            slippageBps: config.slippageBps || 30,  // 0.3% slippage (tight)
            executionProbability: config.executionProbability || 0.4,  // 40% chance per tick
        };
        
        // Market tracking state
        this.marketState = new Map();  // Store per-market data
    }

    /**
     * Initialize or get market tracking state
     */
    getMarketTracking(marketId) {
        if (!this.marketState.has(marketId)) {
            this.marketState.set(marketId, {
                priceHistory: { teamA: [], teamB: [] },
                volumeHistory: [],
                lastPrices: { teamA: 0, teamB: 0 },
                volatility: { teamA: 0, teamB: 0 },
                totalVolume: 0,
                lastUpdate: Date.now(),
                spread: this.config.baseSpreadBps,
                imbalanceRatio: 0.5,
                momentum: { teamA: 0, teamB: 0 }
            });
        }
        return this.marketState.get(marketId);
    }

    /**
     * Calculate volatility from price history
     */
    calculateVolatility(priceHistory) {
        if (priceHistory.length < 3) return 0;
        
        // Calculate returns
        const returns = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const ret = (priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1];
            returns.push(ret);
        }
        
        // Calculate standard deviation of returns
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    /**
     * Calculate momentum (price trend)
     */
    calculateMomentum(priceHistory) {
        if (priceHistory.length < 5) return 0;
        
        // Simple moving average crossover
        const shortWindow = 5;
        const longWindow = Math.min(10, priceHistory.length);
        
        const shortMA = priceHistory.slice(-shortWindow).reduce((a, b) => a + b, 0) / shortWindow;
        const longMA = priceHistory.slice(-longWindow).reduce((a, b) => a + b, 0) / longWindow;
        
        return (shortMA - longMA) / longMA;  // Normalized momentum
    }

    /**
     * Calculate dynamic spread based on market conditions
     */
    calculateDynamicSpread(tracking) {
        let spreadBps = this.config.baseSpreadBps;
        
        // Adjust for volatility (higher volatility = wider spread)
        const avgVolatility = (tracking.volatility.teamA + tracking.volatility.teamB) / 2;
        const volatilityMultiplier = 1 + (avgVolatility * 10);  // Scale volatility impact
        spreadBps *= volatilityMultiplier;
        
        // Adjust for inventory imbalance (more imbalance = wider spread)
        const imbalanceDeviation = Math.abs(tracking.imbalanceRatio - 0.5);
        const imbalanceMultiplier = 1 + (imbalanceDeviation * 2);
        spreadBps *= imbalanceMultiplier;
        
        // Adjust for momentum (strong trends = wider spread for protection)
        const maxMomentum = Math.max(
            Math.abs(tracking.momentum.teamA),
            Math.abs(tracking.momentum.teamB)
        );
        const momentumMultiplier = 1 + (maxMomentum * 3);
        spreadBps *= momentumMultiplier;
        
        // Apply bounds
        spreadBps = Math.max(this.config.minSpreadBps, Math.min(this.config.maxSpreadBps, spreadBps));
        
        return spreadBps;
    }

    /**
     * Calculate optimal order size based on market conditions
     */
    calculateOrderSize(tracking, baseSize, isBuy, team) {
        let orderSize = baseSize;
        
        // Reduce size in high volatility
        const volatility = team === 0 ? tracking.volatility.teamA : tracking.volatility.teamB;
        const volatilityFactor = Math.max(0.5, 1 - volatility * 2);
        orderSize *= volatilityFactor;
        
        // Adjust for inventory (buy more when low, less when high)
        if (isBuy) {
            const inventoryFactor = team === 0 
                ? (1 - tracking.imbalanceRatio) * 2  // More Team A if we have less
                : tracking.imbalanceRatio * 2;        // More Team B if we have less
            orderSize *= Math.max(0.5, Math.min(1.5, inventoryFactor));
        }
        
        // Fade momentum (buy less in strong uptrends, more in downtrends)
        const momentum = team === 0 ? tracking.momentum.teamA : tracking.momentum.teamB;
        if (isBuy) {
            const momentumFactor = 1 - (momentum * 0.5);  // Reduce buys in uptrend
            orderSize *= Math.max(0.3, Math.min(1.5, momentumFactor));
        }
        
        // Apply bounds
        orderSize = Math.max(this.config.minOrderSize, Math.min(this.config.maxOrderSize, orderSize));
        
        return orderSize;
    }

    /**
     * Determine if we should quote (provide liquidity) at current levels
     */
    shouldQuote(tracking, team, isBuy) {
        // Don't quote if inventory is too imbalanced
        const imbalanceDeviation = Math.abs(tracking.imbalanceRatio - 0.5);
        if (imbalanceDeviation > this.config.maxInventoryDeviation) {
            // Only quote to rebalance
            if (team === 0) {
                return isBuy ? tracking.imbalanceRatio < 0.5 : tracking.imbalanceRatio > 0.5;
            } else {
                return isBuy ? tracking.imbalanceRatio > 0.5 : tracking.imbalanceRatio < 0.5;
            }
        }
        
        // Don't buy into strong momentum (avoid adverse selection)
        const momentum = team === 0 ? tracking.momentum.teamA : tracking.momentum.teamB;
        if (isBuy && momentum > 0.1) {  // Strong upward momentum
            return false;  // Don't buy into a rally
        }
        if (!isBuy && momentum < -0.1) {  // Strong downward momentum
            return false;  // Don't sell into a crash
        }
        
        return true;
    }

    /**
     * Calculate fair value based on market signals
     */
    calculateFairValue(marketState, tracking) {
        const currentPriceA = this.calculatePrice(
            marketState.teamASupply,
            marketState.basePrice,
            marketState.slope
        ) / 1000000;
        
        const currentPriceB = this.calculatePrice(
            marketState.teamBSupply,
            marketState.basePrice,
            marketState.slope
        ) / 1000000;
        
        // Normalize to probabilities
        const total = currentPriceA + currentPriceB;
        const impliedProbA = currentPriceA / total;
        const impliedProbB = currentPriceB / total;
        
        // Adjust for momentum (mean reversion assumption)
        const adjustedProbA = impliedProbA - (tracking.momentum.teamA * 0.05);
        const adjustedProbB = impliedProbB - (tracking.momentum.teamB * 0.05);
        
        // Renormalize
        const adjustedTotal = adjustedProbA + adjustedProbB;
        
        return {
            teamA: (adjustedProbA / adjustedTotal) * total,
            teamB: (adjustedProbB / adjustedTotal) * total
        };
    }

    async execute(market) {
        try {
            // Get market ID
            const marketId = market.gameId || market.marketPda;
            const tracking = this.getMarketTracking(marketId);
            
            // Get real market state
            const marketPda = market.publicKey || new PublicKey(market.marketPda);
            const marketState = await this.getMarketState(marketPda);
            
            if (marketState.tradingHalted) {
                console.log(`[${this.name}] Market ${marketId} is halted`);
                return;
            }
            
            // Calculate current prices
            const priceA = this.calculatePrice(
                marketState.teamASupply,
                marketState.basePrice,
                marketState.slope
            ) / 1000000;
            
            const priceB = this.calculatePrice(
                marketState.teamBSupply,
                marketState.basePrice,
                marketState.slope
            ) / 1000000;
            
            // Update price history
            tracking.priceHistory.teamA.push(priceA);
            tracking.priceHistory.teamB.push(priceB);
            
            // Trim history
            if (tracking.priceHistory.teamA.length > this.config.priceHistorySize) {
                tracking.priceHistory.teamA.shift();
            }
            if (tracking.priceHistory.teamB.length > this.config.priceHistorySize) {
                tracking.priceHistory.teamB.shift();
            }
            
            // Calculate market metrics
            tracking.volatility.teamA = this.calculateVolatility(tracking.priceHistory.teamA);
            tracking.volatility.teamB = this.calculateVolatility(tracking.priceHistory.teamB);
            tracking.momentum.teamA = this.calculateMomentum(tracking.priceHistory.teamA);
            tracking.momentum.teamB = this.calculateMomentum(tracking.priceHistory.teamB);
            
            // Get our positions
            const positionA = await this.getTokenBalance(market.teamAMint);
            const positionB = await this.getTokenBalance(market.teamBMint);
            const positionValueA = positionA * priceA;
            const positionValueB = positionB * priceB;
            const totalValue = positionValueA + positionValueB;
            
            // Update inventory tracking
            if (totalValue > 0) {
                tracking.imbalanceRatio = positionValueA / totalValue;
            }
            
            // Calculate dynamic spread
            tracking.spread = this.calculateDynamicSpread(tracking);
            const spreadMultiplier = 1 + (tracking.spread / 10000);
            
            // Calculate fair values
            const fairValues = this.calculateFairValue(marketState, tracking);
            
            // Update USDC balance
            await this.updateUsdcBalance();
            
            // Log intelligent market analysis
            console.log(`\n[${this.name}] === Market Analysis for ${marketId} ===`);
            console.log(`Prices: A=${priceA.toFixed(4)}, B=${priceB.toFixed(4)}`);
            console.log(`Fair Values: A=${fairValues.teamA.toFixed(4)}, B=${fairValues.teamB.toFixed(4)}`);
            console.log(`Volatility: A=${(tracking.volatility.teamA * 100).toFixed(2)}%, B=${(tracking.volatility.teamB * 100).toFixed(2)}%`);
            console.log(`Momentum: A=${(tracking.momentum.teamA * 100).toFixed(2)}%, B=${(tracking.momentum.teamB * 100).toFixed(2)}%`);
            console.log(`Dynamic Spread: ${(tracking.spread / 100).toFixed(2)}%`);
            console.log(`Inventory: A=$${positionValueA.toFixed(2)}, B=$${positionValueB.toFixed(2)}, Ratio=${(tracking.imbalanceRatio * 100).toFixed(1)}%`);
            console.log(`USDC Available: $${this.usdcBalance.toFixed(2)}`);
            
            // Decision: Should we quote?
            const shouldQuoteA = this.shouldQuote(tracking, 0, true);
            const shouldQuoteB = this.shouldQuote(tracking, 1, true);
            
            // Market making logic with probability gate
            if (Math.random() < this.config.executionProbability) {
                
                // Team A market making
                if (priceA < fairValues.teamA * (1 - tracking.spread / 10000)) {
                    // Price below our bid - BUY opportunity
                    if (shouldQuoteA && this.usdcBalance >= this.config.minOrderSize) {
                        const baseSize = this.config.minOrderSize + 
                            Math.random() * (this.config.maxOrderSize - this.config.minOrderSize);
                        const orderSize = this.calculateOrderSize(tracking, baseSize, true, 0);
                        const finalSize = Math.min(orderSize, this.usdcBalance * 0.3, 
                            this.config.maxPositionUSDC - positionValueA);
                        
                        if (finalSize >= this.config.minOrderSize) {
                            console.log(`[${this.name}] BUY SIGNAL: Team A undervalued by ${((fairValues.teamA / priceA - 1) * 100).toFixed(2)}%`);
                            console.log(`[${this.name}] Executing: Buy $${finalSize.toFixed(2)} of Team A`);
                            
                            const result = await this.buy(market, 0, finalSize, this.config.slippageBps);
                            if (result.success) {
                                console.log(`[${this.name}] ✅ Buy executed: ${result.signature.slice(0, 8)}...`);
                                tracking.totalVolume += finalSize;
                            }
                        }
                    }
                } else if (priceA > fairValues.teamA * spreadMultiplier && positionA > 10) {
                    // Price above our ask - SELL opportunity
                    const tokenValue = positionA * priceA;
                    const sellTokens = Math.floor(positionA * 0.2);  // Sell up to 20% of position
                    
                    if (sellTokens > 0 && this.shouldQuote(tracking, 0, false)) {
                        console.log(`[${this.name}] SELL SIGNAL: Team A overvalued by ${((priceA / fairValues.teamA - 1) * 100).toFixed(2)}%`);
                        console.log(`[${this.name}] Executing: Sell ${sellTokens} Team A tokens`);
                        
                        const result = await this.sell(market, 0, sellTokens, this.config.slippageBps);
                        if (result.success) {
                            console.log(`[${this.name}] ✅ Sell executed: ${result.signature.slice(0, 8)}...`);
                            tracking.totalVolume += sellTokens * priceA;
                        }
                    }
                }
                
                // Team B market making
                if (priceB < fairValues.teamB * (1 - tracking.spread / 10000)) {
                    // Price below our bid - BUY opportunity
                    if (shouldQuoteB && this.usdcBalance >= this.config.minOrderSize) {
                        const baseSize = this.config.minOrderSize + 
                            Math.random() * (this.config.maxOrderSize - this.config.minOrderSize);
                        const orderSize = this.calculateOrderSize(tracking, baseSize, true, 1);
                        const finalSize = Math.min(orderSize, this.usdcBalance * 0.3,
                            this.config.maxPositionUSDC - positionValueB);
                        
                        if (finalSize >= this.config.minOrderSize) {
                            console.log(`[${this.name}] BUY SIGNAL: Team B undervalued by ${((fairValues.teamB / priceB - 1) * 100).toFixed(2)}%`);
                            console.log(`[${this.name}] Executing: Buy $${finalSize.toFixed(2)} of Team B`);
                            
                            const result = await this.buy(market, 1, finalSize, this.config.slippageBps);
                            if (result.success) {
                                console.log(`[${this.name}] ✅ Buy executed: ${result.signature.slice(0, 8)}...`);
                                tracking.totalVolume += finalSize;
                            }
                        }
                    }
                } else if (priceB > fairValues.teamB * spreadMultiplier && positionB > 10) {
                    // Price above our ask - SELL opportunity
                    const sellTokens = Math.floor(positionB * 0.2);  // Sell up to 20% of position
                    
                    if (sellTokens > 0 && this.shouldQuote(tracking, 1, false)) {
                        console.log(`[${this.name}] SELL SIGNAL: Team B overvalued by ${((priceB / fairValues.teamB - 1) * 100).toFixed(2)}%`);
                        console.log(`[${this.name}] Executing: Sell ${sellTokens} Team B tokens`);
                        
                        const result = await this.sell(market, 1, sellTokens, this.config.slippageBps);
                        if (result.success) {
                            console.log(`[${this.name}] ✅ Sell executed: ${result.signature.slice(0, 8)}...`);
                            tracking.totalVolume += sellTokens * priceB;
                        }
                    }
                }
            }
            
            // Update last values
            tracking.lastPrices = { teamA: priceA, teamB: priceB };
            tracking.lastUpdate = Date.now();
            
        } catch (error) {
            console.error(`[${this.name}] Execution error:`, error.message);
            this.metrics.errors++;
        }
    }

    /**
     * Get strategy description
     */
    getDescription() {
        return `Intelligent Market Maker - Dynamic spreads (${(this.config.minSpreadBps/100).toFixed(1)}-${(this.config.maxSpreadBps/100).toFixed(1)}%), volatility-based sizing, momentum-aware quoting`;
    }
    
    /**
     * Get current market analysis
     */
    getMarketAnalysis(marketId) {
        const tracking = this.marketState.get(marketId);
        if (!tracking) return null;
        
        return {
            spread: (tracking.spread / 100).toFixed(2) + '%',
            volatility: {
                teamA: (tracking.volatility.teamA * 100).toFixed(2) + '%',
                teamB: (tracking.volatility.teamB * 100).toFixed(2) + '%'
            },
            momentum: {
                teamA: (tracking.momentum.teamA * 100).toFixed(2) + '%',
                teamB: (tracking.momentum.teamB * 100).toFixed(2) + '%'
            },
            inventoryBalance: (tracking.imbalanceRatio * 100).toFixed(1) + '%',
            totalVolume: tracking.totalVolume.toFixed(2) + ' USDC'
        };
    }
}

export default IntelligentMarketMakerBot;
