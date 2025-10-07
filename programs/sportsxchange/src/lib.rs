use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

declare_id!("7hy1AuAi6X6cgQHot3GJyuzAhpaSaqC75rNPudpj39HN");

#[program]
pub mod sportsxchange {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>,
        game_id: String,
        home_team: String,
        away_team: String,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.game_id = game_id;
        market.home_team = home_team;
        market.away_team = away_team;
        market.home_mint = ctx.accounts.home_mint.key();
        market.away_mint = ctx.accounts.away_mint.key();
        Ok(())
    }
}

#[account]
pub struct Market {
    pub authority: Pubkey,
    pub game_id: String,
    pub home_team: String,
    pub away_team: String,
    pub home_mint: Pubkey,
    pub away_mint: Pubkey,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4 + 50) + (4 + 20) + (4 + 20) + 32 + 32
    )]
    pub market: Account<'info, Market>,

    /// CHECK: This is a keypair passed in for the home mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = authority,
        mint::token_program = token_program
    )]
    pub home_mint: Account<'info, Mint>,

    /// CHECK: This is a keypair passed in for the away mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = authority,
        mint::token_program = token_program
    )]
    pub away_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
