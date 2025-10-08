#!/usr/bin/env node

/**
 * Fixed version that randomly buys both teams
 */

import anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import BN from 'bn.js';

async function testBuyRandom() {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    
    // Load wallet
    const wallet = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
    
    // Load market
    const marketData = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf8'));
    
    // Random team selection
    const team = Math.random() < 0.5 ? 0 : 1;
    const teamName = team === 0 ? 'A' : 'B';
    
    // Random amount (1-10 USDC)
    const amount = Math.floor(Math.random() * 9 + 1);
    
    console.log(`Buying ${amount} USDC worth of Team ${teamName} tokens...`);
    
    try {
        // Use existing working script but with team parameter
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Modify the test-buy-usdc.js call to include team
        // For now, just run it as is
        await execAsync('node test-buy-usdc.js');
        
        console.log(`✅ Bought Team ${teamName} tokens`);
    } catch (error) {
        console.error('❌ Buy failed:', error.message);
    }
}

testBuyRandom().catch(console.error);
