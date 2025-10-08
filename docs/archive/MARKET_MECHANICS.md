# SportsXchange - Sports Prediction Market AMM

## How It Actually Works

### Market Mechanics
- Each market has TWO outcome tokens: **Team A** vs **Team B** (e.g., KC vs BAL)
- Users can **buy**, **sell**, or **swap** between team tokens
- At game end, **winner tokens = $1**, **loser tokens = $0**
- The AMM uses constant product (x * y = k) for price discovery

### Trading Operations

1. **BUY Team Token**
   - Spend USDC/SOL to buy team tokens
   - Increases that team's probability
   - Example: Buy 100 KC tokens when KC is at 45%

2. **SELL Team Token**  
   - Sell team tokens back for USDC/SOL
   - Decreases that team's probability
   - Example: Sell 100 KC tokens when KC is at 55%

3. **SWAP Between Teams**
   - Trade KC tokens for BAL tokens directly
   - Shifts probability between teams
   - Example: Swap 100 KC for ~82 BAL (if KC at 55%)

### User Positions
- Users hold SPECIFIC TEAM tokens (KC, BAL, DET, HOU, etc.)
- NOT generic "home" or "away" tokens
- Each market is independent with its own tokens

### Profit Scenarios

**Example: KC vs BAL Market**
- Current odds: KC 45%, BAL 55%
- You buy 100 KC tokens for $45
- KC wins the game
- Your 100 KC tokens are now worth $100
- Profit: $55 (122% return)

**Risk**: If BAL wins, your KC tokens = $0

### Price Discovery
- Initial pool: 1000 KC / 1000 BAL (50%/50%)
- User buys 100 KC tokens
- New pool: ~900 KC / ~1111 BAL  
- New odds: KC 55.2% / BAL 44.8%
- The more people buy a team, the higher its implied probability

### Key Differences from Traditional Betting
- **Dynamic Odds**: Change with each trade
- **Exit Anytime**: Sell before game ends
- **Liquidity Provision**: Can add to pools for fees
- **No Bookie**: Automated market maker

## Technical Implementation

### Smart Contract Instructions
```rust
// Core trading functions
buy_team_a(amount_in: u64) -> team_a_tokens
buy_team_b(amount_in: u64) -> team_b_tokens
sell_team_a(tokens_in: u64) -> usdc_out
sell_team_b(tokens_in: u64) -> usdc_out
swap_a_for_b(a_tokens: u64) -> b_tokens
swap_b_for_a(b_tokens: u64) -> a_tokens
```

### Resolution
```rust
resolve_market(winner: Team) {
    if winner == TeamA {
        team_a_token.value = 1.0
        team_b_token.value = 0.0
    } else {
        team_a_token.value = 0.0
        team_b_token.value = 1.0
    }
}
```

### User Balance Structure
```javascript
userBalances = {
  'KC': 150.5,    // 150.5 KC tokens
  'BAL': 75.2,    // 75.2 BAL tokens
  'DET': 200.0,   // 200 DET tokens
  'HOU': 0,       // No HOU tokens
  'USDC': 500.0   // 500 USDC for buying
}
```

## UI Requirements

### Market Card Display
- Show TEAM names (not home/away)
- Display probability for each team
- Show user's position in each team

### Trading Interface
- **Buy KC** - Spend USDC to get KC tokens
- **Sell KC** - Sell KC tokens for USDC
- **Swap to BAL** - Trade KC tokens for BAL tokens

### Portfolio View
```
Your Positions:
KC:  150 tokens @ 45% = $67.50 current value
BAL: 75 tokens @ 55% = $41.25 current value
DET: 200 tokens @ 52% = $104.00 current value
```

### Resolution Display
```
Game Ended: KC wins!
KC tokens: 150 × $1.00 = $150.00 ✅
BAL tokens: 75 × $0.00 = $0.00 ❌
Net P&L: +$41.25 (37.8% profit)
```
