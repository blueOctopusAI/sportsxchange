# SportsXchange - Sports Prediction Market with Ponzi Dynamics

## The Vision: Pump.fun for Sports Betting

**SportsXchange** is a sports prediction market that uses bonding curves to create pump.fun-style dynamics for every game. Early buyers get massive token allocations, late buyers FOMO in, and only the winning team's tokens have value at game end.

---

## How It Actually Works (Bonding Curve Model)

### The Pump Mechanics

1. **Market Creation**
   - Bonding curve starts at near-zero price
   - No initial liquidity needed
   - First buyer gets massive allocation

2. **Price Discovery Through FOMO**
   ```
   First buy:  $10 = 10,000 KC tokens
   After $1k volume: $10 = 1,000 KC tokens  
   After $10k volume: $10 = 100 KC tokens
   After $100k volume: $10 = 10 KC tokens
   ```

3. **Two Ways to Win**
   - **Early Exit**: Sell to later buyers at higher prices
   - **Diamond Hands**: Hold until game resolution

4. **Resolution**
   - Game starts = trading stops
   - Winner tokens = redeemable for share of pool
   - Loser tokens = worthless

### Bonding Curve Formula

```javascript
// Price increases exponentially with supply
price = k * supply^n

Where:
- k = initial price constant (e.g., 0.0001)
- n = curve steepness (e.g., 2 for quadratic)
- supply = total tokens minted

// Examples with n=2 (quadratic):
1st token: $0.0001
1,000th token: $0.10
10,000th token: $10.00
100,000th token: $1,000.00
```

### Market Dynamics

**Early Stage (First 10% of volume)**
- Dirt cheap tokens
- Massive upside potential
- High risk (might not pump)
- "Snipers" and "early apes"

**Mid Stage (10-50% of volume)**
- Price discovery phase
- Momentum traders enter
- Chart watchers pile in
- "Pump it" energy

**Late Stage (50%+ of volume)**
- FOMO buyers
- "Top buyers"
- Exit liquidity for early holders
- Maximum degeneracy

### Trading Examples

**Scenario 1: Early Ape**
```
- Buy $100 of KC at start = 100,000 tokens
- KC pumps to 70% implied probability
- Your position worth $5,000
- Sell half to lock in 25x profit
- Let rest ride for the game
```

**Scenario 2: FOMO Buyer**
```
- See KC pumping in chat
- Buy $100 of KC at 65% = 50 tokens
- KC wins the game
- 50 tokens × final pool ÷ total tokens = $75
- Loss: $25 (provided exit liquidity)
```

**Scenario 3: Counter-Trade**
```
- KC pumps to 70%
- You think it's overvalued
- Buy $100 of BAL at 30% = 5,000 tokens
- If BAL wins: massive payout
- If KC wins: -$100
```

## The Social Layer (Critical for Ponzi Dynamics)

### Live Market Chat
```
[KC vs BAL - $45,234 Volume]

DegenChad: KC PUMPING 🚀🚀🚀
BearTrader: Top signal, buying BAL
KCMaxi: JEETS SELLING AT 55% LMAOOO
PumpMaster: 65% AND WE'RE JUST STARTING
BaltimoreBull: KC buyers about to get REKT
ChartWatcher: Cup and handle forming on KC
```

### Leaderboard Dynamics
- **Profit Leaders**: Who's up the most
- **Volume Kings**: Biggest degens
- **Diamond Hands**: Holding since <40%
- **Snipers**: Bought in first minute

### Social Signals
- "🚀" count = bullish indicator
- Chat velocity = FOMO meter
- Whale alerts when big buys hit
- "He sold? Pump it" memes

## Technical Implementation

### Smart Contract Changes

