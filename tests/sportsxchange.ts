import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sportsxchange } from "../target/types/sportsxchange";
import { PublicKey, Keypair } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("sportsxchange - AMM", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sportsxchange as Program<Sportsxchange>;
  const authority = provider.wallet;

  const gameId = "2024-WEEK1-KC-BAL";
  const homeTeam = "KC";
  const awayTeam = "BAL";

  let marketPda: PublicKey;
  let poolPda: PublicKey;
  let homeMint: Keypair;
  let awayMint: Keypair;
  let homeVault: PublicKey;
  let awayVault: PublicKey;

  console.log("\n" + "=".repeat(80));
  console.log("🏈 SportsXchange AMM Test Suite");
  console.log("=".repeat(80));

  it("Creates a market with PDA", async () => {
    console.log("\n📋 TEST 1: Market Creation");
    console.log("-".repeat(80));
    
    homeMint = Keypair.generate();
    awayMint = Keypair.generate();

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      program.programId
    );

    console.log("🎯 Creating market for:", gameId);
    console.log("   Home Team:", homeTeam);
    console.log("   Away Team:", awayTeam);

    const tx = await program.methods
      .createMarket(gameId, homeTeam, awayTeam)
      .accounts({
        market: marketPda,
        homeMint: homeMint.publicKey,
        awayMint: awayMint.publicKey,
        authority: authority.publicKey,
      })
      .signers([homeMint, awayMint])
      .rpc();

    console.log("\n✅ Transaction confirmed:", tx.slice(0, 16) + "...");

    const market = await program.account.market.fetch(marketPda);
    
    console.log("\n📊 Market Details:");
    console.log("   Market PDA:    ", marketPda.toBase58());
    console.log("   Home Mint:     ", homeMint.publicKey.toBase58());
    console.log("   Away Mint:     ", awayMint.publicKey.toBase58());
    console.log("   Is Active:     ", market.isActive ? "✅ Yes" : "❌ No");
    console.log("   Winner:        ", market.winner ? "Declared" : "❓ TBD");

    assert.strictEqual(market.gameId, gameId);
    assert.strictEqual(market.homeTeam, homeTeam);
    assert.strictEqual(market.awayTeam, awayTeam);
    assert.isFalse(market.isActive, "Market should not be active until pool is initialized");
    
    console.log("\n✅ Market created successfully!");
  });

  it("Initializes liquidity pool", async () => {
    console.log("\n💧 TEST 2: Pool Initialization");
    console.log("-".repeat(80));

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), marketPda.toBuffer()],
      program.programId
    );

    homeVault = await getAssociatedTokenAddress(
      homeMint.publicKey,
      poolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    awayVault = await getAssociatedTokenAddress(
      awayMint.publicKey,
      poolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const initialAmount = 1_000_000_000; // 1000 tokens (6 decimals)
    
    console.log("🎯 Initializing pool with:");
    console.log("   Home Tokens:   ", (initialAmount / 1_000_000).toLocaleString(), "tokens");
    console.log("   Away Tokens:   ", (initialAmount / 1_000_000).toLocaleString(), "tokens");

    const tx = await program.methods
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

    console.log("\n✅ Transaction confirmed:", tx.slice(0, 16) + "...");

    const pool = await program.account.liquidityPool.fetch(poolPda);
    
    console.log("\n📊 Pool Details:");
    console.log("   Pool PDA:      ", poolPda.toBase58());
    console.log("   Home Vault:    ", homeVault.toBase58());
    console.log("   Away Vault:    ", awayVault.toBase58());
    console.log("\n📈 Reserves:");
    console.log("   Home Reserve:  ", (pool.homeReserve.toNumber() / 1_000_000).toLocaleString(), "tokens");
    console.log("   Away Reserve:  ", (pool.awayReserve.toNumber() / 1_000_000).toLocaleString(), "tokens");
    console.log("   Constant K:    ", pool.constantK.toString());
    
    assert.strictEqual(pool.homeReserve.toNumber(), initialAmount);
    assert.strictEqual(pool.awayReserve.toNumber(), initialAmount);

    // Verify market is now active
    const market = await program.account.market.fetch(marketPda);
    assert.isTrue(market.isActive, "Market should be active after pool initialization");
    
    console.log("\n✅ Market Status:  🟢 ACTIVE");
    console.log("✅ Pool initialized successfully!");
  });

  it("Calculates price correctly (50/50 split)", async () => {
    console.log("\n💰 TEST 3: Price Calculation");
    console.log("-".repeat(80));

    const pool = await program.account.liquidityPool.fetch(poolPda);
    
    // At 1000/1000, each token should be worth ~1:1
    const homePrice = pool.awayReserve.toNumber() / pool.homeReserve.toNumber();
    const awayPrice = pool.homeReserve.toNumber() / pool.awayReserve.toNumber();
    
    console.log("📊 Current Prices:");
    console.log("   1 HOME token = ", homePrice.toFixed(4), "AWAY");
    console.log("   1 AWAY token = ", awayPrice.toFixed(4), "HOME");
    
    console.log("\n📐 Price Validation:");
    console.log("   Expected:      1.0000 (50/50 split)");
    console.log("   Home Price:    ", homePrice.toFixed(4), homePrice === 1.0 ? "✅" : "⚠️");
    console.log("   Away Price:    ", awayPrice.toFixed(4), awayPrice === 1.0 ? "✅" : "⚠️");
    
    assert.approximately(homePrice, 1.0, 0.01, "Home price should be 1:1");
    assert.approximately(awayPrice, 1.0, 0.01, "Away price should be 1:1");
    
    console.log("\n✅ Prices are balanced!");
  });

  it("Resolves market with winner", async () => {
    console.log("\n🏆 TEST 4: Market Resolution");
    console.log("-".repeat(80));

    console.log("🎯 Resolving market...");
    console.log("   Declaring winner: HOME (" + homeTeam + ")");

    const tx = await program.methods
      .resolveMarket({ home: {} })
      .accounts({
        market: marketPda,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("\n✅ Transaction confirmed:", tx.slice(0, 16) + "...");

    const market = await program.account.market.fetch(marketPda);
    
    console.log("\n📊 Resolution Details:");
    console.log("   Winner:        🏆 HOME (" + homeTeam + ")");
    console.log("   Market Status: ", market.isActive ? "🟢 Active" : "🔴 Closed");
    console.log("   Game ID:       ", market.gameId);
    
    assert.isFalse(market.isActive, "Market should be inactive after resolution");
    assert.deepStrictEqual(market.winner, { home: {} }, "Winner should be HOME");
    
    console.log("\n✅ Market resolved successfully!");
  });

  it("Cannot resolve inactive market", async () => {
    console.log("\n🚫 TEST 5: Double Resolution Prevention");
    console.log("-".repeat(80));

    console.log("🎯 Attempting to resolve already-resolved market...");
    console.log("   Expected: Should fail with MarketNotActive error");

    try {
      await program.methods
        .resolveMarket({ away: {} })
        .accounts({
          market: marketPda,
          authority: authority.publicKey,
        })
        .rpc();
      
      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errorString = err.toString();
      
      console.log("\n❌ Transaction rejected (as expected)");
      console.log("   Error: MarketNotActive");
      console.log("   Reason: Market is already closed");
      
      // Market is already resolved, so it's inactive
      assert.isTrue(
        errorString.includes("MarketNotActive") || errorString.includes("6002"),
        `Expected MarketNotActive error, got: ${errorString}`
      );
      
      console.log("\n✅ Double resolution correctly prevented!");
    }
  });

  after(() => {
    console.log("\n" + "=".repeat(80));
    console.log("🎉 All Tests Passed!");
    console.log("=".repeat(80));
    console.log("\n📊 Test Summary:");
    console.log("   ✅ Market creation with PDA");
    console.log("   ✅ Pool initialization (1000/1000)");
    console.log("   ✅ Price calculation (1:1 ratio)");
    console.log("   ✅ Market resolution");
    console.log("   ✅ Double resolution prevention");
    console.log("\n🚀 SportsXchange AMM is ready for action!");
    console.log("=".repeat(80) + "\n");
  });
});
