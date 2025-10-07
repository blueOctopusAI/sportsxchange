import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sportsxchange } from "../target/types/sportsxchange";
import { assert } from "chai";

describe("sportsxchange", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sportsxchange as Program<Sportsxchange>;
  const authority = provider.wallet;

  it("Creates a market", async () => {
    // Generate keypairs for the market and mints
    const marketAccount = anchor.web3.Keypair.generate();
    const homeMint = anchor.web3.Keypair.generate();
    const awayMint = anchor.web3.Keypair.generate();

    const gameId = "2024-WEEK1-KC-BAL";
    const homeTeam = "KC";
    const awayTeam = "BAL";

    const tx = await program.methods
      .createMarket(gameId, homeTeam, awayTeam)
      .accounts({
        market: marketAccount.publicKey,
        homeMint: homeMint.publicKey,
        awayMint: awayMint.publicKey,
        authority: authority.publicKey,
      })
      .signers([marketAccount, homeMint, awayMint])
      .rpc();

    console.log("Transaction signature:", tx);

    const createdMarket = await program.account.market.fetch(
      marketAccount.publicKey
    );

    assert.strictEqual(
      createdMarket.authority.toBase58(),
      authority.publicKey.toBase58()
    );
    assert.strictEqual(createdMarket.gameId, gameId);
    assert.strictEqual(createdMarket.homeTeam, homeTeam);
    assert.strictEqual(createdMarket.awayTeam, awayTeam);
    assert.strictEqual(
      createdMarket.homeMint.toBase58(),
      homeMint.publicKey.toBase58()
    );
    assert.strictEqual(
      createdMarket.awayMint.toBase58(),
      awayMint.publicKey.toBase58()
    );

    console.log("✓ Successfully created market for:", createdMarket.gameId);
    console.log("  Home Mint:", createdMarket.homeMint.toBase58());
    console.log("  Away Mint:", createdMarket.awayMint.toBase58());
  });
});
