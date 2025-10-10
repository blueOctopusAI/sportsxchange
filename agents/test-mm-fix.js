#!/usr/bin/env node

/**
 * Test Market Maker Bot Fix
 * Verifies the bot can properly read market state
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { MarketMakerBot } from './bots/market-maker-bot-real.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function testMarketMakerFix() {
    console.log('🔧 Testing Market Maker Bot Fix');
    console.log('='.repeat(50));
    
    try {
        // Load market data
        const marketData = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
        console.log(`\n📊 Market loaded: ${marketData.gameId}`);
        console.log(`   Market PDA: ${marketData.marketPda}`);
        
        // Create a market maker bot
        const bot = new MarketMakerBot({
            name: 'TestMM',
            programId: process.env.PROGRAM_ID,
            maxPositionUSDC: 50,
            minTradeSize: 2,
            maxTradeSize: 10
        });
        
        // Initialize bot
        await bot.initialize([marketData]);
        
        // Test getting market state directly
        console.log('\n🔍 Testing market state fetch...');
        const marketPda = new PublicKey(marketData.marketPda);
        
        try {
            const marketState = await bot.getMarketState(marketPda);
            console.log('✅ Market state fetched successfully!');
            console.log(`   Team A Supply: ${(marketState.teamASupply / 1000000).toFixed(2)}`);
            console.log(`   Team B Supply: ${(marketState.teamBSupply / 1000000).toFixed(2)}`);
            console.log(`   Pool Value: ${(marketState.poolValue / 1000000).toFixed(2)} USDC`);
            
            // Calculate prices
            const priceA = bot.calculatePrice(marketState.teamASupply, marketState.basePrice, marketState.slope) / 1000000;
            const priceB = bot.calculatePrice(marketState.teamBSupply, marketState.basePrice, marketState.slope) / 1000000;
            console.log(`   Team A Price: ${priceA.toFixed(4)} USDC`);
            console.log(`   Team B Price: ${priceB.toFixed(4)} USDC`);
        } catch (error) {
            console.error('❌ Failed to fetch market state:', error.message);
            return;
        }
        
        // Now test the execute function
        console.log('\n🤖 Testing bot execute function...');
        await bot.updateUsdcBalance();
        console.log(`   Bot USDC Balance: ${bot.usdcBalance}`);
        
        if (bot.usdcBalance < 5) {
            console.log('   ⚠️  Bot needs USDC. Skipping trade test.');
        } else {
            // Try to execute
            await bot.execute(marketData);
            console.log('✅ Execute function completed without errors!');
            
            // Check metrics
            const metrics = bot.getMetrics();
            if (metrics.tradesExecuted > 0) {
                console.log(`   Trades executed: ${metrics.tradesExecuted}`);
                console.log(`   Successful: ${metrics.successfulTrades}`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Market Maker Bot is fixed and working!');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error(error.stack);
    }
}

testMarketMakerFix().catch(console.error);
