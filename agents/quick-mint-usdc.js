#!/usr/bin/env node

/**
 * Quick USDC Mint for Main Wallet and Bots
 * Automatically mints test USDC without interaction
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function quickMintUsdc() {
    console.log('💰 Quick USDC Mint for Testing');
    console.log('='.repeat(50));
    
    try {
        // Load wallet
        const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
        const authority = Keypair.fromSecretKey(Uint8Array.from(walletData));
        
        // Connection
        const connection = new Connection(process.env.RPC_URL || 'http://127.0.0.1:8899', 'confirmed');
        
        console.log('Authority:', authority.publicKey.toString());
        
        // Load or create USDC mint
        let usdcMint;
        const USDC_MINT_FILE = './data/test-usdc-mint.json';
        
        if (fs.existsSync(USDC_MINT_FILE)) {
            try {
                const mintData = JSON.parse(fs.readFileSync(USDC_MINT_FILE, 'utf-8'));
                usdcMint = new PublicKey(mintData.mint);
                
                // Verify it still exists
                const mintInfo = await connection.getAccountInfo(usdcMint);
                if (mintInfo) {
                    console.log('✅ Using existing USDC mint:', usdcMint.toString());
                } else {
                    throw new Error('Mint not found on chain');
                }
            } catch (e) {
                console.log('Previous mint not valid, creating new one...');
                usdcMint = null;
            }
        }
        
        // Create new mint if needed
        if (!usdcMint) {
            console.log('Creating new test USDC mint...');
            usdcMint = await createMint(
                connection,
                authority,
                authority.publicKey,
                null,
                6, // 6 decimals like real USDC
                undefined,
                { commitment: 'confirmed' },
                TOKEN_PROGRAM_ID
            );
            
            // Save for future use
            fs.writeFileSync(USDC_MINT_FILE, JSON.stringify({
                mint: usdcMint.toString(),
                authority: authority.publicKey.toString(),
                createdAt: new Date().toISOString()
            }, null, 2));
            
            console.log('✅ Created new USDC mint:', usdcMint.toString());
        }
        
        // Mint 5000 USDC to main wallet
        console.log('\n💸 Minting 5000 USDC to main wallet...');
        
        const mainTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            authority,
            usdcMint,
            authority.publicKey,
            false,
            'confirmed',
            { commitment: 'confirmed' },
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const signature = await mintTo(
            connection,
            authority,
            usdcMint,
            mainTokenAccount.address,
            authority,
            5000 * 1_000_000, // 5000 USDC with 6 decimals
            [],
            { commitment: 'confirmed' },
            TOKEN_PROGRAM_ID
        );
        
        console.log('✅ Success! Transaction:', signature);
        
        // Check new balance
        const tokenAccount = await getAccount(connection, mainTokenAccount.address);
        const balance = Number(tokenAccount.amount) / 1_000_000;
        console.log('💰 New balance:', balance, 'USDC');
        
        // Update last market file with correct USDC mint if it exists
        const lastMarketFile = './data/last-usdc-market.json';
        if (fs.existsSync(lastMarketFile)) {
            const marketData = JSON.parse(fs.readFileSync(lastMarketFile, 'utf-8'));
            if (marketData.usdcMint !== usdcMint.toString()) {
                marketData.usdcMint = usdcMint.toString();
                fs.writeFileSync(lastMarketFile, JSON.stringify(marketData, null, 2));
                console.log('\n✅ Updated market data with correct USDC mint');
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ USDC minting complete!');
        console.log('='.repeat(50));
        console.log('\n📝 Next steps:');
        console.log('1. Run: npm run fund-bots');
        console.log('2. Then: npm run phase3:real');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error(error.stack);
    }
}

quickMintUsdc().catch(console.error);