```rust
pub struct Market {
    pub team_a: Pubkey,
    pub team_b: Pubkey,
    pub curve_a: BondingCurve,
    pub curve_b: BondingCurve,
    pub volume_a: u64,
    pub volume_b: u64,
    pub supply_a: u64,
    pub supply_b: u64,
    pub resolution_time: i64,
    pub winner: Option<Team>,
}

pub struct BondingCurve {
    pub k: u64,        // Initial price
    pub n: u64,        // Curve exponent (×100 for decimals)
    pub max_supply: u64,
}

// Instructions
pub fn buy_on_curve(
    team: Team,
    usdc_amount: u64,
) -> Result<u64> {
    // Calculate tokens from curve
    let tokens = curve.calculate_tokens_out(usdc_amount, current_supply);
    // Mint tokens to buyer
    // Update supply
    // Emit pump event
}

pub fn sell_on_curve(
    team: Team,
    token_amount: u64,
) -> Result<u64> {
    // Calculate USDC from curve
    let usdc = curve.calculate_usdc_out(token_amount, current_supply);
    // Burn tokens
    // Send USDC
    // Update supply
}
```

### Frontend Requirements

**Main Feed (Pump.fun Style)**
```
┌─────────────────────────────┐
│ KC vs BAL        🔥 $45.2k  │
│ ███████░░░ 71%             │
│ +45% (1h)  📈 PUMPING      │
├─────────────────────────────┤
│ DET vs HOU       $12.3k     │
│ ████░░░░░░ 43%             │
│ -5% (1h)   📉              │
└─────────────────────────────┘
```

**Market Page**
- Real-time price chart
- Order book depth
- Recent trades feed
- Live chat
- Buy/Sell buttons
- Position tracker

**Mobile Specific**
- Swipe to buy (haptic feedback)
- Pull to refresh positions
- Push notifications for pumps
- One-thumb trading

## Migration Path

### Phase 1: Keep AMM as "Classic Mode"
- Current x*y=k pools remain
- Add "Degen Mode" with bonding curves
- Users choose their experience

### Phase 2: Bonding Curve Dominance
- New markets default to curves
- Classic only for large/stable markets
- Emphasis on early-bird dynamics

### Phase 3: Full Ponzi Mode
- All markets on curves
- Referral rewards
- "King of the Hill" daily game
- Achievements for pump lords

## Key Metrics to Track

- **Pump Velocity**: How fast prices rise
- **Dump Severity**: How hard they fall
- **Chat-to-Volume Ratio**: Engagement metric
- **Early Bird ROI**: Average return for first 10 buyers
- **FOMO Index**: Late buyer participation rate
- **Rug Rate**: How often favorites dump

## Revenue Model

1. **Trading Fees**: 1% on buys, 1% on sells
2. **Early Access**: Pay for private market sniping
3. **Promoted Pumps**: Teams pay to feature games
4. **Data Feed**: Sell sentiment data to actual sportsbooks

## Risk Factors

- **Regulatory**: It's basically gambling
- **Rug Pulls**: Early buyers dumping on late buyers
- **Manipulation**: Coordinate pump groups
- **Addiction**: This will be crack cocaine

## The Degenerate's Dream

"I bought KC at $0.001, watched it pump to $0.70, sold half to the FOMO crowd, and letting the rest ride. If KC wins, I'm up 1000x. If they lose, still up 500x. WAGMI."

---

## OBSOLETE: Traditional AMM Model

<details>
<summary>Click to view old constant product AMM design</summary>

### Old Market Mechanics (x*y=k)
- Pool starts at 1000/1000 (50%/50%)
- Users buy/sell against constant product curve
- Price gets worse as more people buy same side
- Everyone wins same $1 per token at resolution
- No early bird advantage
- Just probability-based trading

### Why We Moved Away
- Not degen enough
- No FOMO mechanics
- Can't pump your bags
- Boring boomer DeFi
- No memes

</details>

---

## Summary

SportsXchange is not a "prediction market" - it's a PvP arena where early birds feast on FOMO buyers, teams get pumped and dumped, and only the strongest hands survive until game time.

It's pump.fun meets sports betting, and it's going to be absolutely degenerate.

**LFG 🚀🚀🚀**
