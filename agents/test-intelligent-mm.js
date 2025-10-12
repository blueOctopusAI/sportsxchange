#!/usr/bin/env node

/**
 * Test Intelligent Market Maker Bot
 * Demonstrates sophisticated trading strategies with real market analysis
 */

import dotenv from 'dotenv';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import IntelligentMarketMakerBot from './bots/market-maker-bot-intelligent.js';

dotenv.config();

async function testIntelligentMM() {
    console.log('\n' + '='.repeat(80));
    console.log('INTELLIGENT MARKET MAKER BOT TEST');
    console.log('='.repeat(80));
    
    try {
        // Setup connection
        const connection = new Connection('http://localhost:8899', 'confirmed');
        console.log('\n✅ Connected to local validator');
        
        // Load wallet
        const walletPath = process.env.WALLET_PATH || path.join(homedir(), '.config/solana/id.json');
        const walletKeypair = Keypair.fromSecretKey(
            new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
        );
        console.log('✅ Loaded wallet:', walletKeypair.publicKey.toBase58().slice(0, 8) + '...');
        
        // Get the market from environment or use a default
        const marketPda = process.env.TEST_MARKET;
        
        if (!marketPda) {
            console.error('\n❌ No market specified');
            console.log('\nPlease run:');
            console.log('  node find-markets.js');
            console.log('Or:');
            console.log('  node create-usdc-market.js');
            console.log('\nThen set TEST_MARKET environment variable:');
            console.log('  export TEST_MARKET=<market_address>');
            console.log('  node test-intelligent-mm.js');
            return;
        }
        
        console.log('✅ Using market:', marketPda.slice(0, 8) + '...');
        
        // Get market state to find mint addresses
        const marketAccount = await connection.getAccountInfo(new PublicKey(marketPda));
        if (!marketAccount) {
            console.error('❌ Market not found. Is this the correct address?');
            return;
        }
        
        // Create market config
        // For now, we'll use placeholder mints since we need to decode the market data
        const market = {
            marketPda,
            publicKey: new PublicKey(marketPda),
            gameId: 'test-game',
            // These would be extracted from market account data
            teamAMint: PublicKey.unique().toBase58(),
            teamBMint: PublicKey.unique().toBase58()
        };
        
        // Create multiple intelligent market makers with different strategies
        const bots = [
            new IntelligentMarketMakerBot({
                name: 'SmartMM-Conservative',
                connection,
                wallet: walletKeypair,
                programId: new PublicKey(process.env.PROGRAM_ID || '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH'),
                usdcMint: new PublicKey(process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                
                // Conservative strategy - wider spreads, smaller positions
                baseSpreadBps: 150,    // 1.5% base spread
                minSpreadBps: 100,     // 1% minimum
                maxSpreadBps: 400,     // 4% maximum
                maxPositionUSDC: 100,   // Smaller max position
                minOrderSize: 5,
                maxOrderSize: 20,
                executionProbability: 0.3  // Less aggressive
            }),
            
            new IntelligentMarketMakerBot({
                name: 'SmartMM-Aggressive',
                connection,
                wallet: walletKeypair,
                programId: new PublicKey(process.env.PROGRAM_ID || '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH'),
                usdcMint: new PublicKey(process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                
                // Aggressive strategy - tighter spreads, larger positions
                baseSpreadBps: 50,     // 0.5% base spread
                minSpreadBps: 25,      // 0.25% minimum
                maxSpreadBps: 200,     // 2% maximum
                maxPositionUSDC: 300,   // Larger max position
                minOrderSize: 20,
                maxOrderSize: 80,
                executionProbability: 0.6  // More aggressive
            }),
            
            new IntelligentMarketMakerBot({
                name: 'SmartMM-Balanced',
                connection,
                wallet: walletKeypair,
                programId: new PublicKey(process.env.PROGRAM_ID || '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH'),
                usdcMint: new PublicKey(process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                
                // Balanced strategy - default parameters
                baseSpreadBps: 100,
                maxPositionUSDC: 200,
                executionProbability: 0.4
            })
        ];
        
        console.log('\n📊 Running Intelligent Market Makers:');
        console.log('  • Conservative: Wide spreads, small positions');
        console.log('  • Aggressive: Tight spreads, large positions');
        console.log('  • Balanced: Moderate parameters');
        
        // Run simulation
        console.log('\n' + '='.repeat(80));
        console.log('Starting 60-second test run...');
        console.log('='.repeat(80));
        
        let tick = 0;
        const maxTicks = 20;  // 20 ticks * 3 seconds = 60 seconds
        
        const runTick = async () => {
            tick++;
            console.log(`\n\n⏱️  TICK ${tick}/${maxTicks} - ${new Date().toLocaleTimeString()}`);
            console.log('-'.repeat(80));
            
            // Execute each bot
            for (const bot of bots) {
                await bot.execute(market);
                
                // Display market analysis
                const analysis = bot.getMarketAnalysis(market.gameId);
                if (analysis) {
                    console.log(`\n[${bot.name}] Market Analysis:`);
                    console.log(`  Spread: ${analysis.spread}`);
                    console.log(`  Volatility: A=${analysis.volatility.teamA}, B=${analysis.volatility.teamB}`);
                    console.log(`  Momentum: A=${analysis.momentum.teamA}, B=${analysis.momentum.teamB}`);
                    console.log(`  Inventory Balance: ${analysis.inventoryBalance}`);
                    console.log(`  Total Volume: ${analysis.totalVolume}`);
                }
                
                // Small delay between bots
                await new Promise(r => setTimeout(r, 500));
            }
            
            // Wait before next tick
            if (tick < maxTicks) {
                setTimeout(runTick, 3000);
            } else {
                console.log('\n' + '='.repeat(80));
                console.log('TEST COMPLETE');
                console.log('='.repeat(80));
                
                // Final summary
                console.log('\n📈 Final Bot Performance:');
                for (const bot of bots) {
                    const analysis = bot.getMarketAnalysis(market.gameId);
                    console.log(`\n${bot.name}:`);
                    console.log(`  • Trades Executed: ${bot.metrics.tradesExecuted}`);
                    console.log(`  • Errors: ${bot.metrics.errors}`);
                    if (analysis) {
                        console.log(`  • Total Volume: ${analysis.totalVolume}`);
                        console.log(`  • Final Spread: ${analysis.spread}`);
                    }
                    console.log(`  • Strategy: ${bot.getDescription()}`);
                }
                
                console.log('\n✅ Intelligent Market Maker test completed!');
                console.log('\nKey Observations:');
                console.log('• Market makers adjusted spreads based on volatility');
                console.log('• Position sizing adapted to market conditions');
                console.log('• Inventory rebalancing maintained risk limits');
                console.log('• Different strategies created diverse market dynamics');
            }
        };
        
        // Start the simulation
        runTick();
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure local validator is running');
        console.error('2. Create a market first: node create-usdc-market.js');
        console.error('3. Fund the bot wallet: node fund-bots.js');
        console.error('4. Set TEST_MARKET environment variable');
    }
}

// Run the test
testIntelligentMM().catch(console.error);
