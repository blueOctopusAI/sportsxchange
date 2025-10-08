use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH");

#[program]
pub mod sportsxchange {
    use super::*;

    // Create a new prediction market with bonding curves
    pub fn create_market_v2(
        ctx: Context<CreateMarketV2>,
        game_id: String,
        team_a: String,
        team_b: String,
        k: u64,  // Initial price coefficient (scaled by 10^9)
        n: u64,  // Curve exponent (scaled by 10^2, so 150 = 1.5)
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.game_id = game_id;
        market.team_a = team_a;
        market.team_b = team_b;
        market.team_a_mint = ctx.accounts.team_a_mint.key();
        market.team_b_mint = ctx.accounts.team_b_mint.key();
        market.usdc_vault = ctx.accounts.usdc_vault.key();
        market.k_value = k;
        market.n_value = n;
        market.team_a_supply = 0;
        market.team_b_supply = 0;
        market.pool_value = 0;
        market.is_resolved = false;
        market.winner = None;
        market.trading_halted = false;
        
        msg!("Market created: {} vs {}", market.team_a, market.team_b);
        msg!("Bonding curve: k={}, n={}", k, n);
        
        Ok(())
    }

    // Buy team tokens on the bonding curve
    pub fn buy_on_curve(
        ctx: Context<BuyOnCurve>,
        team: u8,  // 0 for team A, 1 for team B
        usdc_amount: u64,
        min_tokens_out: u64,  // Slippage protection
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.trading_halted, ErrorCode::TradingHalted);
        require!(team <= 1, ErrorCode::InvalidTeam);
        
        // Calculate tokens to mint based on bonding curve
        let current_supply = if team == 0 { 
            market.team_a_supply 
        } else { 
            market.team_b_supply 
        };
        
