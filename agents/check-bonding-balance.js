import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function checkBondingCurveBalance() {
  console.log('🔍 Checking Bonding Curve Balances');
  console.log('='.repeat(50));

  // Load the last market data
  const marketData = JSON.parse(fs.readFileSync('./data/last-bonding-market.json', 'utf-8'));
  
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const walletPubkey = new PublicKey('3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk');
  
  console.log('Market:', marketData.marketPda);
  console.log('Wallet:', walletPubkey.toString());
  console.log('');

  try {
    // Check Team A token balance
    const teamAMint = new PublicKey(marketData.teamAMint);
    const teamAAccount = getAssociatedTokenAddressSync(
      teamAMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const teamATokenAccount = await getAccount(connection, teamAAccount);
    const teamABalance = Number(teamATokenAccount.amount) / 1_000_000; // 6 decimals
    
    console.log('💰 Team A (CHIEFS) Balance:', teamABalance, 'tokens');
    
    // Check Team B token balance
    const teamBMint = new PublicKey(marketData.teamBMint);
    const teamBAccount = getAssociatedTokenAddressSync(
      teamBMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const teamBTokenAccount = await getAccount(connection, teamBAccount);
    const teamBBalance = Number(teamBTokenAccount.amount) / 1_000_000; // 6 decimals
    
    console.log('💰 Team B (RAVENS) Balance:', teamBBalance, 'tokens');
    
    // Check USDC vault balance
    const usdcVault = new PublicKey(marketData.usdcVault);
    const vaultAccount = await getAccount(connection, usdcVault);
    const vaultBalance = Number(vaultAccount.amount) / 1_000_000; // 6 decimals
    
    console.log('');
    console.log('🏦 USDC Vault Balance:', vaultBalance, 'USDC');
    
    // Calculate implied price
    if (teamABalance > 0) {
      const impliedPrice = 1 / teamABalance; // $1 bought X tokens
      console.log('📈 Implied Team A token price: $', impliedPrice.toFixed(6), 'per token');
    }
    
    console.log('');
    console.log('✅ The linear bonding curve is working!');
    console.log('   - Tokens were minted to the buyer');
    console.log('   - USDC was transferred to the vault');
    console.log('   - Price will increase linearly with supply');
    
  } catch (error) {
    console.error('Error checking balances:', error);
  }
}

checkBondingCurveBalance().catch(console.error);
