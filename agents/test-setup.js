#!/usr/bin/env node

import anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BN from 'bn.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test to verify everything works
async function testSimpleTrade() {
    console.log('Testing simple trade...\n');
    
    const connection = new Connection('http://localhost:8899', 'confirmed');
    
    // Load wallet
    const walletPath = `${process.env.HOME}/.config/solana/id.json`;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    
    // Load market
    const marketData = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf8'));
    const marketPda = new PublicKey(marketData.marketPda);
    
    // Setup provider without loading IDL
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
    anchor.setProvider(provider);
    
    // Program ID
    const programId = new PublicKey('7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH');
    
    console.log('Market:', marketPda.toBase58());
    console.log('Program:', programId.toBase58());
    console.log('Wallet:', wallet.publicKey.toBase58());
    
    // Try to fetch raw account data
    const accountInfo = await connection.getAccountInfo(marketPda);
    console.log('Market exists:', accountInfo !== null);
    console.log('Market size:', accountInfo?.data.length, 'bytes');
    
    console.log('\nSetup complete. Ready for trading.');
}

testSimpleTrade().catch(console.error);
