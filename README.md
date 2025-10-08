# SportsXchange

**Bonding curve prediction markets for sports betting on Solana** 🏗️ **LOCAL DEVELOPMENT FOCUS**

## Development Philosophy: Local-First

**We build and perfect everything locally before any external deployment.** This means comprehensive testing, real sports data integration, automated trading bots, and complete market lifecycle simulation—all on your local validator. Only when the system is bulletproof locally do we consider testnet.

## What is SportsXchange?

A decentralized sports prediction market that uses bonding curves to create dynamic pricing. Early buyers get exponentially more tokens than late buyers, creating natural price discovery through trading activity.

## ✨ Current Status: Phase 3 Started - Basic Bot Simulation Working

### Completed ✅
- **Smart Contracts**: Buy/sell functionality working on local validator
- **Bonding Curves**: Linear pricing model implemented and tested
- **USDC Integration**: Complete buy/sell cycle with test USDC
- **Token Management**: Minting, burning, and transfers working
- **Basic Testing**: 150+ trades executed, 7/8 test cases passing
- **Mock Bot Ecosystem**: Simulation framework created with 5 bot types
- **Mock Sports Data**: Placeholder NFL games (not real API integration)

### In Progress 🚧 
- **Real Sports API Integration**: Need actual SportsDataIO or similar API
- **Live Data Feeds**: Real-time game updates and odds
- **UI Development**: Web interface for markets and trading
- **Bot Real Trading**: Bots currently only simulate, don't execute real trades
- **Mobile App Integration**: Connect React Native app to local validator
- **Market Resolution**: Game completion and winner payouts

## How It Works

### Bonding Curve Mechanics
- Markets start with tokens priced near zero (0.1 USDC base price)
- Each purchase increases the price along a curve (price = base + slope * supply)
- Early buyers can profit by selling to later buyers OR holding until game resolution
- Selling tokens burns them and returns USDC from the pool
- Pool protects itself from insolvency by checking available funds

### Live Example (Tested & Working)
- First 10 USDC invested → 109 tokens at ~0.09 USDC each
- After 109 tokens minted → price rises to 1.19 USDC per token
- Selling 8 tokens → Returns 9.2 USDC (profit!)
- Early buyer advantage: 13x price increase demonstrated

## Project Structure

```
sportsxchange/
├── programs/           # Solana smart contracts (Anchor) ✅
├── agents/            # Trading bots and test scripts ✅
├── sportsxchange-mobile/  # React Native mobile app 🚧
└── tests/             # Integration tests ✅
```

## Quick Start

### Prerequisites
- Node.js 18+
- Rust & Anchor CLI
- Solana CLI
- iOS/Android simulator (for mobile)

### 1. Start Local Validator
```bash
solana-test-validator > validator.log 2>&1 &
```

### 2. Deploy Contracts
```bash
anchor build
anchor deploy
```

### 3. Create Test USDC
```bash
cd agents
node usdc-faucet.js
```

### 4. Create a Market
```bash
node create-usdc-market.js
```

### 5. Test Complete Trading Cycle
```bash
# Buy tokens
node test-buy-usdc.js

# Sell tokens back
node test-small-sell.js

# Debug calculations
node debug-sell.js
```

### 6. Run Phase 3: Sports Data & Bot Ecosystem
```bash
# Run the full Phase 3 orchestrator
npm run phase3

# Or run with more markets and bots
npm run phase3:full
```

### 7. Run Mobile App (Currently Mock Data)
```bash
cd sportsxchange-mobile
npm install
npm start
# Press 'w' for web or scan QR for mobile
```

## Mobile App Features

- **Market Discovery**: Browse active prediction markets
- **Bonding Curve Trading**: Buy/sell with dynamic pricing visualization
- **Price Charts**: Visual representation of bonding curves
- **Recent Trades**: Live feed of trading activity
- **Portfolio Tracking**: View your positions and P&L

## Smart Contract Implementation

The core contract (`programs/sportsxchange/src/lib.rs`) implements:

### Instructions
- `create_market_v2` - Initialize a new prediction market with bonding curve parameters
- `buy_on_curve` - Purchase team tokens with USDC, increasing price
- `sell_on_curve` - Sell tokens back for USDC, decreasing price ✨ **NEW**
- `resolve_market` - Declare winner and enable claims (pending)
- `claim_winnings` - Redeem winning tokens for pool share (pending)

### Key Features
- **Linear Bonding Curve**: price = base_price + (slope * supply)
- **Token Burning**: Sold tokens are burned, reducing supply
- **Pool Protection**: Prevents sells that would drain the pool
- **Slippage Protection**: Min output parameters on all trades

## Trading Agents & Testing

Located in `/agents`, these Node.js scripts provide:

### Core Scripts
- `usdc-faucet.js` - Create test USDC tokens
- `create-usdc-market.js` - Deploy new prediction markets
- `test-buy-usdc.js` - Test token purchases
- `test-small-sell.js` - Test token sales
- `debug-sell.js` - Debug bonding curve calculations
- `inspect-market.js` - View market state vs vault balance

