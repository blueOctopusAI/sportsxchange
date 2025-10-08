import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function createFreshMarketAndTest() {
  console.log('🆕 Creating Fresh Market and Testing Complete Cycle');
  console.log('='.repeat(50));

  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const walletData = JSON.parse(fs.readFileSync(process.env.WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const programId = new PublicKey(process.env.PROGRAM_ID);

  // Load USDC mint
  let usdcMint;
  try {
    const usdcData = JSON.parse(fs.readFileSync('./data/test-usdc.json', 'utf-8'));
    usdcMint = new PublicKey(usdcData.mintAddress);
  } catch {
    console.error('❌ No USDC mint found. Run usdc-faucet.js first!');
    process.exit(1);
  }

  // Step 1: Create a new market
  const gameId = `TEST-${Date.now()}`;
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(gameId)],
    programId
  );

  const [teamAMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('team_a_mint'), Buffer.from(gameId)],
    programId
  );

  const [teamBMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('team_b_mint'), Buffer.from(gameId)],
    programId
  );

  const [usdcVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), Buffer.from(gameId)],
    programId
  );

  console.log('Creating fresh market:', gameId);

  const createTx = new Transaction();
  const idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf-8'));
  const createInstruction = idl.instructions.find(ix => ix.name === 'create_market_v2');
  const createDiscriminator = Buffer.from(createInstruction.discriminator);

  const createIx = {
    programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: teamAMint, isSigner: false, isWritable: true },
      { pubkey: teamBMint, isSigner: false, isWritable: true },
      { pubkey: usdcVault, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      createDiscriminator,
      encodeString(gameId),
      encodeString('TEAM_A'),
      encodeString('TEAM_B'),
      encodeU64(100000), // base_price: 0.1 USDC
      encodeU64(1000), // slope
    ])
  };

  createTx.add(createIx);

  try {
    const createSig = await sendAndConfirmTransaction(
      connection,
      createTx,
      [wallet],
      { commitment: 'confirmed' }
    );
    console.log('✅ Market created! Tx:', createSig.substring(0, 20) + '...');

    // Save market info
    const marketInfo = {
      gameId,
      marketPda: marketPda.toString(),
      teamAMint: teamAMint.toString(),
      teamBMint: teamBMint.toString(),
      usdcMint: usdcMint.toString(),
      usdcVault: usdcVault.toString(),
      teamA: 'TEAM_A',
      teamB: 'TEAM_B',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync('./data/fresh-test-market.json', JSON.stringify(marketInfo, null, 2));

    // Step 2: Buy tokens
    console.log('\n💰 Buying tokens...');
    
    const buyerTeamAAccount = getAssociatedTokenAddressSync(teamAMint, wallet.publicKey);
    const buyerTeamBAccount = getAssociatedTokenAddressSync(teamBMint, wallet.publicKey);
    const buyerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, wallet.publicKey);

    const buyAmount = 10_000_000; // 10 USDC
    const buyTx = new Transaction();

    // Create ATAs
    try {
      await getAccount(connection, buyerTeamAAccount);
    } catch {
      buyTx.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          buyerTeamAAccount,
          wallet.publicKey,
          teamAMint
        )
      );
    }

    try {
      await getAccount(connection, buyerTeamBAccount);
    } catch {
      buyTx.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          buyerTeamBAccount,
          wallet.publicKey,
          teamBMint
        )
      );
    }

    const buyInstruction = idl.instructions.find(ix => ix.name === 'buy_on_curve');
    const buyDiscriminator = Buffer.from(buyInstruction.discriminator);

    const buyIx = {
      programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: marketPda, isSigner: false, isWritable: true },
        { pubkey: teamAMint, isSigner: false, isWritable: true },
        { pubkey: teamBMint, isSigner: false, isWritable: true },
        { pubkey: buyerTeamAAccount, isSigner: false, isWritable: true },
        { pubkey: buyerTeamBAccount, isSigner: false, isWritable: true },
        { pubkey: buyerUsdcAccount, isSigner: false, isWritable: true },
        { pubkey: usdcVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        buyDiscriminator,
        Buffer.from([0]), // team A
        encodeU64(buyAmount),
        encodeU64(0), // min_tokens_out
      ])
    };

    buyTx.add(buyIx);

    const buySig = await sendAndConfirmTransaction(
      connection,
      buyTx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('✅ Buy successful! Tx:', buySig.substring(0, 20) + '...');

    const teamAAccount = await getAccount(connection, buyerTeamAAccount);
    const teamABalance = Number(teamAAccount.amount) / 1_000_000;
    console.log('   Received tokens:', teamABalance);

    // Step 3: Sell tokens
    console.log('\n💸 Selling tokens...');
    
    const sellAmount = Math.floor(teamABalance / 2); // Sell half
    const sellTx = new Transaction();

    const sellInstruction = idl.instructions.find(ix => ix.name === 'sell_on_curve');
    const sellDiscriminator = Buffer.from(sellInstruction.discriminator);

    const sellIx = {
      programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: marketPda, isSigner: false, isWritable: true },
        { pubkey: teamAMint, isSigner: false, isWritable: true },
        { pubkey: teamBMint, isSigner: false, isWritable: true },
        { pubkey: buyerTeamAAccount, isSigner: false, isWritable: true },
        { pubkey: buyerTeamBAccount, isSigner: false, isWritable: true },
        { pubkey: buyerUsdcAccount, isSigner: false, isWritable: true },
        { pubkey: usdcVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        sellDiscriminator,
        Buffer.from([0]), // team A
        encodeU64(sellAmount * 1_000_000),
        encodeU64(0), // min_usdc_out
      ])
    };

    sellTx.add(sellIx);

    const sellSig = await sendAndConfirmTransaction(
      connection,
      sellTx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('✅ Sell successful! Tx:', sellSig.substring(0, 20) + '...');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 FRESH MARKET TEST COMPLETE!');
    console.log('='.repeat(50));
    console.log('✅ Created new market');
    console.log('✅ Bought tokens with USDC');
    console.log('✅ Sold tokens for USDC');
    console.log('✅ Full trading cycle works!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.logs) {
      console.error('\nTransaction logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
  }
}

function encodeU64(num) {
  const bn = new BN(num);
  const buf = Buffer.alloc(8);
  bn.toArrayLike(Buffer, 'le', 8).copy(buf);
  return buf;
}

function encodeString(str) {
  const bytes = Buffer.from(str, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

createFreshMarketAndTest().catch(console.error);
