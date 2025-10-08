# Bonding Curve Design

## Overview

SportsXchange uses bonding curves to create dynamic pricing for prediction markets. The price of tokens increases exponentially with supply, rewarding early participants.

## The Formula

```
price = k * supply^n

k = 0.0001  (initial price)
n = 1.5     (curve steepness)
```

## Economic Impact

| Investment Point | $100 Gets You | If Team Wins (at $20k pool) |
|-----------------|---------------|------------------------------|
| First buyer     | 10,000 tokens | $8,000 (80x)                |
| At $1k volume   | 1,000 tokens  | $800 (8x)                   |
| At $5k volume   | 100 tokens    | $80 (0.8x loss)             |
| At $10k volume  | 10 tokens     | $8 (0.08x loss)             |

## Key Mechanics

### Buying
- Spend USDC to get team tokens
- Price increases with each purchase
- Early buyers get exponentially more tokens

### Selling  
- Sell tokens back for USDC
- Price decreases with each sale
- Can profit by selling to later buyers

### Resolution
- Trading stops at game start
- Winner tokens: Claim share of pool
- Loser tokens: Worth $0

## Implementation

### Smart Contract
```rust
// Stores curve parameters
pub struct MarketV2 {
    pub k_value: u64,  // Initial price (scaled 10^9)
    pub n_value: u64,  // Exponent (scaled 10^2)
    pub team_a_supply: u64,
    pub team_b_supply: u64,
    pub pool_value: u64,
}

// Buy tokens on curve
pub fn buy_on_curve(
    team: u8,
    usdc_amount: u64,
    min_tokens_out: u64  // Slippage protection
)

// Sell tokens on curve
pub fn sell_on_curve(
    team: u8,
    token_amount: u64,
    min_usdc_out: u64
)
```

### Client Integration
```javascript
// Calculate expected tokens
function calculateTokensOut(usdcAmount, currentSupply) {
  const k = 0.0001;
  const n = 1.5;
  let tokensOut = 0;
  
  for (let i = 0; i < 100; i++) {
    const price = k * Math.pow(currentSupply + tokensOut, n);
    tokensOut += (usdcAmount / 100) / price;
  }
  
  return tokensOut;
}
```

## Why Bonding Curves?

1. **No Initial Liquidity Required** - Markets can start from zero
2. **Natural Price Discovery** - Market finds fair value through trading
3. **Early Incentive** - Rewards market creators and early believers
4. **Guaranteed Liquidity** - Always a price to buy or sell

## Risk/Reward Profile

- **Early Buyers**: High risk, potential 10-100x returns
- **Mid Buyers**: Moderate risk, potential 2-5x returns
- **Late Buyers**: Low upside, providing exit liquidity
- **Sellers**: Can profit without game outcome by trading the curve

## Parameters Tested

Through simulation (`agents/simulator.js`), optimal parameters:
- k = 0.0001: Gentle enough for sustained growth
- n = 1.5: Significant early advantage without being extreme
- Result: 100-150x advantage for first buyers vs late buyers