### Phase 3: Bot Ecosystem ✨ **NEW**
- `phase3-orchestrator.js` - Complete sports data and bot integration
- `sports/sports-api.js` - NFL game data and odds calculations
- `bots/market-maker-bot.js` - Liquidity provider bots
- `bots/arbitrage-bot.js` - Price efficiency bots
- `bots/momentum-bot.js` - Trend following bots
- `bots/random-retail-bot.js` - Retail trader simulation
- `bots/whale-bot.js` - Large position traders

### Run the ecosystem:
```bash
cd agents
npm run phase3  # Basic simulation (3 markets, 30 bots)
npm run phase3:full  # Full simulation (10 markets, 100+ bots)
```

## Economic Model Insights

### Bonding Curve Parameters (Current)
- **Base Price**: 0.1 USDC per token
- **Slope**: 10,000 (aggressive price increase)
- **Result**: 13x price increase per 100 tokens minted

### Observed Behavior
- Early buyers: 109 tokens for 10 USDC (~0.09 USDC/token)
- Current price: ~1.19 USDC/token at 109 supply
- Pool liquidity: Limits large sells (working as designed)

### Recommendations for Production
1. **Lower Slope**: Reduce to ~1,000 for gentler curves
2. **Higher Base Price**: Start at 1 USDC for more initial liquidity
3. **Liquidity Bootstrapping**: Add initial pool funding

## Development Roadmap (All Local First)

### Phase 1: Core Mechanics ✅
- Smart contract with buy/sell functionality
- Linear bonding curve implementation
- Basic USDC integration
- Token minting and burning

### Phase 2: Comprehensive Testing ✅
- Edge case testing (150+ trades executed)
- Stress testing (46 rapid transactions)
- Economic attack simulations
- Bot ecosystem validation
- 7/8 test cases passing

### Phase 3: Sports Data & Automation 🚧 **IN PROGRESS**
- Mock sports data created (NFL placeholder games)
- Bot simulation framework built (5 types)
- Basic orchestrator created
- ❌ Still needed: Real API integration
- ❌ Still needed: Live data feeds
- ❌ Still needed: UI for markets
- ❌ Still needed: Real bot trading execution

### Phase 4: Mobile & Full Integration 🔜 **NEXT**
- Mobile app connected to local validator
- Real-time market updates
- Complete user flow testing
- Performance optimization

### Phase 5: Market Resolution 🔜
- Oracle integration for game results
- Winner declaration and payouts
- Complete market lifecycle
- Settlement testing

### Phase 6: Production Readiness 🔜
- 1000+ simulated markets
- 10,000+ automated trades
- Complete documentation
- Security audit preparation

### Phase 7: External Deployment (Only When Perfect)
- Devnet deployment
- Community testing
- Mainnet preparation

## Technical Achievements

- **No Overflow Issues**: Switched from exponential to linear curves for Solana compatibility
- **Accurate Pricing**: Integer math handles decimals correctly
- **Pool Safety**: Automatic insolvency protection
- **Gas Efficient**: ~15,785 compute units for sells

## Security Features

- ✅ Checked arithmetic prevents overflows
- ✅ Pool balance verification before payouts
- ✅ Authority controls on market operations
- ✅ Slippage protection on all trades

## Testing Results

### Phase 2: Bot Ecosystem Test (Completed)
```
Total Trades: 150+ successful transactions
Price Range Tested: 0.1 → 4.58 USDC (45.8x increase)
Both Teams Active: Team A (447 tokens), Team B (100 tokens)
Pool Accumulated: 996.72 USDC
Stress Test: 46 trades before wallet limit
```

### Phase 3: Sports & Automation (In Progress)
```
Mock Markets Created: 3 (placeholder NFL games)
Bot Types Created: 5 (simulation only, no real trades)
Simulated Trades: 541+ (logged but not executed)
Real API Integration: NOT COMPLETE
UI Development: NOT STARTED
Real Trading: NOT IMPLEMENTED
```

## Testing & Simulation Requirements (Before Any Deployment)

### Contract Testing Goals
- [ ] 100+ unique test cases
- [ ] All edge cases covered
- [ ] Stress test with 1000+ transactions
- [ ] Economic attack vectors tested
- [ ] Gas optimization verified

### Market Simulation Goals  
- [ ] 100+ markets created and resolved
- [ ] Real sports data integration
- [ ] Automated bot trading (10,000+ trades)
- [ ] Complete lifecycle testing (create → trade → resolve → claim)
- [ ] Performance metrics documented

### Mobile Integration Goals
- [ ] Fully functional with local validator
- [ ] Real-time updates working
- [ ] All user flows tested
- [ ] Performance optimized

## Known Limitations (To Address Locally)

1. **Incomplete Testing**
   - Need comprehensive test coverage before deployment
   - Must test all edge cases and attack vectors

2. **No Sports Data Integration**
   - Need real game schedules and results
   - Must test with realistic market conditions

3. **No Trading Automation**
   - Need bots to simulate real market activity
   - Must test with various trading strategies

4. **Mobile App Not Connected**
   - Currently using mock data
   - Must connect to local validator first

## License

MIT

---

*Last Updated: October 2024 - Full buy/sell functionality confirmed working*
