#!/usr/bin/env node

import anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import BN from 'bn.js';

async function testDirectCall() {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    const walletData = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
    anchor.setProvider(provider);
    
    // Load IDL and create program without using account fetching
    const idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf8'));
    const programId = new PublicKey('7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH');
    
    // Create program but only use instructions, not accounts
    const program = new anchor.Program(idl, programId, provider);
    
    // Load market data
    const marketData = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf8'));
    
    console.log('Testing buy instruction...');
    
    try {
        // Try to call buy_on_curve directly
        const tx = await program.methods
            .buyOnCurve(
                0, // Team A
                new BN(1000000), // 1 USDC
                new BN(0) // No min tokens (for testing)
            )
            .accounts({
                market: new PublicKey(marketData.marketPda),
                buyer: wallet.publicKey,
                // Other accounts will be derived
            })
            .simulate(); // Just simulate, don't execute
            
        console.log('Simulation successful!');
        console.log('Logs:', tx.logs);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.logs) {
            console.log('Logs:', e.logs);
        }
    }
}

testDirectCall().catch(console.error);
