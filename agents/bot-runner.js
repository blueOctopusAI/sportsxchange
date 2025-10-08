#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runBotEcosystem() {
    console.log('🤖 Bot Ecosystem - Using Existing Scripts\n');
    
    const bots = [
        { name: 'MarketMaker-1', script: 'test-buy-usdc.js', frequency: 1.0 },
        { name: 'MarketMaker-2', script: 'test-buy-usdc.js', frequency: 1.0 },
        { name: 'Retail-1', script: 'test-buy-usdc.js', frequency: 0.3 },
        { name: 'Retail-2', script: 'test-buy-usdc.js', frequency: 0.4 },
    ];
    
    console.log('Running 20 rounds of trading...\n');
    
    for (let round = 1; round <= 20; round++) {
        console.log(`\n📍 Round ${round}/20`);
        console.log('-'.repeat(30));
        
        for (const bot of bots) {
            if (Math.random() < bot.frequency) {
                try {
                    console.log(`[${bot.name}] Trading...`);
                    // Run the actual working script
                    await execAsync(`node ${bot.script}`);
                    console.log(`[${bot.name}] ✅ Success`);
                } catch (error) {
                    console.log(`[${bot.name}] ❌ Failed`);
                }
            } else {
                console.log(`[${bot.name}] Skipping`);
            }
        }
        
        // Wait between rounds
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('\n✅ Complete!');
}

runBotEcosystem().catch(console.error);