        let tokens_out = calculate_tokens_out(
            usdc_amount,
            current_supply,
            market.k_value,
            market.n_value,
        )?;
        
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        
        // Transfer USDC from buyer to vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_usdc.to_account_info(),
                to: ctx.accounts.usdc_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, usdc_amount)?;
        
        // Mint team tokens to buyer
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
        
        // Update market state
        if team == 0 {
            market.team_a_supply += tokens_out;
        } else {
            market.team_b_supply += tokens_out;
        }
        market.pool_value += usdc_amount;
        
        emit!(TradeEvent {
            market: market.key(),
            trader: ctx.accounts.buyer.key(),
            action: TradeAction::Buy,
            team,
            usdc_amount,
            token_amount: tokens_out,
            new_supply: if team == 0 { market.team_a_supply } else { market.team_b_supply },
            pool_value: market.pool_value,
        });
        
        msg!("Bought {} tokens for {} USDC", tokens_out, usdc_amount);
        
        Ok(())
    }

    // Sell team tokens on the bonding curve
    pub fn sell_on_curve(
        ctx: Context<SellOnCurve>,
        team: u8,
        token_amount: u64,
        min_usdc_out: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.trading_halted, ErrorCode::TradingHalted);
        require!(team <= 1, ErrorCode::InvalidTeam);
        
        // Calculate USDC to return based on bonding curve
        let current_supply = if team == 0 { 
            market.team_a_supply 
        } else { 
            market.team_b_supply 
        };
        
        require!(token_amount <= current_supply, ErrorCode::InsufficientSupply);
        
        let usdc_out = calculate_usdc_out(
            token_amount,
            current_supply,
            market.k_value,
            market.n_value,
        )?;
        
        require!(usdc_out >= min_usdc_out, ErrorCode::SlippageExceeded);
        require!(usdc_out <= market.pool_value, ErrorCode::InsufficientPoolValue);
        
        // Burn team tokens from seller
        let mint = if team == 0 {
            &ctx.accounts.team_a_mint
        } else {
            &ctx.accounts.team_b_mint
        };
        
        let token_account = if team == 0 {
            &ctx.accounts.seller_team_a_account
        } else {
            &ctx.accounts.seller_team_b_account
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: mint.to_account_info(),
                from: token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );
        token::burn(cpi_ctx, token_amount)?;
        
        // Transfer USDC from vault to seller
        let seeds = &[
            b"market",
            market.game_id.as_bytes(),
            &[ctx.bumps.market],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.usdc_vault.to_account_info(),
                to: ctx.accounts.seller_usdc.to_account_info(),
                authority: market.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, usdc_out)?;
        
        // Update market state
        if team == 0 {
            market.team_a_supply -= token_amount;
        } else {
            market.team_b_supply -= token_amount;
        }
        market.pool_value -= usdc_out;
        
        emit!(TradeEvent {
            market: market.key(),
            trader: ctx.accounts.seller.key(),
            action: TradeAction::Sell,
            team,
            usdc_amount: usdc_out,
            token_amount,
            new_supply: if team == 0 { market.team_a_supply } else { market.team_b_supply },
            pool_value: market.pool_value,
        });
        
        msg!("Sold {} tokens for {} USDC", token_amount, usdc_out);
        
        Ok(())
    }

    // Halt trading when game starts
    pub fn halt_trading(ctx: Context<HaltTrading>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.trading_halted, ErrorCode::AlreadyHalted);
        
        market.trading_halted = true;
        
        msg!("Trading halted for market: {}", market.game_id);
        
        Ok(())
    }

    // Resolve market with winner
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winner: u8,  // 0 for team A, 1 for team B
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(market.trading_halted, ErrorCode::TradingNotHalted);
        require!(!market.is_resolved, ErrorCode::AlreadyResolved);
        require!(winner <= 1, ErrorCode::InvalidTeam);
        
        market.winner = Some(winner);
        market.is_resolved = true;
        
        msg!("Market resolved. Winner: {}", 
            if winner == 0 { &market.team_a } else { &market.team_b }
        );
        
        Ok(())
    }

    // Claim winnings after resolution
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        
        require!(market.is_resolved, ErrorCode::MarketNotResolved);
        
        let winner = market.winner.ok_or(ErrorCode::NoWinner)?;
        
        // Check if user holds winning tokens
        let token_balance = if winner == 0 {
            ctx.accounts.user_team_a_account.amount
        } else {
            ctx.accounts.user_team_b_account.amount
        };
        
        require!(token_balance > 0, ErrorCode::NoWinningTokens);
        
        // Calculate payout
        let total_supply = if winner == 0 {
            market.team_a_supply
        } else {
            market.team_b_supply
        };
        
        let payout = (token_balance as u128)
            .checked_mul(market.pool_value as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(total_supply as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;
        
        // Burn winning tokens
        let mint = if winner == 0 {
            &ctx.accounts.team_a_mint
        } else {
            &ctx.accounts.team_b_mint
        };
        
        let token_account = if winner == 0 {
            &ctx.accounts.user_team_a_account
        } else {
            &ctx.accounts.user_team_b_account
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: mint.to_account_info(),
                from: token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(cpi_ctx, token_balance)?;
        
        // Transfer USDC payout
        let seeds = &[
            b"market",
            market.game_id.as_bytes(),
            &[ctx.bumps.market],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.usdc_vault.to_account_info(),
                to: ctx.accounts.user_usdc.to_account_info(),
                authority: market.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, payout)?;
        
        msg!("Claimed {} USDC for {} winning tokens", payout, token_balance);
        
        Ok(())
    }
}

// Calculate tokens out from bonding curve
fn calculate_tokens_out(
    usdc_amount: u64,
    current_supply: u64,
    k: u64,
    n: u64,
) -> Result<u64> {
    // Numerical integration for accuracy
    // price = k * supply^n
    // tokens = integral of (1/price) 
    
    let mut tokens_out = 0u64;
    let steps = 100u64;
    let usdc_per_step = usdc_amount / steps;
    
    for _ in 0..steps {
        let current_price = calculate_price(current_supply + tokens_out, k, n)?;
        if current_price == 0 {
            return Ok(0);
        }
        
        // tokens_this_step = usdc_per_step / price
        // Using scaled arithmetic to maintain precision
        let tokens_this_step = (usdc_per_step as u128 * 1_000_000_000)
            .checked_div(current_price as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;
        
        tokens_out = tokens_out
            .checked_add(tokens_this_step)
            .ok_or(ErrorCode::MathOverflow)?;
    }
    
    Ok(tokens_out / 1_000)  // Adjust for scaling
}

// Calculate USDC out from bonding curve
fn calculate_usdc_out(
    token_amount: u64,
    current_supply: u64,
    k: u64,
    n: u64,
) -> Result<u64> {
    let mut usdc_out = 0u64;
    let steps = 100u64;
    let tokens_per_step = token_amount / steps;
    
    for i in 0..steps {
        let supply_at_step = current_supply - (tokens_per_step * i);
        let current_price = calculate_price(supply_at_step, k, n)?;
        
        // usdc_this_step = tokens_per_step * price
        let usdc_this_step = (tokens_per_step as u128)
            .checked_mul(current_price as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(1_000_000_000)
            .ok_or(ErrorCode::MathOverflow)? as u64;
        
        usdc_out = usdc_out
            .checked_add(usdc_this_step)
            .ok_or(ErrorCode::MathOverflow)?;
    }
    
    Ok(usdc_out)
}

// Calculate price at given supply
fn calculate_price(supply: u64, k: u64, n: u64) -> Result<u64> {
    if supply == 0 {
        return Ok(k);
    }
    
    // price = k * supply^(n/100)
    // Using integer approximation for power function
    let n_scaled = n as u128;
    let supply_scaled = supply as u128;
    
    // Approximate supply^(n/100) using repeated multiplication
    let mut result = 1_000_000_000u128;  // Start with 1 (scaled)
    let mut base = supply_scaled;
    let mut exp = n_scaled;
    
    while exp > 0 {
        if exp % 200 == 100 {
            result = result
                .checked_mul(base)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(1_000_000)
                .ok_or(ErrorCode::MathOverflow)?;
        }
        base = base
            .checked_mul(base)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(1_000_000)
            .ok_or(ErrorCode::MathOverflow)?;
        exp /= 2;
    }
    
    // price = k * result
    let price = (k as u128)
        .checked_mul(result)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(ErrorCode::MathOverflow)? as u64;
    
    Ok(price)
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

#[derive(Accounts)]
pub struct SellOnCurve<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
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
        associated_token::authority = seller
    )]
    pub seller_team_a_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = team_b_mint,
        associated_token::authority = seller
    )]
    pub seller_team_b_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub usdc_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct HaltTrading<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"market", market.game_id.as_bytes()],
        bump,
        has_one = authority
    )]
    pub market: Account<'info, MarketV2>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"market", market.game_id.as_bytes()],
        bump,
        has_one = authority
    )]
    pub market: Account<'info, MarketV2>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
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
        associated_token::authority = user
    )]
    pub user_team_a_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = team_b_mint,
        associated_token::authority = user
    )]
    pub user_team_b_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub usdc_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
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
    pub k_value: u64,     // Bonding curve coefficient
    pub n_value: u64,     // Bonding curve exponent
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

// Events
#[event]
pub struct TradeEvent {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub action: TradeAction,
    pub team: u8,
    pub usdc_amount: u64,
    pub token_amount: u64,
    pub new_supply: u64,
    pub pool_value: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TradeAction {
    Buy,
    Sell,
}

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Trading is halted")]
    TradingHalted,
    #[msg("Trading is not halted")]
    TradingNotHalted,
    #[msg("Market already resolved")]
    AlreadyResolved,
    #[msg("Market not resolved")]
    MarketNotResolved,
    #[msg("Invalid team selection")]
    InvalidTeam,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient token supply")]
    InsufficientSupply,
    #[msg("Insufficient pool value")]
    InsufficientPoolValue,
    #[msg("No winner set")]
    NoWinner,
    #[msg("No winning tokens")]
    NoWinningTokens,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Already halted")]
    AlreadyHalted,
}
