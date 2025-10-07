import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';

export class SportsXchangeClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
  }

  // Market data (hardcoded for now, should fetch from chain)
  private marketData = {
    'HVoN6gYHdxeixkyBBtTNchu4x6MwsL9UNoY1fAiZrsTA': {
      homeMint: '8Ua1LhsR4FjGciU47EQL7pegS3mXvJdPdyHMfzHqYCSs',
      awayMint: '4FjibE9dRbcpFL366dubv5pKWE8xE6kof5JX8s1uJKVx',
      homeTeam: 'KC',
      awayTeam: 'BAL',
    },
    'AV5tb52EJgVh7eLEcDcmu4GYdXuAJBpBcyyNEbYHw9Zm': {
      homeMint: '2p6LMM4vnRVAsr1aN4mYPXvE3Y2HLL9Rf5Sw8cv8oZB9',
      awayMint: 'DjmUXQhqLbqvnqsNY8aR8gQLUjCV1DrHQeFcU6aG3f58',
      homeTeam: 'DET',
      awayTeam: 'HOU',
    },
  };

  async getPoolInfo(marketPda: string) {
    const market = new PublicKey(marketPda);
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), market.toBuffer()],
      this.programId
    );

    try {
      const accountInfo = await this.connection.getAccountInfo(poolPda);
      
      if (accountInfo && accountInfo.data) {
        // Parse pool data
        const dataBuffer = accountInfo.data;
        let offset = 8 + 32 + 32 + 32; // Skip discriminator, market, vaults
        
        const homeReserve = dataBuffer.readBigUInt64LE(offset);
        offset += 8;
        const awayReserve = dataBuffer.readBigUInt64LE(offset);
        
        const homeReserveNum = Number(homeReserve) / 1_000_000;
        const awayReserveNum = Number(awayReserve) / 1_000_000;
        
        // Calculate probabilities
        const totalReserve = homeReserveNum + awayReserveNum;
        const homeProb = ((awayReserveNum / totalReserve) * 100).toFixed(1);
        const awayProb = ((homeReserveNum / totalReserve) * 100).toFixed(1);
        
        return {
          homeReserve: homeReserveNum,
          awayReserve: awayReserveNum,
          homeProb: `${homeProb}%`,
          awayProb: `${awayProb}%`,
        };
      }
    } catch (error) {
      console.error('Error fetching pool info:', error);
    }

    // Return default values if error
    return {
      homeReserve: 1000,
      awayReserve: 1000,
      homeProb: '50.0%',
      awayProb: '50.0%',
    };
  }

  async fundUser(
    marketPda: string,
    walletPubkey: PublicKey,
    homeAmount: number,
    awayAmount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ) {
    const market = new PublicKey(marketPda);
    const marketInfo = this.marketData[marketPda];
    
    if (!marketInfo) {
      throw new Error('Market not found');
    }

    const homeMint = new PublicKey(marketInfo.homeMint);
    const awayMint = new PublicKey(marketInfo.awayMint);

    // Get ATAs
    const userHomeAccount = await getAssociatedTokenAddress(
      homeMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const userAwayAccount = await getAssociatedTokenAddress(
      awayMint,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction();

    // Check if ATAs exist and create if needed
    const homeAccountInfo = await this.connection.getAccountInfo(userHomeAccount);
    const awayAccountInfo = await this.connection.getAccountInfo(userAwayAccount);

    if (!homeAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          walletPubkey,
          userHomeAccount,
          walletPubkey,
          homeMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    if (!awayAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          walletPubkey,
          userAwayAccount,
          walletPubkey,
          awayMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add fund instruction
    const fundUserIx = {
      programId: this.programId,
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: homeMint, isSigner: false, isWritable: true },
        { pubkey: awayMint, isSigner: false, isWritable: true },
        { pubkey: userHomeAccount, isSigner: false, isWritable: true },
        { pubkey: userAwayAccount, isSigner: false, isWritable: true },
        { pubkey: walletPubkey, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([36, 127, 154, 74, 24, 176, 49, 159]), // discriminator
        this.encodeU64(homeAmount * 1_000_000),
        this.encodeU64(awayAmount * 1_000_000),
      ]),
    };

    tx.add(fundUserIx);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletPubkey;

    // Sign and send
    const signedTx = await signTransaction(tx);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize());
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  async swap(
    marketPda: string,
    direction: 'home_for_away' | 'away_for_home',
    amount: number,
    walletPubkey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ) {
    const market = new PublicKey(marketPda);
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), market.toBuffer()],
      this.programId
    );

    const marketInfo = this.marketData[marketPda];
    if (!marketInfo) {
      throw new Error('Market not found');
    }

    const homeMint = new PublicKey(marketInfo.homeMint);
    const awayMint = new PublicKey(marketInfo.awayMint);

    // Get vaults and user accounts
    const homeVault = await getAssociatedTokenAddress(homeMint, poolPda, true);
    const awayVault = await getAssociatedTokenAddress(awayMint, poolPda, true);
    const userHomeAccount = await getAssociatedTokenAddress(homeMint, walletPubkey);
    const userAwayAccount = await getAssociatedTokenAddress(awayMint, walletPubkey);

    const tx = new Transaction();

    // Swap instruction
    const discriminator = direction === 'home_for_away'
      ? [45, 234, 115, 23, 131, 90, 171, 63]
      : [11, 102, 94, 105, 113, 231, 32, 21];

    const swapIx = {
      programId: this.programId,
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: homeVault, isSigner: false, isWritable: true },
        { pubkey: awayVault, isSigner: false, isWritable: true },
        { pubkey: userHomeAccount, isSigner: false, isWritable: true },
        { pubkey: userAwayAccount, isSigner: false, isWritable: true },
        { pubkey: walletPubkey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from(discriminator),
        this.encodeU64(amount * 1_000_000),
        this.encodeU64(Math.floor(amount * 0.99 * 1_000_000)), // 1% slippage
      ]),
    };

    tx.add(swapIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletPubkey;

    const signedTx = await signTransaction(tx);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize());
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  private encodeU64(num: number): Buffer {
    const bn = new BN(num);
    const buf = Buffer.alloc(8);
    bn.toArrayLike(Buffer, 'le', 8).copy(buf);
    return buf;
  }
}
