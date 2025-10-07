import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sportsxchange } from "../target/types/sportsxchange";
import { assert } from "chai";

describe("sportsxchange", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sportsxchange as Program<Sportsxchange>;
  const authority = provider.wallet;

  // We are going to create a new market account. Let's generate a keypair for it.
  const marketAccount = anchor.web3.Keypair.generate();

  it("Creates a market", async () => {
    // These are the details for our first test market.
    const gameId = "2024-WEEK1-KC-BAL";
    const homeTeam = "KC";
    const awayTeam = "BAL";

    // Now, we call our `createMarket` instruction from the Rust program.
    const tx = await program.methods
      .createMarket(gameId, homeTeam, awayTeam)
      .accounts({
        market: marketAccount.publicKey,
        authority: authority.publicKey,
      })
      .signers([marketAccount]) // We need to sign with the new account's keypair.
      .rpc();

    console.log("Your transaction signature", tx);

    // After the transaction, let's fetch the data from the blockchain
    // to make sure it was written correctly.
    const createdMarket = await program.account.market.fetch(
      marketAccount.publicKey
    );

    // And finally, we assert that the data on-chain matches what we sent.
    assert.strictEqual(
      createdMarket.authority.toBase58(),
      authority.publicKey.toBase58()
    );
    assert.strictEqual(createdMarket.gameId, gameId);
    assert.strictEqual(createdMarket.homeTeam, homeTeam);
    assert.strictEqual(createdMarket.awayTeam, awayTeam);

    console.log("Successfully created market for:", createdMarket.gameId);
  });
});