# SportsXchange

**Bonding curve prediction markets for sports betting on Solana** 🏗️ **LOCAL DEVELOPMENT FOCUS**

## Development Philosophy: Local-First

**We build and perfect everything locally before any external deployment.** This means comprehensive testing, real sports data integration, automated trading bots, and complete market lifecycle simulation—all on your local validator. Only when the system is bulletproof locally do we consider testnet.

## What is SportsXchange?

A decentralized sports prediction market that uses bonding curves to create dynamic pricing. Early buyers get exponentially more tokens than late buyers, creating natural price discovery through trading activity.

## ✨ Current Status: Core Mechanics Working Locally

### Completed
- ✅ **Smart Contracts**: Buy/sell functionality working on local validator
- ✅ **Bonding Curves**: Linear pricing model implemented
- ✅ **USDC Integration**: Complete buy/sell cycle with test USDC
- ✅ **Token Management**: Minting, burning, and transfers working
- ✅ **Basic Testing**: Core functionality verified

### In Progress (Local Development)
- 🚧 **Comprehensive Test Suite**: Need extensive edge case testing
- 🚧 **Sports Data Integration**: Real games, real teams, real schedules
- 🚧 **Trading Bot Ecosystem**: Automated market makers, arbitrage bots
- 🚧 **Mobile App Integration**: Connect to local validator
- 🚧 **Market Lifecycle**: Game resolution and winner payouts
- 🚧 **Simulation Framework**: 100s of markets, 1000s of trades

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

### 6. Run Mobile App
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
- `test-small-sell.js` - Test token sales ✨ **NEW**
- `debug-sell.js` - Debug bonding curve calculations ✨ **NEW**
- `inspect-market.js` - View market state vs vault balance ✨ **NEW**

### Run the web trading interface:
```bash
cd agents
npm run trading  # http://localhost:3001
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

### Phase 2: Comprehensive Testing 🚧 **CURRENT FOCUS**
- Edge case testing (zero liquidity, max supply, etc.)
- Stress testing (100s of rapid trades)
- Economic attack simulations
- Performance benchmarking
- Contract upgrade testing

### Phase 3: Real Data & Automation 🔜
- Sports data API integration (real teams, schedules)
- Trading bot development (market makers, arbitrageurs)
- Automated testing framework
- Market lifecycle simulation

### Phase 4: Mobile & Full Integration 🔜
- Mobile app connected to local validator
- Real-time market updates
- Complete user flow testing
- Performance optimization

### Phase 5: Production Readiness 🔜
- 1000+ simulated markets
- 10,000+ automated trades
- Complete documentation
- Security audit preparation

### Phase 6: External Deployment (Only When Perfect)
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

```
Buy Transaction: 10 USDC → 109.09 tokens
Supply Impact: Price rose from 0.1 to 1.19 USDC
Sell Transaction: 8 tokens → 9.2 USDC
Profit: 15% on partial position
Pool Protection: Correctly rejected 50 token sell (insufficient funds)
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
