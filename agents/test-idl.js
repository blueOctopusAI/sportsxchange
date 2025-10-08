#!/usr/bin/env node

import anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import BN from 'bn.js';

async function testIDL() {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    const walletData = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
    anchor.setProvider(provider);
    
    try {
        // Load IDL
        const idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf8'));
        console.log('IDL loaded');
        console.log('Accounts:', idl.accounts ? idl.accounts.length : 'MISSING');
        console.log('Instructions:', idl.instructions ? idl.instructions.length : 0);
        
        // Try to create program
        const programId = new PublicKey('7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH');
        const program = new anchor.Program(idl, programId, provider);
        console.log('Program created successfully');
        
        // Try to fetch market
        const marketData = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf8'));
        const market = await program.account.marketV2.fetch(marketData.marketPda);
        console.log('Market fetched:', market.gameId);
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testIDL().catch(console.error);
