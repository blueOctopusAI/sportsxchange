use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH");

#[program]
pub mod sportsxchange {
    use super::*;

    // Create market with simpler linear bonding curve
    pub fn create_market_v2(
        ctx: Context<CreateMarketV2>,
        game_id: String,
        team_a: String,
        team_b: String,
        base_price: u64,  // Base price in lamports per token (e.g., 100 = 0.0001 SOL)
        slope: u64,       // Price increase per million tokens (e.g., 10 = price goes up 0.00001 SOL per million tokens)
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.game_id = game_id;
        market.team_a = team_a;
        market.team_b = team_b;
        market.team_a_mint = ctx.accounts.team_a_mint.key();
        market.team_b_mint = ctx.accounts.team_b_mint.key();
        market.usdc_vault = ctx.accounts.usdc_vault.key();
        market.base_price = base_price;
        market.slope = slope;
        market.team_a_supply = 0;
        market.team_b_supply = 0;
        market.pool_value = 0;
        market.is_resolved = false;
        market.winner = None;
        market.trading_halted = false;
        
        msg!("Market created: {} vs {}", market.team_a, market.team_b);
        msg!("Linear bonding curve: base_price={}, slope={}", base_price, slope);
        
        Ok(())
    }

    // Buy tokens with linear bonding curve
    pub fn buy_on_curve(
        ctx: Context<BuyOnCurve>,
        team: u8,
        usdc_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.trading_halted, ErrorCode::TradingHalted);
        require!(team <= 1, ErrorCode::InvalidTeam);
        
        let current_supply = if team == 0 { 
            market.team_a_supply 
        } else { 
            market.team_b_supply 
        };
        
        // Calculate tokens using linear bonding curve
        // Average price = base_price + (slope * current_supply / 2)
        // tokens_out = usdc_amount / average_price
        let tokens_out = calculate_tokens_linear(
            usdc_amount,
            current_supply,
            market.base_price,
            market.slope,
        )?;
        
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        
        // Transfer USDC
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_usdc.to_account_info(),
                to: ctx.accounts.usdc_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, usdc_amount)?;
        
        // Mint tokens
        let mint = if team == 0 {
            &ctx.accounts.team_a_mint
        } else {
            &ctx.accounts.team_b_mint
        };
        
        let token_account = if team == 0 {
            &ctx.accounts.buyer_team_a_account
        } else {
            &ctx.accounts.buyer_team_b_account
        };
        
        let seeds = &[
            b"market",
            market.game_id.as_bytes(),
            &[ctx.bumps.market],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: mint.to_account_info(),
                to: token_account.to_account_info(),
                authority: market.to_account_info(),
            },
            signer,
        );
        token::mint_to(cpi_ctx, tokens_out)?;
        
        // Update state
        if team == 0 {
            market.team_a_supply += tokens_out;
        } else {
            market.team_b_supply += tokens_out;
        }
        market.pool_value += usdc_amount;
        
        msg!("Bought {} tokens for {} USDC", tokens_out, usdc_amount);
        
        Ok(())
    }

    // Other functions remain similar...
}

// Simple linear bonding curve calculation
fn calculate_tokens_linear(
    usdc_amount: u64,
    current_supply: u64,
    base_price: u64,
    slope: u64,
) -> Result<u64> {
    // Linear bonding curve: price = base_price + (slope * supply / 1_000_000)
    // We use the average price over the purchase range
    
    // Starting price at current supply
    let start_price = base_price
        .checked_add(
            slope.checked_mul(current_supply / 1_000_000)
                .ok_or(ErrorCode::MathOverflow)?
        )
        .ok_or(ErrorCode::MathOverflow)?;
    
    // This is simplified - for small purchases, we can approximate
    // For production, you'd want to solve the quadratic equation properly
    if start_price == 0 {
        return Ok(0);
    }
    
    // Simple approximation: tokens = usdc_amount / start_price
    // With scaling for 6 decimals
    let tokens_out = (usdc_amount as u128)
        .checked_mul(1_000_000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(start_price as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;
    
    Ok(tokens_out)
}

// Account structures
#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateMarketV2<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + MarketV2::SPACE,
        seeds = [b"market", game_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, MarketV2>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"team_a_mint", game_id.as_bytes()],
        bump
    )]
    pub team_a_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"team_b_mint", game_id.as_bytes()],
        bump
    )]
    pub team_b_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = market,
        seeds = [b"usdc_vault", game_id.as_bytes()],
        bump
    )]
    pub usdc_vault: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyOnCurve<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"market", market.game_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, MarketV2>,
    
    #[account(mut)]
    pub team_a_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub team_b_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = team_a_mint,
        associated_token::authority = buyer
    )]
    pub buyer_team_a_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = team_b_mint,
        associated_token::authority = buyer
    )]
    pub buyer_team_b_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub usdc_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// State
#[account]
pub struct MarketV2 {
    pub authority: Pubkey,
    pub game_id: String,  // 50 chars max
    pub team_a: String,   // 20 chars max
    pub team_b: String,   // 20 chars max
    pub team_a_mint: Pubkey,
    pub team_b_mint: Pubkey,
    pub usdc_vault: Pubkey,
    pub base_price: u64,     // Base price (starting price)
    pub slope: u64,          // Price increase per million tokens
    pub team_a_supply: u64,
    pub team_b_supply: u64,
    pub pool_value: u64,
    pub trading_halted: bool,
    pub is_resolved: bool,
    pub winner: Option<u8>,
}

impl MarketV2 {
    const SPACE: usize = 32 + 4 + 50 + 4 + 20 + 4 + 20 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 1;
}

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Trading is halted")]
    TradingHalted,
    #[msg("Invalid team selection")]
    InvalidTeam,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Math overflow")]
    MathOverflow,
}
