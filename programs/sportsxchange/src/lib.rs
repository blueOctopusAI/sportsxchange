use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};

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
        market.is_active = false;
        market.winner = None;
        market.bump = ctx.bumps.market;
        Ok(())
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        initial_home_amount: u64,
        initial_away_amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let market = &ctx.accounts.market;

        pool.market = market.key();
        pool.home_vault = ctx.accounts.home_vault.key();
        pool.away_vault = ctx.accounts.away_vault.key();
        pool.home_reserve = initial_home_amount;
        pool.away_reserve = initial_away_amount;
        pool.constant_k = initial_home_amount
            .checked_mul(initial_away_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        pool.bump = ctx.bumps.pool;

        // Mint initial liquidity to vaults
        let game_id = market.game_id.as_bytes();
        let seeds = &[
            b"market",
            game_id,
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.home_mint.to_account_info(),
                    to: ctx.accounts.home_vault.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            initial_home_amount,
        )?;

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.away_mint.to_account_info(),
                    to: ctx.accounts.away_vault.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            initial_away_amount,
        )?;

        // Mark market as active
        let market_account = &mut ctx.accounts.market;
        market_account.is_active = true;

        Ok(())
    }

    pub fn swap_home_for_away(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        let pool = &ctx.accounts.pool;

        // Calculate amount out
        let amount_out = calculate_amount_out(
            amount_in,
            pool.home_reserve,
            pool.away_reserve,
        )?;

        require!(
            amount_out >= minimum_amount_out,
            ErrorCode::SlippageExceeded
        );

        // Transfer home tokens from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_home_account.to_account_info(),
                    to: ctx.accounts.home_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // Transfer away tokens from vault to user
        let market_key = ctx.accounts.market.key();
        let pool_bump = pool.bump;
        let seeds = &[
            b"pool",
            market_key.as_ref(),
            &[pool_bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.away_vault.to_account_info(),
                    to: ctx.accounts.user_away_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount_out,
        )?;

        // Update reserves
        let pool = &mut ctx.accounts.pool;
        pool.home_reserve = pool.home_reserve
            .checked_add(amount_in)
            .ok_or(ErrorCode::MathOverflow)?;
        pool.away_reserve = pool.away_reserve
            .checked_sub(amount_out)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            token_in: ctx.accounts.market.home_mint,
            token_out: ctx.accounts.market.away_mint,
            amount_in,
            amount_out,
            home_reserve: pool.home_reserve,
            away_reserve: pool.away_reserve,
        });

        Ok(())
    }

    pub fn swap_away_for_home(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        let pool = &ctx.accounts.pool;

        let amount_out = calculate_amount_out(
            amount_in,
            pool.away_reserve,
            pool.home_reserve,
        )?;

        require!(
            amount_out >= minimum_amount_out,
            ErrorCode::SlippageExceeded
        );

        // Transfer away tokens from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_away_account.to_account_info(),
                    to: ctx.accounts.away_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // Transfer home tokens from vault to user
        let market_key = ctx.accounts.market.key();
        let pool_bump = pool.bump;
        let seeds = &[
            b"pool",
            market_key.as_ref(),
            &[pool_bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.home_vault.to_account_info(),
                    to: ctx.accounts.user_home_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount_out,
        )?;

        // Update reserves
        let pool = &mut ctx.accounts.pool;
        pool.away_reserve = pool.away_reserve
            .checked_add(amount_in)
            .ok_or(ErrorCode::MathOverflow)?;
        pool.home_reserve = pool.home_reserve
            .checked_sub(amount_out)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            token_in: ctx.accounts.market.away_mint,
            token_out: ctx.accounts.market.home_mint,
            amount_in,
            amount_out,
            home_reserve: pool.home_reserve,
            away_reserve: pool.away_reserve,
        });

        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winner: TeamSide,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(market.is_active, ErrorCode::MarketNotActive);
        require!(market.winner.is_none(), ErrorCode::MarketAlreadyResolved);

        market.winner = Some(winner);
        market.is_active = false;

        emit!(MarketResolvedEvent {
            market: market.key(),
            game_id: market.game_id.clone(),
            winner,
        });

        Ok(())
    }

    pub fn fund_user(
        ctx: Context<FundUser>,
        home_amount: u64,
        away_amount: u64,
    ) -> Result<()> {
        let market = &ctx.accounts.market;
        
        let game_id = market.game_id.as_bytes();
        let seeds = &[
            b"market",
            game_id,
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        // Mint HOME tokens to user
        if home_amount > 0 {
            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.home_mint.to_account_info(),
                        to: ctx.accounts.user_home_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer,
                ),
                home_amount,
            )?;
        }

        // Mint AWAY tokens to user
        if away_amount > 0 {
            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.away_mint.to_account_info(),
                        to: ctx.accounts.user_away_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer,
                ),
                away_amount,
            )?;
        }

        Ok(())
    }
}

