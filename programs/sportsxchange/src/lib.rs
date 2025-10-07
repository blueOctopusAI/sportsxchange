use anchor_lang::prelude::*;

declare_id!("7hy1AuAi6X6cgQHot3GJyuzAhpaSaqC75rNPudpj39HN");

#[program]
pub mod sportsxchange {
    use super::*;

    // This is our first instruction. It creates a new Market account.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        game_id: String,
        home_team: String,
        away_team: String,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = *ctx.accounts.authority.key;
        market.game_id = game_id;
        market.home_team = home_team;
        market.away_team = away_team;
        Ok(())
    }
}

// This defines the data structure for our Market account.
// This is what gets stored on the blockchain.
#[account]
pub struct Market {
    pub authority: Pubkey,
    pub game_id: String,
    pub home_team: String,
    pub away_team: String,
}

// This defines all the accounts our `create_market` instruction needs.
#[derive(Accounts)]
pub struct CreateMarket<'info> {
    // This is the new Market account we are creating.
    // `init` means it will be created and initialized.
    // `payer = authority` means the `authority` will pay for its creation.
    // `space = ...` reserves enough space on the blockchain for our Market data.
    #[account(init, payer = authority, space = 8 + 32 + 32 + 16 + 16)]
    pub market: Account<'info, Market>,

    // The authority is the user creating the market.
    // `mut` means their account balance will be mutated (debited for rent).
    #[account(mut)]
    pub authority: Signer<'info>,
    
    // The System Program is required by Solana to create new accounts.
    pub system_program: Program<'info, System>,
}