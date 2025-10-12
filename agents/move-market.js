#!/usr/bin/env node

/**
 * Move Market Price
 * Execute a trade to change market prices and trigger MM bot activity
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';

const { Program, AnchorProvider, web3, BN } = anchor;

dotenv.config();

async function moveMarket() {
    try {
        const connection = new Connection('http://localhost:8899', 'confirmed');
        
        // Load wallet
        const walletPath = process.env.WALLET_PATH || path.join(homedir(), '.config/solana/id.json');
        const wallet = Keypair.fromSecretKey(
            new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
        );
        
        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed'
        });
        
        // Load IDL
        const idlPath = '../target/idl/sportsxchange.json';
        const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
        
        const programId = new PublicKey(process.env.PROGRAM_ID || '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH');
        const program = new Program(idl, programId, provider);
        
        // Get market from environment or command line
        const marketPda = process.env.TEST_MARKET || process.argv[2];
        
        if (!marketPda) {
            console.error('Please provide market address:');
            console.error('  node move-market.js <market_address>');
            console.error('Or set TEST_MARKET environment variable');
            return;
        }
        
        console.log('\n📈 Moving Market Price');
        console.log('=' .repeat(50));
        
        const marketPubkey = new PublicKey(marketPda);
        const market = await program.account.marketV2.fetch(marketPubkey);
        
        // Calculate current prices
        const priceA = (market.basePrice.toNumber() + (market.slope.toNumber() * market.teamASupply.toNumber() / 1000000)) / 1000000;
        const priceB = (market.basePrice.toNumber() + (market.slope.toNumber() * market.teamBSupply.toNumber() / 1000000)) / 1000000;
        
        console.log(`\nCurrent Prices:`);
        console.log(`  Team A (${market.teamA}): $${priceA.toFixed(4)}`);
        console.log(`  Team B (${market.teamB}): $${priceB.toFixed(4)}`);
        
        // Decide which team to buy (buy the cheaper one)
        const team = priceA <= priceB ? 0 : 1;
        const teamName = team === 0 ? market.teamA : market.teamB;
        const buyAmount = 50; // Buy $50 worth to move the price significantly
        
        console.log(`\n🎯 Buying $${buyAmount} of ${teamName} (Team ${team === 0 ? 'A' : 'B'})`);
        
        // Get USDC mint
        const usdcMint = new PublicKey(process.env.USDC_MINT || 'GvoCeUMBBJSUyZS8QKrSrKYW4fwzABoe3KkX2rH27oHa');
        
        // Get buyer's USDC account
        const buyerUsdc = await getAssociatedTokenAddress(usdcMint, wallet.publicKey);
        
        // Get team token accounts
        const buyerTeamA = await getAssociatedTokenAddress(
            market.teamAMint,
            wallet.publicKey
        );
        
        const buyerTeamB = await getAssociatedTokenAddress(
            market.teamBMint,
            wallet.publicKey
        );
        
        // Create token accounts if needed
        const instructions = [];
        
        try {
            await connection.getAccountInfo(buyerTeamA);
        } catch {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    buyerTeamA,
                    wallet.publicKey,
                    market.teamAMint
                )
            );
        }
        
        try {
            await connection.getAccountInfo(buyerTeamB);
        } catch {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    buyerTeamB,
                    wallet.publicKey,
                    market.teamBMint
                )
            );
        }
        
        if (instructions.length > 0) {
            const tx = new web3.Transaction().add(...instructions);
            await provider.sendAndConfirm(tx);
            console.log('✅ Created token accounts');
        }
        
        // Execute buy
        const usdcAmount = new BN(buyAmount * 1000000); // Convert to 6 decimals
        const minTokensOut = new BN(0); // Accept any amount for this test
        
        const tx = await program.methods
            .buyOnCurve(team, usdcAmount, minTokensOut)
            .accounts({
                buyer: wallet.publicKey,
                market: marketPubkey,
                teamAMint: market.teamAMint,
                teamBMint: market.teamBMint,
                buyerTeamAAccount: buyerTeamA,
                buyerTeamBAccount: buyerTeamB,
                buyerUsdc: buyerUsdc,
                usdcVault: market.usdcVault,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
                systemProgram: web3.SystemProgram.programId,
            })
            .rpc();
            
        console.log(`✅ Buy executed: ${tx.slice(0, 8)}...`);
        
        // Fetch updated market
        const updatedMarket = await program.account.marketV2.fetch(marketPubkey);
        
        // Calculate new prices
        const newPriceA = (updatedMarket.basePrice.toNumber() + (updatedMarket.slope.toNumber() * updatedMarket.teamASupply.toNumber() / 1000000)) / 1000000;
        const newPriceB = (updatedMarket.basePrice.toNumber() + (updatedMarket.slope.toNumber() * updatedMarket.teamBSupply.toNumber() / 1000000)) / 1000000;
        
        console.log(`\n📊 New Prices:`);
        console.log(`  Team A: $${newPriceA.toFixed(4)} ${newPriceA > priceA ? '↑' : ''}`);
        console.log(`  Team B: $${newPriceB.toFixed(4)} ${newPriceB > priceB ? '↑' : ''}`);
        
        const priceChange = team === 0 
            ? ((newPriceA - priceA) / priceA * 100)
            : ((newPriceB - priceB) / priceB * 100);
            
        console.log(`\n💫 Price Impact: +${priceChange.toFixed(2)}%`);
        console.log('\n✅ Market moved! The MM bots should now see an opportunity.');
        console.log('Re-run the intelligent MM test to see them react to the new prices.');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

moveMarket().catch(console.error);
