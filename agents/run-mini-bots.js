#!/usr/bin/env node

/**
 * Run Mini Bot Ecosystem - Simplified Version
 * Tests basic trading behavior on local validator
 */

import anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BN from 'bn.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple bot implementations (no inheritance for now)
class SimpleMarketMakerBot {
    constructor(name, connection, program, wallet) {
        this.name = name;
        this.connection = connection;
        this.program = program;
        this.wallet = wallet;
        this.tradesExecuted = 0;
        this.errors = [];
    }
    
    async execute(market) {
        try {
            // Simple market making - just try to buy small amounts
            const tradeSize = 5 + Math.random() * 10; // 5-15 USDC
            const team = Math.random() < 0.5 ? 0 : 1; // Random team
            
            console.log(`[${this.name}] Attempting to buy ${tradeSize.toFixed(2)} USDC of Team ${team === 0 ? 'A' : 'B'}`);
            
            // For now, just log the attempt (we'll add actual trading later)
            this.tradesExecuted++;
            
        } catch (error) {
            console.error(`[${this.name}] Error:`, error.message);
            this.errors.push(error.message);
        }
    }
}

class SimpleRetailBot {
    constructor(name, connection, program, wallet) {
        this.name = name;
        this.connection = connection;
        this.program = program;
        this.wallet = wallet;
        this.tradesExecuted = 0;
        this.errors = [];
    }
    
    async execute(market) {
        try {
            // Random retail behavior
            if (Math.random() > 0.4) return; // 60% chance to skip
            
            const tradeSize = 1 + Math.random() * 9; // 1-10 USDC
            const team = Math.random() < 0.5 ? 0 : 1;
            
            console.log(`[${this.name}] Retail trade: ${tradeSize.toFixed(2)} USDC for Team ${team === 0 ? 'A' : 'B'}`);
            
            this.tradesExecuted++;
            
        } catch (error) {
            console.error(`[${this.name}] Error:`, error.message);
            this.errors.push(error.message);
        }
    }
}

async function runMiniEcosystem() {
    console.log('🚀 SportsXchange Mini Bot Ecosystem (Simplified)');
    console.log('='.repeat(50) + '\n');
    
    // Setup connection
    const connection = new Connection('http://localhost:8899', 'confirmed');
    
    // Test connection
    try {
        const version = await connection.getVersion();
        console.log('✅ Connected to local validator:', version);
    } catch (error) {
        console.error('❌ Cannot connect to local validator');
        console.error('   Make sure it\'s running: solana-test-validator');
        process.exit(1);
    }
    
    // Load wallet
    const walletPath = process.env.WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
    if (!fs.existsSync(walletPath)) {
        console.error('❌ Wallet not found at:', walletPath);
        process.exit(1);
    }
    
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    console.log('✅ Wallet loaded:', wallet.publicKey.toBase58());
    
    // Load market data
    const marketDataPath = path.join(__dirname, 'data/last-usdc-market.json');
    if (!fs.existsSync(marketDataPath)) {
        console.error('❌ No market found. Create one first:');
        console.error('   node create-usdc-market.js');
        process.exit(1);
    }
    
    const marketData = JSON.parse(fs.readFileSync(marketDataPath, 'utf8'));
    const marketPda = new PublicKey(marketData.marketPda);
    console.log('✅ Market loaded:', marketPda.toBase58());
    
    // Try to fetch market data to verify it exists
    try {
        const accountInfo = await connection.getAccountInfo(marketPda);
        if (!accountInfo) {
            console.error('❌ Market account not found on chain');
            console.error('   You may need to recreate the market');
            process.exit(1);
        }
        console.log('✅ Market verified on chain');
    } catch (error) {
        console.error('❌ Error verifying market:', error.message);
        process.exit(1);
    }
    
    // Create simple program interface (we'll use it for simulation only)
    const program = {
        programId: new PublicKey('7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH'),
        provider: { connection, wallet }
    };
    
    // Create bots
    console.log('\n🤖 Creating bots...\n');
    const bots = [];
    
    // Add 2 Market Makers
    for (let i = 0; i < 2; i++) {
        const bot = new SimpleMarketMakerBot(
            `MarketMaker-${i + 1}`,
            connection,
            program,
            wallet
        );
        bots.push(bot);
        console.log(`  Added ${bot.name}`);
    }
    
    // Add 3 Retail Bots
    for (let i = 0; i < 3; i++) {
        const bot = new SimpleRetailBot(
            `RetailTrader-${i + 1}`,
            connection,
            program,
            wallet
        );
        bots.push(bot);
        console.log(`  Added ${bot.name}`);
    }
    
    console.log(`\n✅ Total bots: ${bots.length}`);
    console.log('\nStarting simulation...');
    console.log('(This is a simplified version - actual trades are simulated)\n');
    console.log('Press Ctrl+C to stop\n');
    
    // Handle shutdown
    let running = true;
    process.on('SIGINT', () => {
        console.log('\n\n⚠️ Stopping...');
        running = false;
    });
    
    // Run simulation
    const maxTicks = 20; // Shorter run for testing
    let tickCount = 0;
    
    while (running && tickCount < maxTicks) {
        tickCount++;
        console.log(`\n📍 Tick ${tickCount}/${maxTicks}`);
        console.log('-'.repeat(30));
        
        // Execute all bots
        for (const bot of bots) {
            await bot.execute({ publicKey: marketPda });
        }
        
        // Summary every 5 ticks
        if (tickCount % 5 === 0) {
            console.log('\n📊 Quick Summary:');
            for (const bot of bots) {
                console.log(`  ${bot.name}: ${bot.tradesExecuted} trades`);
            }
        }
        
        // Wait between ticks
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final report
    console.log('\n\n' + '='.repeat(50));
    console.log('📈 SIMULATION COMPLETE');
    console.log('='.repeat(50));
    
    let totalTrades = 0;
    let totalErrors = 0;
    
    for (const bot of bots) {
        totalTrades += bot.tradesExecuted;
        totalErrors += bot.errors.length;
        console.log(`\n${bot.name}:`);
        console.log(`  Trades Attempted: ${bot.tradesExecuted}`);
        console.log(`  Errors: ${bot.errors.length}`);
    }
    
    console.log('\nTOTALS:');
    console.log(`  Total Trade Attempts: ${totalTrades}`);
    console.log(`  Total Errors: ${totalErrors}`);
    console.log('\n' + '='.repeat(50));
    
    console.log('\n💡 Next Steps:');
    console.log('1. This was a simulation - no actual trades executed');
    console.log('2. To enable real trading, we need to:');
    console.log('   - Properly load the IDL with account definitions');
    console.log('   - Initialize token accounts for bots');
    console.log('   - Fund bots with USDC');
    console.log('   - Implement actual buy/sell instructions');
    console.log('\n✨ But this shows the bot ecosystem structure works!');
}

// Run it
runMiniEcosystem().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
