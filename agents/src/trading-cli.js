import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

class TradingClient {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.programId = null;
  }

  async initialize() {
    const walletPath = process.env.WALLET_PATH;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    this.connection = new Connection(process.env.RPC_URL, 'confirmed');
    this.programId = new PublicKey(process.env.PROGRAM_ID);
    
    console.log('Trading client initialized');
    console.log('Wallet:', this.wallet.publicKey.toString());
  }

  async fundUser(marketPda, homeAmount, awayAmount) {
    const market = new PublicKey(marketPda);
    
    // Get market data to find mints
    const marketData = await this.getMarketData(market);
    const homeMint = new PublicKey(marketData.homeMint);
    const awayMint = new PublicKey(marketData.awayMint);
    
    // Get user token accounts
    const userHomeAccount = await this.getAssociatedTokenAddress(homeMint, this.wallet.publicKey);
    const userAwayAccount = await this.getAssociatedTokenAddress(awayMint, this.wallet.publicKey);
    
    // First transaction: Create ATAs if needed
    const homeAccountInfo = await this.connection.getAccountInfo(userHomeAccount);
    const awayAccountInfo = await this.connection.getAccountInfo(userAwayAccount);
    
    if (!homeAccountInfo || !awayAccountInfo) {
      const setupTx = new Transaction();
      
      if (!homeAccountInfo) {
        const createHomeAccountIx = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey, // payer
          userHomeAccount, // ata
          this.wallet.publicKey, // owner
          homeMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        setupTx.add(createHomeAccountIx);
      }
      
      if (!awayAccountInfo) {
        const createAwayAccountIx = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey, // payer
          userAwayAccount, // ata
          this.wallet.publicKey, // owner
          awayMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        setupTx.add(createAwayAccountIx);
      }
      
      if (setupTx.instructions.length > 0) {
        console.log('Creating token accounts...');
        await sendAndConfirmTransaction(
          this.connection,
          setupTx,
          [this.wallet],
          { commitment: 'confirmed' }
        );
        console.log('Token accounts created');
      }
    }
    
    // Second transaction: Fund the accounts
    const fundTx = new Transaction();
    
    // Create fund user instruction
    const fundUserIx = {
      programId: this.programId,
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: homeMint, isSigner: false, isWritable: true },
        { pubkey: awayMint, isSigner: false, isWritable: true },
        { pubkey: userHomeAccount, isSigner: false, isWritable: true },
        { pubkey: userAwayAccount, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([36, 127, 154, 74, 24, 176, 49, 159]), // discriminator for fund_user
        this.encodeU64(homeAmount * 1_000_000), // with decimals
        this.encodeU64(awayAmount * 1_000_000),
      ])
    };
    
    fundTx.add(fundUserIx);
    
    console.log('Funding accounts...');
    const sig = await sendAndConfirmTransaction(
      this.connection,
      fundTx,
      [this.wallet],
      { commitment: 'confirmed' }
    );
    
    return {
      signature: sig,
      homeAmount,
      awayAmount
    };
  }

  async swap(marketPda, direction, amountIn) {
    const market = new PublicKey(marketPda);
    
    // Get market data
    const marketData = await this.getMarketData(market);
    const homeMint = new PublicKey(marketData.homeMint);
    const awayMint = new PublicKey(marketData.awayMint);
    
    // Get pool PDA
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), market.toBuffer()],
      this.programId
    );
    
    // Get pool data to calculate expected output
    const poolData = await this.getPoolData(poolPda);
    
    // Get vault addresses
    const homeVault = await this.getAssociatedTokenAddress(homeMint, poolPda);
    const awayVault = await this.getAssociatedTokenAddress(awayMint, poolPda);
    
    // Get user token accounts
    const userHomeAccount = await this.getAssociatedTokenAddress(homeMint, this.wallet.publicKey);
    const userAwayAccount = await this.getAssociatedTokenAddress(awayMint, this.wallet.publicKey);
    
    // Check if ATAs exist and create if necessary
    const homeAccountInfo = await this.connection.getAccountInfo(userHomeAccount);
    const awayAccountInfo = await this.connection.getAccountInfo(userAwayAccount);
    
    if (!homeAccountInfo || !awayAccountInfo) {
      const setupTx = new Transaction();
      
      if (!homeAccountInfo) {
        console.log('Creating HOME token account for swap...');
        const createHomeAccountIx = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey, // payer
          userHomeAccount, // ata
          this.wallet.publicKey, // owner
          homeMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        setupTx.add(createHomeAccountIx);
      }
      
      if (!awayAccountInfo) {
        console.log('Creating AWAY token account for swap...');
        const createAwayAccountIx = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey, // payer
          userAwayAccount, // ata
          this.wallet.publicKey, // owner
          awayMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        setupTx.add(createAwayAccountIx);
      }
      
      if (setupTx.instructions.length > 0) {
        console.log('Creating required token accounts...');
        await sendAndConfirmTransaction(
          this.connection,
          setupTx,
          [this.wallet],
          { commitment: 'confirmed' }
        );
        console.log('Token accounts created');
      }
    }
    
    const tx = new Transaction();
    
    // Calculate expected output
    const amountInWithDecimals = amountIn * 1_000_000;
    let expectedOut;
    
    if (direction === 'home_for_away') {
      expectedOut = this.calculateAmountOut(
        amountInWithDecimals,
        poolData.homeReserve,
        poolData.awayReserve
      );
    } else {
      expectedOut = this.calculateAmountOut(
        amountInWithDecimals,
        poolData.awayReserve,
        poolData.homeReserve
      );
    }
    
    // Allow 1% slippage
    const minAmountOut = Math.floor(expectedOut * 0.99);
    
    // Create swap instruction
    const discriminator = direction === 'home_for_away' 
      ? [45, 234, 115, 23, 131, 90, 171, 63]  // swap_home_for_away
      : [11, 102, 94, 105, 113, 231, 32, 21]; // swap_away_for_home
    
    const swapIx = {
      programId: this.programId,
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: homeVault, isSigner: false, isWritable: true },
        { pubkey: awayVault, isSigner: false, isWritable: true },
        { pubkey: userHomeAccount, isSigner: false, isWritable: true },
        { pubkey: userAwayAccount, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from(discriminator),
        this.encodeU64(amountInWithDecimals),
        this.encodeU64(minAmountOut),
      ])
    };
    
    tx.add(swapIx);
    
    const sig = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet],
      { commitment: 'confirmed' }
    );
    
    return {
      signature: sig,
      direction,
      amountIn,
      expectedOut: expectedOut / 1_000_000,
      minAmountOut: minAmountOut / 1_000_000
    };
  }

  async getBalance(marketPda) {
    const market = new PublicKey(marketPda);
    const marketData = await this.getMarketData(market);
    
    const homeMint = new PublicKey(marketData.homeMint);
    const awayMint = new PublicKey(marketData.awayMint);
    
    const userHomeAccount = await this.getAssociatedTokenAddress(homeMint, this.wallet.publicKey);
    const userAwayAccount = await this.getAssociatedTokenAddress(awayMint, this.wallet.publicKey);
    
    let homeBalance = 0;
    let awayBalance = 0;
    
    try {
      const homeAccount = await getAccount(this.connection, userHomeAccount);
      homeBalance = Number(homeAccount.amount) / 1_000_000;
    } catch (e) {
      // Account doesn't exist
    }
    
    try {
      const awayAccount = await getAccount(this.connection, userAwayAccount);
      awayBalance = Number(awayAccount.amount) / 1_000_000;
    } catch (e) {
      // Account doesn't exist
    }
    
    return { homeBalance, awayBalance };
  }

  async getPoolInfo(marketPda) {
    const market = new PublicKey(marketPda);
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), market.toBuffer()],
      this.programId
    );
    
    const poolData = await this.getPoolData(poolPda);
    
    const homeReserve = Number(poolData.homeReserve) / 1000000;
    const awayReserve = Number(poolData.awayReserve) / 1000000;
    
    // Calculate price (away tokens per home token)
    const price = awayReserve / homeReserve;
    
    // Calculate implied probabilities
    const totalReserve = homeReserve + awayReserve;
    const homeProb = awayReserve / totalReserve;
    const awayProb = homeReserve / totalReserve;
    
    return {
      homeReserve,
      awayReserve,
      price,
      homeProb: (homeProb * 100).toFixed(1) + '%',
      awayProb: (awayProb * 100).toFixed(1) + '%',
      constantK: poolData.constantK.toString()
    };
  }

  async getMarketData(marketPda) {
    // Since agent-state.json doesn't store mints, we need to use hardcoded values
    // These are the actual mints from the deployed markets
    
    // NOTE: These mints need to be discovered from the blockchain
    // Run this to get them: solana account <MARKET_PDA> --output json
    const marketMints = {
      'HVoN6gYHdxeixkyBBtTNchu4x6MwsL9UNoY1fAiZrsTA': {
        homeMint: '8Ua1LhsR4FjGciU47EQL7pegS3mXvJdPdyHMfzHqYCSs',
        awayMint: '4FjibE9dRbcpFL366dubv5pKWE8xE6kof5JX8s1uJKVx',
        homeTeam: 'KC',
        awayTeam: 'BAL'
      },
      'AV5tb52EJgVh7eLEcDcmu4GYdXuAJBpBcyyNEbYHw9Zm': {
        homeMint: '2p6LMM4vnRVAsr1aN4mYPXvE3Y2HLL9Rf5Sw8cv8oZB9',
        awayMint: 'DjmUXQhqLbqvnqsNY8aR8gQLUjCV1DrHQeFcU6aG3f58',
        homeTeam: 'DET',
        awayTeam: 'HOU'
      },
      '9tt9xoeZ4iyGH1hX7ntVamvE1ktD614T55bHnYqw3Rhw': {
        homeMint: 'H8Uus2AqAYenmrp9snLYhstEw7iwXJ381xR4S9Wh5kCR',
        awayMint: 'F3rAm7EmYvBwTWS7ie6U5HhaGyyiWja8Ax1JYtkB6pEa',
        homeTeam: 'SF',
        awayTeam: 'DAL'
      },
      '8JHVdcX52BiRgCx3YAZPGAt5LDyBXGqC8523413XYb7M': {
        homeMint: 'DoArXf8NPy1DURDFMGUYPM1GaSiwfd2oEABF6Q7VxwnX',
        awayMint: 'ADiMFVNneExHkJJG7iRZ5SmXjhJbgsyNx7cxFTqtavTK',
        homeTeam: 'GB',
        awayTeam: 'CHI'
      }
    };
    
    const data = marketMints[marketPda.toString()];
    if (!data) {
      console.error('Market not found:', marketPda.toString());
      console.error('Available markets:', Object.keys(marketMints));
      
      // Try to discover from blockchain
      console.log('Attempting to discover mints from blockchain...');
      try {
        const marketPubkey = new PublicKey(marketPda);
        const accountInfo = await this.connection.getAccountInfo(marketPubkey);
        
        if (accountInfo && accountInfo.data) {
          // Parse market account to extract mints
          const dataBuffer = accountInfo.data;
          let offset = 8 + 32; // Skip discriminator + authority
          
          // Skip game_id
          const gameIdLen = dataBuffer.readUInt32LE(offset);
          offset += 4 + gameIdLen;
          
          // Skip home_team
          const homeTeamLen = dataBuffer.readUInt32LE(offset);
          const homeTeamBytes = dataBuffer.slice(offset + 4, offset + 4 + homeTeamLen);
          const homeTeam = new TextDecoder().decode(homeTeamBytes);
          offset += 4 + homeTeamLen;
          
          // Skip away_team  
          const awayTeamLen = dataBuffer.readUInt32LE(offset);
          const awayTeamBytes = dataBuffer.slice(offset + 4, offset + 4 + awayTeamLen);
          const awayTeam = new TextDecoder().decode(awayTeamBytes);
          offset += 4 + awayTeamLen;
          
          // Read mints
          const homeMintBytes = dataBuffer.slice(offset, offset + 32);
          const homeMint = new PublicKey(homeMintBytes).toString();
          offset += 32;
          
          const awayMintBytes = dataBuffer.slice(offset, offset + 32);
          const awayMint = new PublicKey(awayMintBytes).toString();
          
          console.log('Discovered mints from blockchain:');
          console.log('  Home Mint:', homeMint);
          console.log('  Away Mint:', awayMint);
          console.log('  Teams:', homeTeam, 'vs', awayTeam);
          
          return {
            homeMint,
            awayMint,
            homeTeam,
            awayTeam
          };
        }
      } catch (error) {
        console.error('Failed to discover mints:', error.message);
      }
      
      throw new Error('Market not found in hardcoded data or blockchain: ' + marketPda.toString());
    }
    
    return data;
  }

  async getPoolData(poolPda) {
    try {
      // Try to get actual on-chain data first
      const accountInfo = await this.connection.getAccountInfo(poolPda);
      
      if (accountInfo && accountInfo.data) {
        // Parse the account data (skip discriminator and other fields)
        // Pool structure: market(32) + home_vault(32) + away_vault(32) + home_reserve(8) + away_reserve(8) + constant_k(8) + bump(1)
        const dataBuffer = accountInfo.data;
        
        // Skip discriminator (8 bytes) and market pubkey (32 bytes) to get to vaults
        let offset = 8 + 32;
        
        // Skip home_vault (32 bytes)
        offset += 32;
        
        // Skip away_vault (32 bytes)
        offset += 32;
        
        // Read home_reserve (8 bytes)
        const homeReserve = dataBuffer.readBigUInt64LE(offset);
        offset += 8;
        
        // Read away_reserve (8 bytes)
        const awayReserve = dataBuffer.readBigUInt64LE(offset);
        offset += 8;
        
        // Read constant_k (8 bytes)
        const constantK = dataBuffer.readBigUInt64LE(offset);
        
        console.log('Got actual pool data:', {
          homeReserve: homeReserve.toString(),
          awayReserve: awayReserve.toString(),
          constantK: constantK.toString()
        });
        
        return {
          homeReserve: Number(homeReserve),
          awayReserve: Number(awayReserve),
          constantK: constantK
        };
      }
    } catch (error) {
      console.log('Could not read on-chain pool data, using defaults:', error.message);
    }
    
    // Fallback to mock data if can't read on-chain
    return {
      homeReserve: 1000000000, // 1000 tokens with 6 decimals
      awayReserve: 1000000000,
      constantK: 1000000000000000000n
    };
  }

  calculateAmountOut(amountIn, reserveIn, reserveOut) {
    // dy = (y * dx) / (x + dx)
    const numerator = reserveOut * amountIn;
    const denominator = reserveIn + amountIn;
    return Math.floor(numerator / denominator);
  }

  encodeU64(num) {
    const bn = new BN(num);
    const buf = Buffer.alloc(8);
    bn.toArrayLike(Buffer, 'le', 8).copy(buf);
    return buf;
  }

  async getAssociatedTokenAddress(mint, owner) {
    const [address] = PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return address;
  }
}

