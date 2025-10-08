/**
 * Base Bot Class
 * All trading bots inherit from this base class
 */

import anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { BN } from 'bn.js';

export class BaseBot {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.wallet = config.wallet || this.loadWallet();
        this.connection = config.connection;
        this.program = config.program;
        
        // Track metrics
        this.metrics = {
            tradesExecuted: 0,
            successfulTrades: 0,
            failedTrades: 0,
            totalVolumeUSDC: 0,
            profits: 0,
            losses: 0,
            errors: []
        };
        
        // Bot state
        this.positions = new Map(); // market -> position
        this.lastAction = null;
        this.active = true;
    }

    loadWallet() {
        // Load wallet from default location or create new one for testing
        try {
            const walletPath = this.config.walletPath || 
                             `${process.env.HOME}/.config/solana/bot-${this.name}.json`;
            if (fs.existsSync(walletPath)) {
                return JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
            }
        } catch (e) {
            console.log(`Creating new wallet for bot ${this.name}`);
        }
        return anchor.web3.Keypair.generate();
    }

    /**
     * Execute one trading cycle
     * Must be implemented by child classes
     */
    async execute(market) {
        throw new Error('Execute method must be implemented by child class');
    }

    /**
     * Buy tokens on a market
     */
    async buy(market, team, usdcAmount) {
        try {
            console.log(`[${this.name}] Buying ${usdcAmount} USDC worth of Team ${team} tokens`);
            
            // Calculate minimum tokens out (allow 2% slippage)
            const expectedTokens = await this.calculateTokensOut(market, team, usdcAmount);
            const minTokensOut = Math.floor(expectedTokens * 0.98);
            
            const tx = await this.program.methods
                .buyOnCurve(
                    team === 'A' ? 0 : 1,
                    new BN(usdcAmount * 1_000_000),
                    new BN(minTokensOut)
                )
                .accounts({
                    market: market.publicKey,
                    buyer: this.wallet.publicKey,
                    // ... other accounts will be inferred
                })
                .rpc();
            
            // Update metrics
            this.metrics.tradesExecuted++;
            this.metrics.successfulTrades++;
            this.metrics.totalVolumeUSDC += usdcAmount;
            
            // Update position
            const position = this.positions.get(market.publicKey.toString()) || { teamA: 0, teamB: 0 };
            if (team === 'A') {
                position.teamA += expectedTokens;
            } else {
                position.teamB += expectedTokens;
            }
            this.positions.set(market.publicKey.toString(), position);
            
            this.lastAction = { type: 'buy', team, amount: usdcAmount, tx };
            return tx;
            
        } catch (error) {
            console.error(`[${this.name}] Buy failed:`, error.message);
            this.metrics.failedTrades++;
            this.metrics.errors.push({ 
                type: 'buy', 
                error: error.message, 
                timestamp: Date.now() 
            });
            throw error;
        }
    }

    /**
     * Sell tokens on a market
     */
    async sell(market, team, tokenAmount) {
        try {
            console.log(`[${this.name}] Selling ${tokenAmount} Team ${team} tokens`);
            
            // Calculate minimum USDC out (allow 2% slippage)
            const expectedUsdc = await this.calculateUsdcOut(market, team, tokenAmount);
            const minUsdcOut = Math.floor(expectedUsdc * 0.98);
            
            const tx = await this.program.methods
                .sellOnCurve(
                    team === 'A' ? 0 : 1,
                    new BN(tokenAmount),
                    new BN(minUsdcOut)
                )
                .accounts({
                    market: market.publicKey,
                    seller: this.wallet.publicKey,
                    // ... other accounts will be inferred
                })
                .rpc();
            
            // Update metrics
            this.metrics.tradesExecuted++;
            this.metrics.successfulTrades++;
            this.metrics.totalVolumeUSDC += expectedUsdc / 1_000_000;
            
            // Update position
            const position = this.positions.get(market.publicKey.toString()) || { teamA: 0, teamB: 0 };
            if (team === 'A') {
                position.teamA -= tokenAmount;
            } else {
                position.teamB -= tokenAmount;
            }
            this.positions.set(market.publicKey.toString(), position);
            
            this.lastAction = { type: 'sell', team, amount: tokenAmount, tx };
            return tx;
            
        } catch (error) {
            console.error(`[${this.name}] Sell failed:`, error.message);
            this.metrics.failedTrades++;
            this.metrics.errors.push({ 
                type: 'sell', 
                error: error.message, 
                timestamp: Date.now() 
            });
            throw error;
        }
    }

    /**
     * Calculate expected tokens from USDC amount
     */
    async calculateTokensOut(market, team, usdcAmount) {
        const marketData = await this.program.account.marketV2.fetch(market.publicKey);
        const supply = team === 'A' ? marketData.teamASupply : marketData.teamBSupply;
        const basePrice = marketData.basePrice.toNumber();
        const slope = marketData.slope.toNumber();
        
        // Linear bonding curve calculation
        const usdcLamports = usdcAmount * 1_000_000;
        const averagePrice = basePrice + (slope * supply.toNumber()) / 1_000_000;
        return Math.floor(usdcLamports / averagePrice);
    }

    /**
     * Calculate expected USDC from token amount
     */
    async calculateUsdcOut(market, team, tokenAmount) {
        const marketData = await this.program.account.marketV2.fetch(market.publicKey);
        const supply = team === 'A' ? marketData.teamASupply : marketData.teamBSupply;
        const basePrice = marketData.basePrice.toNumber();
        const slope = marketData.slope.toNumber();
        
        // Calculate average price over the range
        const startPrice = basePrice + (slope * supply.toNumber()) / 1_000_000;
        const endPrice = basePrice + (slope * (supply.toNumber() - tokenAmount)) / 1_000_000;
        const averagePrice = (startPrice + endPrice) / 2;
        
        return Math.floor(tokenAmount * averagePrice);
    }

    /**
     * Get current market price
     */
    async getCurrentPrice(market, team) {
        const marketData = await this.program.account.marketV2.fetch(market.publicKey);
        const supply = team === 'A' ? marketData.teamASupply : marketData.teamBSupply;
        const basePrice = marketData.basePrice.toNumber();
        const slope = marketData.slope.toNumber();
        
        return (basePrice + (slope * supply.toNumber()) / 1_000_000) / 1_000_000;
    }

    /**
     * Check if bot has position in market
     */
    hasPosition(market, team) {
        const position = this.positions.get(market.publicKey.toString());
        if (!position) return false;
        return team === 'A' ? position.teamA > 0 : position.teamB > 0;
    }

    /**
     * Get bot's position in market
     */
    getPosition(market, team) {
        const position = this.positions.get(market.publicKey.toString());
        if (!position) return 0;
        return team === 'A' ? position.teamA : position.teamB;
    }

    /**
     * Get metrics summary
     */
    getMetrics() {
        return {
            name: this.name,
            ...this.metrics,
            successRate: this.metrics.tradesExecuted > 0 
                ? (this.metrics.successfulTrades / this.metrics.tradesExecuted * 100).toFixed(2) + '%'
                : '0%',
            netPnL: this.metrics.profits - this.metrics.losses
        };
    }

    /**
     * Reset bot state
     */
    reset() {
        this.metrics = {
            tradesExecuted: 0,
            successfulTrades: 0,
            failedTrades: 0,
            totalVolumeUSDC: 0,
            profits: 0,
            losses: 0,
            errors: []
        };
        this.positions.clear();
        this.lastAction = null;
    }

    /**
     * Sleep for milliseconds
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default BaseBot;
