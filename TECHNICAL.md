# Technical Documentation

## Architecture Overview

SportsXchange consists of three main components:

### 1. Smart Contracts (Solana/Anchor) ✅ COMPLETE
- **Location**: `/programs/sportsxchange/src/lib.rs`
- **Status**: Fully functional with buy/sell operations
- **Implementation**: Linear bonding curve with USDC base currency
- **Key Achievement**: Complete trading cycle tested and working

### 2. Mobile App (React Native)
- Wallet connection interface
- Market browsing and trading
- Bonding curve price charts
- Real-time trade feed
- **Status**: UI complete, blockchain integration pending

### 3. Trading Agents (Node.js) ✅ OPERATIONAL
- Market creation automation
- Buy/sell testing scripts
- Economic simulations
- Debug and inspection tools
- **Status**: Full test suite operational

## Bonding Curve Implementation (WORKING)

### Math Formula
```
price = base_price + (slope * supply)

Where:
- base_price = 100,000 (0.1 USDC in lamports)
- slope = 10,000 (price increase per million tokens)
```

### Actual Performance (Tested)
```
Supply Level    | Price per Token | $10 Investment Gets
----------------|-----------------|--------------------
0 tokens        | 0.10 USDC      | 100 tokens
50 tokens       | 0.60 USDC      | 16.7 tokens
100 tokens      | 1.10 USDC      | 9.1 tokens
109 tokens      | 1.19 USDC      | 8.4 tokens
```

### Smart Contract Instructions

#### `create_market_v2`
Creates a new prediction market with bonding curve parameters.
```rust
pub fn create_market_v2(
    ctx: Context<CreateMarketV2>,
    game_id: String,
    team_a: String,
    team_b: String,
    base_price: u64,  // Starting price in lamports
    slope: u64,       // Price increase rate
) -> Result<()>
```

#### `buy_on_curve`
Purchase team tokens with USDC, following the bonding curve pricing.
```rust
pub fn buy_on_curve(
    ctx: Context<BuyOnCurve>,
    team: u8,         // 0 for team A, 1 for team B
    usdc_amount: u64,
    min_tokens_out: u64,  // Slippage protection
) -> Result<()>
```

#### `sell_on_curve` ✨ NEW
Sell tokens back to the pool for USDC, burning the tokens.
```rust
pub fn sell_on_curve(
    ctx: Context<SellOnCurve>,
    team: u8,
    token_amount: u64,
    min_usdc_out: u64,  // Slippage protection
) -> Result<()>
```

## Key Algorithms

### Calculate Tokens Out (Buying)
```rust
fn calculate_tokens_linear(
    usdc_amount: u64,
    current_supply: u64,
    base_price: u64,
    slope: u64,
) -> Result<u64>
```
Uses average price over purchase range for accurate token calculation.

### Calculate USDC Out (Selling)
```rust
fn calculate_usdc_linear(
    token_amount: u64,
    current_supply: u64,
    base_price: u64,
    slope: u64,
) -> Result<u64>
```
Calculates return based on average price between start and end supply.

## Trading Flow (Verified Working)

### Complete Cycle Test Results
1. **Initial State**: 1000 USDC in wallet
2. **Buy**: 10 USDC → 109.09 tokens (avg price: 0.092 USDC)
3. **Price Impact**: Supply at 109, price now 1.19 USDC/token
4. **Sell**: 8 tokens → 9.2 USDC returned
5. **Profit**: 15% gain on partial position
6. **Pool Protection**: Larger sells rejected if insufficient liquidity

### Pool Economics
- **Pool Value Tracking**: Accurately maintained
- **Vault Balance**: Matches pool value after each operation
- **Insolvency Protection**: Working correctly
- **Token Burns**: Reduces supply on sells

## API Endpoints (Trading Interface)

```
GET  /                      # Web UI
GET  /api/pool/:marketPda   # Get pool info
GET  /api/balance/:marketPda # Get user balance
POST /api/fund              # Fund account (testnet)
POST /api/trade             # Execute trade
```

## Environment Variables

```bash
# .env file in /agents
RPC_URL=http://localhost:8899
PROGRAM_ID=7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH
WALLET_PATH=~/.config/solana/id.json
TRADING_PORT=3001
```

## Testing Suite

### Unit Tests
```bash
anchor test
```

### Integration Tests (All Passing)
```bash
cd agents

# Setup
node usdc-faucet.js          # Create test USDC
node create-usdc-market.js   # Deploy market

# Trading Tests
node test-buy-usdc.js        # ✅ Buy tokens
node test-small-sell.js      # ✅ Sell tokens
node test-complete-cycle.js  # ✅ Full cycle

# Debugging
node debug-sell.js           # Calculate sell prices
node inspect-market.js       # View market state
```

## Deployment

### Local Development (Current)
```bash
# Terminal 1: Validator
solana-test-validator

# Terminal 2: Deploy
anchor build
anchor deploy

# Terminal 3: Test
cd agents && node test-small-sell.js
```

### Devnet Deployment (Ready)
```bash
solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet
```

## Security Analysis

### Implemented Safeguards
1. **Overflow Protection**: All math uses checked arithmetic ✅
2. **Slippage Protection**: min_out parameters on all trades ✅
3. **Authority Controls**: Only market creator can halt/resolve ✅
4. **Reentrancy Protection**: State updates before transfers ✅
5. **Pool Solvency**: Checks available funds before payouts ✅

### Audit Recommendations
- Consider adding maximum position limits
- Implement time-based trading halts
- Add emergency pause mechanism
- Consider fee mechanism for sustainability

## Performance Metrics

- **Buy Instruction**: ~12,000 compute units
- **Sell Instruction**: ~15,785 compute units
- **Market Creation**: ~25,000 compute units
- **Gas Efficiency**: Well within Solana limits

## Mathematical Precision

### Integer Math Handling
- All calculations use u64 with 6 decimal places
- Proper scaling for USDC amounts (1_000_000 = 1 USDC)
- Floor division prevents fractional tokens
- No floating point operations (Solana best practice)

## Next Development Phase

### Immediate Priorities
1. **Mobile Integration**: Connect React Native to blockchain
2. **Oracle Integration**: Automated game results
3. **Market Resolution**: Implement winner declaration
4. **Claim Mechanism**: Distribute winnings

### Future Enhancements
- Dynamic slope adjustment
- Liquidity provider rewards
- Multi-market portfolios
- Historical data tracking

## Troubleshooting Guide

### Common Issues & Solutions

**"InsufficientPoolBalance" Error**
- *Cause*: Pool doesn't have enough USDC for the sell
- *Solution*: This is correct behavior - sell smaller amounts or add liquidity

**"AccountNotInitialized" (0xbc4)**
- *Cause*: Associated token accounts not created
- *Solution*: Create ATAs before trading

**High Slippage**
- *Cause*: Aggressive slope parameter
- *Solution*: Adjust slope in market creation or trade smaller amounts

## Contract Upgrade Path

Current version can be upgraded to add:
- Fee collection mechanism
- Liquidity provider tokens
- Governance controls
- Cross-market arbitrage

---

*Technical documentation updated after successful sell implementation - October 2024*