// CLI Interface
async function main() {
  const client = new TradingClient();
  await client.initialize();
  
  const command = process.argv[2];
  const marketPda = process.argv[3];
  
  if (!command) {
    console.log('Usage:');
    console.log('  node trading-cli.js fund <market> <home_amount> <away_amount>');
    console.log('  node trading-cli.js buy-home <market> <amount>');
    console.log('  node trading-cli.js buy-away <market> <amount>');
    console.log('  node trading-cli.js balance <market>');
    console.log('  node trading-cli.js pool <market>');
    process.exit(1);
  }
  
  try {
    switch(command) {
      case 'fund':
        const homeAmount = parseInt(process.argv[4]) || 100;
        const awayAmount = parseInt(process.argv[5]) || 100;
        const fundResult = await client.fundUser(marketPda, homeAmount, awayAmount);
        console.log('Funded user with:', fundResult);
        break;
        
      case 'buy-home':
        const awayIn = parseInt(process.argv[4]) || 10;
        const buyHomeResult = await client.swap(marketPda, 'away_for_home', awayIn);
        console.log('Swap result:', buyHomeResult);
        break;
        
      case 'buy-away':
        const homeIn = parseInt(process.argv[4]) || 10;
        const buyAwayResult = await client.swap(marketPda, 'home_for_away', homeIn);
        console.log('Swap result:', buyAwayResult);
        break;
        
      case 'balance':
        const balance = await client.getBalance(marketPda);
        console.log('Your balance:', balance);
        break;
        
      case 'pool':
        const pool = await client.getPoolInfo(marketPda);
        console.log('Pool info:', pool);
        break;
        
      default:
        console.log('Unknown command:', command);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for use in other scripts
export { TradingClient };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
