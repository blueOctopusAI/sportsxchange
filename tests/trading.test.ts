import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sportsxchange } from "../target/types/sportsxchange";
import { PublicKey, Keypair } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("sportsxchange - Trading", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sportsxchange as Program<Sportsxchange>;
  const authority = provider.wallet;

  const gameId = "2024-WEEK2-SF-DAL"; // Different game to avoid PDA collision
  const homeTeam = "SF";
  const awayTeam = "DAL";

  let marketPda: PublicKey;
  let poolPda: PublicKey;
  let homeMint: Keypair;
  let awayMint: Keypair;
  let homeVault: PublicKey;
  let awayVault: PublicKey;

  // Test users
  let userA: Keypair;
  let userB: Keypair;
  let userAHomeAccount: PublicKey;
  let userAAwayAccount: PublicKey;
  let userBHomeAccount: PublicKey;
  let userBAwayAccount: PublicKey;

  console.log("\n" + "=".repeat(80));
  console.log("💱 SportsXchange Trading Tests");
  console.log("=".repeat(80));

  before(async () => {
    console.log("\n🔧 Setup: Creating market and pool...");
    
    // Create market
    homeMint = Keypair.generate();
    awayMint = Keypair.generate();

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      program.programId
    );

    await program.methods
      .createMarket(gameId, homeTeam, awayTeam)
      .accounts({
        market: marketPda,
        homeMint: homeMint.publicKey,
        awayMint: awayMint.publicKey,
        authority: authority.publicKey,
      })
      .signers([homeMint, awayMint])
      .rpc();

    // Initialize pool
    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), marketPda.toBuffer()],
      program.programId
    );

    homeVault = await getAssociatedTokenAddress(
      homeMint.publicKey,
      poolPda,
      true
    );

    awayVault = await getAssociatedTokenAddress(
      awayMint.publicKey,
      poolPda,
      true
    );

    const initialAmount = 1_000_000_000; // 1000 tokens

    await program.methods
      .initializePool(
        new anchor.BN(initialAmount),
        new anchor.BN(initialAmount)
      )
      .accounts({
        market: marketPda,
        pool: poolPda,
        homeMint: homeMint.publicKey,
        awayMint: awayMint.publicKey,
        homeVault,
        awayVault,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("✅ Market and pool ready (SF vs DAL)");
  });

  it("Sets up users with token accounts", async () => {
    console.log("\n👥 TEST 1: User Account Setup");
    console.log("-".repeat(80));

    // Generate test users
    userA = Keypair.generate();
    userB = Keypair.generate();

    console.log("🎯 Creating test users:");
    console.log("   User A:", userA.publicKey.toBase58());
    console.log("   User B:", userB.publicKey.toBase58());

    // Airdrop SOL to users
    const airdropAmount = 2 * anchor.web3.LAMPORTS_PER_SOL;
    
    console.log("\n💰 Airdropping SOL for transaction fees...");
    const airdropA = await provider.connection.requestAirdrop(
      userA.publicKey,
      airdropAmount
    );
    const airdropB = await provider.connection.requestAirdrop(
      userB.publicKey,
      airdropAmount
    );

    await provider.connection.confirmTransaction(airdropA);
    await provider.connection.confirmTransaction(airdropB);
    console.log("✅ Users funded with SOL");

    // Get ATAs for users
    userAHomeAccount = await getAssociatedTokenAddress(
      homeMint.publicKey,
      userA.publicKey
    );

    userAAwayAccount = await getAssociatedTokenAddress(
      awayMint.publicKey,
      userA.publicKey
    );

    userBHomeAccount = await getAssociatedTokenAddress(
      homeMint.publicKey,
      userB.publicKey
    );

    userBAwayAccount = await getAssociatedTokenAddress(
      awayMint.publicKey,
      userB.publicKey
    );

    // Create token accounts
    console.log("\n🏦 Creating token accounts...");
    await createAssociatedTokenAccount(
      provider.connection,
      userA,
      homeMint.publicKey,
      userA.publicKey
    );

    await createAssociatedTokenAccount(
      provider.connection,
      userA,
      awayMint.publicKey,
      userA.publicKey
    );

    await createAssociatedTokenAccount(
      provider.connection,
      userB,
      homeMint.publicKey,
      userB.publicKey
    );

    await createAssociatedTokenAccount(
      provider.connection,
      userB,
      awayMint.publicKey,
      userB.publicKey
    );

    console.log("✅ Token accounts created");

    // Fund users with initial tokens using program instruction
    const userStartingBalance = 100_000_000; // 100 tokens each
    
    console.log("\n💸 Distributing initial tokens...");
    console.log("   Amount per user: 100 tokens");

    // Fund User A
    await program.methods
      .fundUser(
        new anchor.BN(userStartingBalance),
        new anchor.BN(userStartingBalance)
      )
      .accounts({
        market: marketPda,
        homeMint: homeMint.publicKey,
        awayMint: awayMint.publicKey,
        userHomeAccount: userAHomeAccount,
        userAwayAccount: userAAwayAccount,
        user: userA.publicKey,
      })
      .rpc();

    // Fund User B
    await program.methods
      .fundUser(
        new anchor.BN(userStartingBalance),
        new anchor.BN(userStartingBalance)
      )
      .accounts({
        market: marketPda,
        homeMint: homeMint.publicKey,
        awayMint: awayMint.publicKey,
        userHomeAccount: userBHomeAccount,
        userAwayAccount: userBAwayAccount,
        user: userB.publicKey,
      })
      .rpc();

    console.log("✅ Tokens distributed");

    // Verify balances
    const userAHome = await getAccount(provider.connection, userAHomeAccount);
    const userAAway = await getAccount(provider.connection, userAAwayAccount);

    console.log("\n📊 User A Starting Balances:");
    console.log("   HOME:", Number(userAHome.amount) / 1_000_000, "tokens");
    console.log("   AWAY:", Number(userAAway.amount) / 1_000_000, "tokens");

    assert.strictEqual(
      Number(userAHome.amount),
      userStartingBalance,
      "User A should have 100 HOME tokens"
    );
    assert.strictEqual(
      Number(userAAway.amount),
      userStartingBalance,
      "User A should have 100 AWAY tokens"
    );

    console.log("\n✅ User setup complete!");
  });

  it("User A swaps HOME for AWAY (buys AWAY)", async () => {
    console.log("\n💱 TEST 2: Swap HOME → AWAY");
    console.log("-".repeat(80));

    const pool = await program.account.liquidityPool.fetch(poolPda);
    
    console.log("📊 Pool State (Before Swap):");
    console.log("   HOME Reserve:", pool.homeReserve.toNumber() / 1_000_000, "tokens");
    console.log("   AWAY Reserve:", pool.awayReserve.toNumber() / 1_000_000, "tokens");
    console.log("   Price: 1 HOME =", (pool.awayReserve.toNumber() / pool.homeReserve.toNumber()).toFixed(4), "AWAY");

    const amountIn = 10_000_000; // 10 HOME tokens
    const expectedOut = Math.floor(
      (pool.awayReserve.toNumber() * amountIn) / 
      (pool.homeReserve.toNumber() + amountIn)
    );

    console.log("\n🎯 User A Trading:");
    console.log("   Selling:", amountIn / 1_000_000, "HOME");
    console.log("   Expecting: ~", (expectedOut / 1_000_000).toFixed(2), "AWAY");
    console.log("   Slippage:", "1% max");

    const minimumOut = Math.floor(expectedOut * 0.99); // 1% slippage tolerance

    const tx = await program.methods
      .swapHomeForAway(
        new anchor.BN(amountIn),
        new anchor.BN(minimumOut)
      )
      .accounts({
        market: marketPda,
        pool: poolPda,
        homeVault,
        awayVault,
        userHomeAccount: userAHomeAccount,
        userAwayAccount: userAAwayAccount,
        user: userA.publicKey,
      })
      .signers([userA])
      .rpc();

    console.log("\n✅ Transaction confirmed:", tx.slice(0, 16) + "...");

    // Check updated balances
    const userAHome = await getAccount(provider.connection, userAHomeAccount);
    const userAAway = await getAccount(provider.connection, userAAwayAccount);
    const poolAfter = await program.account.liquidityPool.fetch(poolPda);

    const actualOut = Number(userAAway.amount) - 100_000_000; // Subtract starting balance

    console.log("\n📊 Results:");
    console.log("   User A HOME:", Number(userAHome.amount) / 1_000_000, "tokens");
    console.log("   User A AWAY:", Number(userAAway.amount) / 1_000_000, "tokens");
    console.log("   Received:", (actualOut / 1_000_000).toFixed(4), "AWAY");
    console.log("   Expected:", (expectedOut / 1_000_000).toFixed(4), "AWAY");
    console.log("   Difference:", ((actualOut - expectedOut) / 1_000_000).toFixed(4), "AWAY");

    console.log("\n📊 Pool State (After Swap):");
    console.log("   HOME Reserve:", poolAfter.homeReserve.toNumber() / 1_000_000, "tokens");
    console.log("   AWAY Reserve:", poolAfter.awayReserve.toNumber() / 1_000_000, "tokens");
    console.log("   Price: 1 HOME =", (poolAfter.awayReserve.toNumber() / poolAfter.homeReserve.toNumber()).toFixed(4), "AWAY");

    const priceImpact = (
      (poolAfter.awayReserve.toNumber() / poolAfter.homeReserve.toNumber()) /
      (pool.awayReserve.toNumber() / pool.homeReserve.toNumber()) - 1
    ) * 100;

    console.log("   Price Impact:", priceImpact.toFixed(2) + "%");

    // Verify reserves updated correctly
    assert.strictEqual(
      poolAfter.homeReserve.toNumber(),
      pool.homeReserve.toNumber() + amountIn,
      "HOME reserve should increase"
    );

    assert.strictEqual(
      poolAfter.awayReserve.toNumber(),
      pool.awayReserve.toNumber() - actualOut,
      "AWAY reserve should decrease"
    );

    // Verify constant K maintained (within rounding)
    const kBefore = pool.homeReserve.toNumber() * pool.awayReserve.toNumber();
    const kAfter = poolAfter.homeReserve.toNumber() * poolAfter.awayReserve.toNumber();
    const kDiff = Math.abs(kAfter - kBefore);
    
    console.log("\n🔢 AMM Invariant Check:");
    console.log("   K Before:", kBefore);
    console.log("   K After: ", kAfter);
    console.log("   Diff:    ", kDiff, kDiff === 0 ? "✅ Exact" : "⚠️ Rounding");

    // K diff of 100M out of 1 quintillion (10^18) is 0.00001% - acceptable for integer math
    assert.isTrue(kDiff < 1_000_000_000, "K should remain approximately constant");

    console.log("\n✅ Swap executed successfully!");
  });

  it("User B swaps AWAY for HOME (buys HOME)", async () => {
    console.log("\n💱 TEST 3: Swap AWAY → HOME");
    console.log("-".repeat(80));

    const pool = await program.account.liquidityPool.fetch(poolPda);
    
    console.log("📊 Pool State (Before Swap):");
    console.log("   HOME Reserve:", pool.homeReserve.toNumber() / 1_000_000, "tokens");
    console.log("   AWAY Reserve:", pool.awayReserve.toNumber() / 1_000_000, "tokens");
    console.log("   Price: 1 AWAY =", (pool.homeReserve.toNumber() / pool.awayReserve.toNumber()).toFixed(4), "HOME");

    const amountIn = 10_000_000; // 10 AWAY tokens
    const expectedOut = Math.floor(
      (pool.homeReserve.toNumber() * amountIn) / 
      (pool.awayReserve.toNumber() + amountIn)
    );

    console.log("\n🎯 User B Trading:");
    console.log("   Selling:", amountIn / 1_000_000, "AWAY");
    console.log("   Expecting: ~", (expectedOut / 1_000_000).toFixed(2), "HOME");
    console.log("   Slippage:", "1% max");

    const minimumOut = Math.floor(expectedOut * 0.99);

    const tx = await program.methods
      .swapAwayForHome(
        new anchor.BN(amountIn),
        new anchor.BN(minimumOut)
      )
      .accounts({
        market: marketPda,
        pool: poolPda,
        homeVault,
        awayVault,
        userHomeAccount: userBHomeAccount,
        userAwayAccount: userBAwayAccount,
        user: userB.publicKey,
      })
      .signers([userB])
      .rpc();

    console.log("\n✅ Transaction confirmed:", tx.slice(0, 16) + "...");

    // Check updated balances
    const userBHome = await getAccount(provider.connection, userBHomeAccount);
    const userBAway = await getAccount(provider.connection, userBAwayAccount);
    const poolAfter = await program.account.liquidityPool.fetch(poolPda);

    const actualOut = Number(userBHome.amount) - 100_000_000;

    console.log("\n📊 Results:");
    console.log("   User B HOME:", Number(userBHome.amount) / 1_000_000, "tokens");
    console.log("   User B AWAY:", Number(userBAway.amount) / 1_000_000, "tokens");
    console.log("   Received:", (actualOut / 1_000_000).toFixed(4), "HOME");
    console.log("   Expected:", (expectedOut / 1_000_000).toFixed(4), "HOME");

    console.log("\n📊 Pool State (After Swap):");
    console.log("   HOME Reserve:", poolAfter.homeReserve.toNumber() / 1_000_000, "tokens");
    console.log("   AWAY Reserve:", poolAfter.awayReserve.toNumber() / 1_000_000, "tokens");
    console.log("   Price: 1 AWAY =", (poolAfter.homeReserve.toNumber() / poolAfter.awayReserve.toNumber()).toFixed(4), "HOME");

    const priceImpact = (
      (poolAfter.homeReserve.toNumber() / poolAfter.awayReserve.toNumber()) /
      (pool.homeReserve.toNumber() / pool.awayReserve.toNumber()) - 1
    ) * 100;

    console.log("   Price Impact:", priceImpact.toFixed(2) + "%");

    assert.strictEqual(
      poolAfter.awayReserve.toNumber(),
      pool.awayReserve.toNumber() + amountIn,
      "AWAY reserve should increase"
    );

    console.log("\n✅ Swap executed successfully!");
  });

  it("Multiple consecutive swaps show increasing slippage", async () => {
    console.log("\n📈 TEST 4: Consecutive Swaps & Slippage");
    console.log("-".repeat(80));

    const poolBefore = await program.account.liquidityPool.fetch(poolPda);
    console.log("📊 Starting Pool State:");
    console.log("   HOME Reserve:", poolBefore.homeReserve.toNumber() / 1_000_000);
    console.log("   AWAY Reserve:", poolBefore.awayReserve.toNumber() / 1_000_000);

    const swapAmount = 5_000_000; // 5 tokens
    const swaps = [];

    console.log("\n🎯 Executing 3 consecutive HOME → AWAY swaps (5 tokens each):");

    for (let i = 0; i < 3; i++) {
      const pool = await program.account.liquidityPool.fetch(poolPda);
      const expectedOut = Math.floor(
        (pool.awayReserve.toNumber() * swapAmount) / 
        (pool.homeReserve.toNumber() + swapAmount)
      );

      await program.methods
        .swapHomeForAway(
          new anchor.BN(swapAmount),
          new anchor.BN(Math.floor(expectedOut * 0.95)) // 5% slippage tolerance
        )
        .accounts({
          market: marketPda,
          pool: poolPda,
          homeVault,
          awayVault,
          userHomeAccount: userAHomeAccount,
          userAwayAccount: userAAwayAccount,
          user: userA.publicKey,
        })
        .signers([userA])
        .rpc();

      const poolAfter = await program.account.liquidityPool.fetch(poolPda);
      const price = poolAfter.awayReserve.toNumber() / poolAfter.homeReserve.toNumber();

      swaps.push({
        number: i + 1,
        expectedOut: expectedOut / 1_000_000,
        price: price,
      });

      console.log(`   Swap ${i + 1}: Expected ${(expectedOut / 1_000_000).toFixed(4)} AWAY, Price = ${price.toFixed(4)}`);
    }

    console.log("\n📊 Slippage Analysis:");
    console.log("   First swap price: ", swaps[0].price.toFixed(4));
    console.log("   Second swap price:", swaps[1].price.toFixed(4));
    console.log("   Third swap price: ", swaps[2].price.toFixed(4));
    console.log("   Total movement:   ", ((swaps[2].price / swaps[0].price - 1) * 100).toFixed(2) + "%");

    // Verify each swap got progressively worse price
    assert.isTrue(swaps[1].price < swaps[0].price, "Second swap should have worse price");
    assert.isTrue(swaps[2].price < swaps[1].price, "Third swap should have worse price");

    const poolAfter = await program.account.liquidityPool.fetch(poolPda);
    console.log("\n📊 Final Pool State:");
    console.log("   HOME Reserve:", poolAfter.homeReserve.toNumber() / 1_000_000);
    console.log("   AWAY Reserve:", poolAfter.awayReserve.toNumber() / 1_000_000);

    console.log("\n✅ Slippage behavior validated!");
  });

  after(() => {
    console.log("\n" + "=".repeat(80));
    console.log("🎉 Trading Tests Complete!");
    console.log("=".repeat(80));
    console.log("\n📊 Test Summary:");
    console.log("   ✅ User account setup");
    console.log("   ✅ HOME → AWAY swaps");
    console.log("   ✅ AWAY → HOME swaps");
    console.log("   ✅ Consecutive swap slippage");
    console.log("\n💱 AMM is fully operational!");
    console.log("=".repeat(80) + "\n");
  });
});
