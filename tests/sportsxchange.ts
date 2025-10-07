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

  it("Creates a market with PDA", async () => {
    homeMint = Keypair.generate();
    awayMint = Keypair.generate();

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      program.programId
    );

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

    console.log("✓ Market created:", tx);

    const market = await program.account.market.fetch(marketPda);
    assert.strictEqual(market.gameId, gameId);
    assert.strictEqual(market.homeTeam, homeTeam);
    assert.strictEqual(market.awayTeam, awayTeam);
    assert.isFalse(market.isActive);
    console.log("  Market PDA:", marketPda.toBase58());
    console.log("  Home Mint:", homeMint.publicKey.toBase58());
    console.log("  Away Mint:", awayMint.publicKey.toBase58());
  });

  it("Initializes liquidity pool", async () => {
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

    console.log("✓ Pool initialized:", tx);

    const pool = await program.account.liquidityPool.fetch(poolPda);
    assert.strictEqual(pool.homeReserve.toNumber(), initialAmount);
    assert.strictEqual(pool.awayReserve.toNumber(), initialAmount);
    
    console.log("  Pool PDA:", poolPda.toBase58());
    console.log("  Home Reserve:", pool.homeReserve.toNumber());
    console.log("  Away Reserve:", pool.awayReserve.toNumber());
    console.log("  Constant K:", pool.constantK.toString());

    // Verify market is now active
    const market = await program.account.market.fetch(marketPda);
    assert.isTrue(market.isActive);
    console.log("  Market Status: ACTIVE ✓");
  });

  it("Calculates price correctly (50/50 split)", async () => {
    const pool = await program.account.liquidityPool.fetch(poolPda);
    
    // At 1000/1000, each token should be worth ~1:1
    const homePrice = pool.awayReserve.toNumber() / pool.homeReserve.toNumber();
    const awayPrice = pool.homeReserve.toNumber() / pool.awayReserve.toNumber();
    
    console.log("  Home Price:", homePrice.toFixed(4), "AWAY per HOME");
    console.log("  Away Price:", awayPrice.toFixed(4), "HOME per AWAY");
    
    assert.approximately(homePrice, 1.0, 0.01);
    assert.approximately(awayPrice, 1.0, 0.01);
  });

  it("Resolves market with winner", async () => {
    const tx = await program.methods
      .resolveMarket({ home: {} })
      .accounts({
        market: marketPda,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("✓ Market resolved:", tx);

    const market = await program.account.market.fetch(marketPda);
    assert.isFalse(market.isActive);
    assert.deepStrictEqual(market.winner, { home: {} });
    console.log("  Winner: HOME (KC) ✓");
  });

  it("Cannot resolve inactive market", async () => {
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
      
      // Market is already resolved, so it's inactive
      // The error should be MarketNotActive
      assert.isTrue(
        errorString.includes("MarketNotActive") || errorString.includes("6002"),
        `Expected MarketNotActive error, got: ${errorString}`
      );
      console.log("✓ Correctly prevented resolution of inactive market");
    }
  });
});