// Helper function for AMM math
fn calculate_amount_out(
    amount_in: u64,
    reserve_in: u64,
    reserve_out: u64,
) -> Result<u64> {
    // dy = (y * dx) / (x + dx)
    let numerator = (reserve_out as u128)
        .checked_mul(amount_in as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let denominator = (reserve_in as u128)
        .checked_add(amount_in as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let amount_out = numerator
        .checked_div(denominator)
        .ok_or(ErrorCode::MathOverflow)?;
    
    Ok(amount_out as u64)
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
pub struct Market {
    pub authority: Pubkey,      // 32
    pub game_id: String,        // 4 + 50
    pub home_team: String,      // 4 + 20
    pub away_team: String,      // 4 + 20
    pub home_mint: Pubkey,      // 32
    pub away_mint: Pubkey,      // 32
    pub is_active: bool,        // 1
    pub winner: Option<TeamSide>, // 1 + 1
    pub bump: u8,               // 1
}

#[account]
pub struct LiquidityPool {
    pub market: Pubkey,         // 32
    pub home_vault: Pubkey,     // 32
    pub away_vault: Pubkey,     // 32
    pub home_reserve: u64,      // 8
    pub away_reserve: u64,      // 8
    pub constant_k: u64,        // 8
    pub bump: u8,               // 1
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4 + 50) + (4 + 20) + (4 + 20) + 32 + 32 + 1 + 2 + 1,
        seeds = [b"market", game_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        mint::token_program = token_program
    )]
    pub home_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        mint::token_program = token_program
    )]
    pub away_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(initial_home_amount: u64, initial_away_amount: u64)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"pool", market.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, LiquidityPool>,

    #[account(
        mut,
        address = market.home_mint
    )]
    pub home_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = market.away_mint
    )]
    pub away_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = home_mint,
        associated_token::authority = pool,
        associated_token::token_program = token_program
    )]
    pub home_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = away_mint,
        associated_token::authority = pool,
        associated_token::token_program = token_program
    )]
    pub away_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"pool", market.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, LiquidityPool>,

    #[account(
        mut,
        address = pool.home_vault
    )]
    pub home_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = pool.away_vault
    )]
    pub away_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = market.home_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_home_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = market.away_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_away_account: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub market: Account<'info, Market>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FundUser<'info> {
    pub market: Account<'info, Market>,

    #[account(
        mut,
        address = market.home_mint
    )]
    pub home_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = market.away_mint
    )]
    pub away_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = home_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_home_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = away_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_away_account: Account<'info, TokenAccount>,

    /// CHECK: Just used for ATA derivation
    pub user: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// Enums & Events
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TeamSide {
    Home,
    Away,
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub home_reserve: u64,
    pub away_reserve: u64,
}

#[event]
pub struct MarketResolvedEvent {
    pub market: Pubkey,
    pub game_id: String,
    pub winner: TeamSide,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
}
