import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
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
import readline from 'readline';

dotenv.config();

// USDC mint singleton - we'll reuse the same mint for all faucet requests
let PERSISTENT_USDC_MINT = null;
const USDC_MINT_FILE = './data/test-usdc-mint.json';

class USDCFaucet {
  constructor() {
    this.connection = new Connection(process.env.RPC_URL || 'http://127.0.0.1:8899', 'confirmed');
    this.authority = null;
    this.usdcMint = null;
  }

  async initialize() {
    // Load wallet
    const walletPath = process.env.WALLET_PATH;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    this.authority = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    console.log('💧 USDC Test Faucet');
    console.log('='.repeat(50));
    console.log('Authority:', this.authority.publicKey.toString());
    
    // Load or create USDC mint
    await this.loadOrCreateUSDCMint();
  }

  async loadOrCreateUSDCMint() {
    // Check if we have a saved USDC mint
    if (fs.existsSync(USDC_MINT_FILE)) {
      try {
        const mintData = JSON.parse(fs.readFileSync(USDC_MINT_FILE, 'utf-8'));
        this.usdcMint = new PublicKey(mintData.mint);
        
        // Verify it still exists on chain
        const mintInfo = await this.connection.getAccountInfo(this.usdcMint);
        if (mintInfo) {
          console.log('✅ Using existing USDC mint:', this.usdcMint.toString());
          return;
        }
      } catch (e) {
        console.log('Previous mint not valid, creating new one...');
      }
    }

    // Create new USDC mint
    console.log('Creating new test USDC mint...');
    this.usdcMint = await createMint(
      this.connection,
      this.authority,
      this.authority.publicKey,
      null,
      6, // 6 decimals like real USDC
      undefined,
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    // Save for future use
    fs.writeFileSync(USDC_MINT_FILE, JSON.stringify({
      mint: this.usdcMint.toString(),
      authority: this.authority.publicKey.toString(),
      createdAt: new Date().toISOString()
    }, null, 2));

    console.log('✅ Created new USDC mint:', this.usdcMint.toString());
  }

  async airdrop(recipientAddress, amount = 1000) {
    try {
      const recipient = new PublicKey(recipientAddress);
      
      console.log(`\n💸 Airdropping ${amount} USDC to ${recipientAddress}`);
      
      // Get or create recipient's token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.authority,
        this.usdcMint,
        recipient,
        false,
        'confirmed',
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('   Token account:', recipientTokenAccount.address.toString());

      // Mint USDC to recipient
      const signature = await mintTo(
        this.connection,
        this.authority,
        this.usdcMint,
        recipientTokenAccount.address,
        this.authority,
        amount * 1_000_000, // Convert to 6 decimals
        [],
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
      );

      console.log('   ✅ Success! Transaction:', signature);
      
      // Check new balance
      const tokenAccount = await getAccount(this.connection, recipientTokenAccount.address);
      const balance = Number(tokenAccount.amount) / 1_000_000;
      console.log('   New balance:', balance, 'USDC');
      
      return {
        signature,
        mint: this.usdcMint.toString(),
        tokenAccount: recipientTokenAccount.address.toString(),
        balance
      };
      
    } catch (error) {
      console.error('❌ Airdrop failed:', error.message);
      throw error;
    }
  }

  async checkBalance(address) {
    try {
      const publicKey = new PublicKey(address);
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.authority,
        this.usdcMint,
        publicKey,
        false,
        'confirmed'
      );
      
      const account = await getAccount(this.connection, tokenAccount.address);
      const balance = Number(account.amount) / 1_000_000;
      
      console.log(`\n💰 Balance for ${address}:`);
      console.log(`   ${balance} USDC`);
      
      return balance;
    } catch (error) {
      console.error('Error checking balance:', error.message);
      return 0;
    }
  }

  getMintAddress() {
    return this.usdcMint?.toString();
  }
}

// Interactive CLI
async function runInteractiveFaucet() {
  const faucet = new USDCFaucet();
  await faucet.initialize();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (question) => {
    return new Promise(resolve => rl.question(question, resolve));
  };

  console.log('\n📝 Commands:');
  console.log('   1. Airdrop USDC');
  console.log('   2. Check balance');
  console.log('   3. Show mint address');
  console.log('   4. Exit');

  while (true) {
    const choice = await askQuestion('\nSelect option (1-4): ');
    
    switch(choice.trim()) {
      case '1':
        const address = await askQuestion('Enter recipient address: ');
        const amountStr = await askQuestion('Enter amount (default 1000): ');
        const amount = parseInt(amountStr) || 1000;
        
        try {
          await faucet.airdrop(address.trim(), amount);
        } catch (e) {
          console.error('Failed:', e.message);
        }
        break;
        
      case '2':
        const checkAddress = await askQuestion('Enter address to check: ');
        await faucet.checkBalance(checkAddress.trim());
        break;
        
      case '3':
        console.log('\n🪙 Test USDC Mint:', faucet.getMintAddress());
        console.log('   Save this in your mobile app config!');
        break;
        
      case '4':
        console.log('Goodbye! 👋');
        rl.close();
        process.exit(0);
        
      default:
        console.log('Invalid option');
    }
  }
}

// Quick airdrop mode (non-interactive)
async function quickAirdrop() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return runInteractiveFaucet();
  }

  const faucet = new USDCFaucet();
  await faucet.initialize();

  const [address, amount] = args;
  const airdropAmount = parseInt(amount) || 1000;
  
  await faucet.airdrop(address, airdropAmount);
  console.log('\n💾 USDC Mint:', faucet.getMintAddress());
  console.log('   Add this to your mobile app config!');
}

// Run the faucet
quickAirdrop().catch(console.error);
