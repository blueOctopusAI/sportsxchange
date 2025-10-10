#!/usr/bin/env node

/**
 * Fund Bots with Test USDC
 * Transfers test USDC from main wallet to bot wallets
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function fundBots() {
    console.log('💰 Funding Bots with Test USDC');
    console.log('='.repeat(50));
    
    try {
        // Load main wallet
        const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
        const mainWallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
        
        // Load market for USDC mint
        const market = JSON.parse(fs.readFileSync('./data/last-usdc-market.json', 'utf-8'));
        const usdcMint = new PublicKey(market.usdcMint);
        
        // Connect to local validator
        const connection = new Connection(process.env.RPC_URL || 'http://localhost:8899', 'confirmed');
        
        // Check main wallet USDC balance
        const mainUsdcAccount = getAssociatedTokenAddressSync(usdcMint, mainWallet.publicKey);
        const mainAccount = await getAccount(connection, mainUsdcAccount);
        const mainBalance = Number(mainAccount.amount) / 1000000;
        
        console.log(`\n📊 Main Wallet USDC Balance: ${mainBalance}`);
        
        if (mainBalance < 100) {
            console.log('\n⚠️  Main wallet needs more USDC. Run: node usdc-faucet.js');
            return;
        }
        
        // Bot wallets to fund (you can add more)
        const botWallets = [
            // Generate some test bot wallets
            { name: 'MarketMaker-1', wallet: Keypair.generate(), amount: 100 },
            { name: 'MarketMaker-2', wallet: Keypair.generate(), amount: 100 },
            { name: 'Arbitrage-1', wallet: Keypair.generate(), amount: 150 },
            { name: 'Momentum-1', wallet: Keypair.generate(), amount: 75 },
            { name: 'Retail-1', wallet: Keypair.generate(), amount: 50 },
            { name: 'Retail-2', wallet: Keypair.generate(), amount: 50 },
            { name: 'Whale-1', wallet: Keypair.generate(), amount: 500 },
        ];
        
        console.log(`\n🤖 Funding ${botWallets.length} bot wallets...`);
        
        for (const bot of botWallets) {
            console.log(`\n${bot.name}:`);
            console.log(`  Wallet: ${bot.wallet.publicKey.toString()}`);
            
            try {
                // Airdrop SOL for gas
                console.log(`  Airdropping SOL...`);
                const airdropSig = await connection.requestAirdrop(
                    bot.wallet.publicKey,
                    2000000000 // 2 SOL
                );
                await connection.confirmTransaction(airdropSig);
                console.log(`  ✅ Airdropped 2 SOL`);
                
                // Create or get USDC account
                const botUsdcAccount = getAssociatedTokenAddressSync(usdcMint, bot.wallet.publicKey);
                
                let needsAccount = false;
                try {
                    await getAccount(connection, botUsdcAccount);
                } catch {
                    needsAccount = true;
                }
                
                const tx = new Transaction();
                
                if (needsAccount) {
                    console.log(`  Creating USDC account...`);
                    tx.add(
                        createAssociatedTokenAccountInstruction(
                            mainWallet.publicKey,
                            botUsdcAccount,
                            bot.wallet.publicKey,
                            usdcMint
                        )
                    );
                }
                
                // Transfer USDC
                console.log(`  Transferring ${bot.amount} USDC...`);
                tx.add(
                    createTransferInstruction(
                        mainUsdcAccount,
                        botUsdcAccount,
                        mainWallet.publicKey,
                        bot.amount * 1000000,
                        [],
                        TOKEN_PROGRAM_ID
                    )
                );
                
                const sig = await sendAndConfirmTransaction(
                    connection,
                    tx,
                    [mainWallet],
                    { commitment: 'confirmed' }
                );
                
                console.log(`  ✅ Funded with ${bot.amount} USDC: ${sig.slice(0, 8)}...`);
                
                // Save bot wallet for later use
                const botData = {
                    name: bot.name,
                    publicKey: bot.wallet.publicKey.toString(),
                    secretKey: Array.from(bot.wallet.secretKey),
                    fundedAmount: bot.amount,
                    timestamp: new Date().toISOString()
                };
                
                // Create bots directory if it doesn't exist
                if (!fs.existsSync('./data/bot-wallets')) {
                    fs.mkdirSync('./data/bot-wallets', { recursive: true });
                }
                
                fs.writeFileSync(
                    `./data/bot-wallets/${bot.name}.json`,
                    JSON.stringify(botData, null, 2)
                );
                
            } catch (error) {
                console.error(`  ❌ Failed to fund: ${error.message}`);
            }
        }
        
        // Check remaining balance
        const finalAccount = await getAccount(connection, mainUsdcAccount);
        const finalBalance = Number(finalAccount.amount) / 1000000;
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Bot Funding Complete!');
        console.log(`📊 Main wallet USDC remaining: ${finalBalance}`);
        console.log(`💾 Bot wallets saved to: ./data/bot-wallets/`);
        
        console.log('\n📝 Next Steps:');
        console.log('1. Run individual bots: node test-real-bot-trading.js');
        console.log('2. Or run the full ecosystem with real trades');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error(error.stack);
    }
}

fundBots().catch(console.error);
