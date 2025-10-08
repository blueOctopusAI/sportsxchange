# Phase 3: Sports Data & Automation 🏈🤖

## Overview

Phase 3 integrates real sports data with an automated trading bot ecosystem to simulate realistic market conditions on the SportsXchange platform. All testing happens locally first!

## ✅ What's Included

### 1. Sports Data Integration (`sports/sports-api.js`)
- Mock NFL game schedules (ready for SportsDataIO integration)
- Real-time game simulation
- Betting odds and fair value calculations
- Live game updates streaming

### 2. Advanced Bot Ecosystem (`bots/`)
- **Market Maker Bots**: Provide liquidity with configurable spreads
- **Arbitrage Bots**: Exploit pricing inefficiencies
- **Momentum Bots**: Follow and amplify trends
- **Retail Bots**: Simulate unpredictable retail behavior
- **Whale Bots**: Large position traders with various strategies

### 3. Phase 3 Orchestrator (`phase3-orchestrator.js`)
- Combines sports data with bot ecosystem
- Creates markets from real game schedules
- Deploys appropriate bots per market
- Tracks comprehensive metrics
- Simulates live game events

## 🚀 Quick Start

### Prerequisites
1. Local validator running:
```bash
solana-test-validator
```

2. Program deployed:
```bash
cd ..
anchor build && anchor deploy
```

3. Test environment setup:
```bash
cd agents
npm install
```

### Run Phase 3

#### Simple Test (3 markets, 30 bots):
```bash
npm run phase3
```

#### Full Simulation (10 markets, 100+ bots):
```bash
npm run phase3:full
```

#### Step-by-Step Testing:
```bash
# 1. Create a test market
npm run create-market

# 2. Test basic trading
npm run test-buy
npm run test-sell

# 3. Run mini bot ecosystem
npm run bots:mini

# 4. Full Phase 3
npm run phase3
```

## 📊 Metrics Tracked

### Market Metrics
- Total markets created
- Markets from real sports data
- Price discovery efficiency
- Liquidity depth

### Bot Performance
- Trades per bot type
- Success/error rates
- Profit/loss tracking
- Strategy effectiveness

### System Performance
- Transactions per second
- Total trade volume
- Error rates
- Runtime statistics

## 🤖 Bot Configuration

### Market Maker
```javascript
{
  spreadPercent: 0.02,      // 2% spread
  maxPositionUSDC: 200,     // Max $200 per side
  rebalanceThreshold: 0.7   // Rebalance at 70% exposure
}
```

### Arbitrage Bot
```javascript
{
  minProfitPercent: 0.001,  // 0.1% minimum
  maxPositionSize: 500,     // Max $500 per arb
  aggressiveness: 0.8       // Use 80% of opportunity
}
```

### Momentum Bot
```javascript
{
  lookbackPeriod: 10,       // Last 10 prices
  momentumThreshold: 0.05,  // 5% trend triggers
  multiplier: 2            // 2x on strong trends
}
```

### Whale Bot
```javascript
{
  minTradeSize: 200,        // Min $200
  maxTradeSize: 1000,       // Max $1000
  frequency: 0.05,          // 5% chance per tick
  strategy: 'value'         // value/pump/dump/manipulate
}
```

## 📈 Expected Results

After running Phase 3 for ~10 minutes:
- 3-5 markets created from sports data
- 30-50 bots actively trading
- 100+ simulated trades
- Price discovery emerging
- Market inefficiencies arbitraged
- Realistic trading patterns

## 🔧 Customization

### Adjust Simulation Speed
```javascript
// In phase3-orchestrator.js
const orchestrator = new Phase3Orchestrator({
  tickInterval: 1000,  // 1 second (faster)
  // or
  tickInterval: 10000  // 10 seconds (slower)
});
```

### Add More Markets
```javascript
{
  maxMarkets: 10,  // Create up to 10 markets
  botsPerMarket: 15  // 15 bots per market
}
```

### Custom Bot Mix
Edit `initializeBots()` in phase3-orchestrator.js to adjust bot ratios

## 📝 Logs and Output

- Real-time console output shows all activity
- Metrics summary every 5 ticks
- Final report with comprehensive statistics
- Bot performance breakdown by type

## ⚠️ Important Notes

1. **This is a simulation** - Trades are logged but not executed on-chain yet
2. **Local only** - All testing on local validator
3. **No real money** - Using test USDC
4. **Ready for real trades** - Structure supports actual blockchain integration

## 🎯 Success Criteria

Phase 3 is successful when:
- ✅ Sports data creates realistic markets
- ✅ Bots exhibit diverse trading strategies
- ✅ Price discovery occurs naturally
- ✅ System handles 100+ trades without errors
- ✅ Metrics show healthy market activity

## 🚧 Next Steps

After Phase 3 succeeds:
1. **Enable real blockchain trades** - Connect bot transactions
2. **Add more sports** - NBA, Soccer, etc.
3. **Implement game resolution** - Settle markets when games end
4. **Mobile integration** - Connect app to live markets
5. **Advanced analytics** - Track bot profitability

## 🐛 Troubleshooting

### "Cannot connect to validator"
```bash
# Make sure validator is running
solana-test-validator
```

### "Market not found"
```bash
# Create a test market first
npm run create-market
```

### "No IDL found"
```bash
# Build and deploy program
cd ..
anchor build && anchor deploy
```

### Bots not trading
- Check wallet has SOL: `solana balance`
- Verify program deployed: `anchor show`
- Check market exists: `node inspect-market.js`

## 📊 Sample Output

```
🚀 Initializing Phase 3 Orchestrator
==================================================
✅ Connected to validator: { 'solana-core': '1.18.0' }
✅ Wallet loaded: 6Xk3...fR2
✅ Initialization complete

📅 Fetching upcoming games...
Found 4 upcoming games

Creating market for: Kansas City Chiefs @ Buffalo Bills
  ✅ Market created: 7fGH9k2...
  Fair probabilities - Home: 52.3%, Away: 47.7%

🤖 Initializing bot ecosystem...

Creating bots for Buffalo Bills vs Kansas City Chiefs:
  Added MM-market_NFL_2024_W10_KC_BUF-0
  Added MM-market_NFL_2024_W10_KC_BUF-1
  Added ARB-market_NFL_2024_W10_KC_BUF
  Added MOM-market_NFL_2024_W10_KC_BUF-0
  Added RETAIL-market_NFL_2024_W10_KC_BUF-0
  Added WHALE-market_NFL_2024_W10_KC_BUF (pump strategy)

✅ Initialized 30 bots across 3 markets

🏁 Starting simulation...
Press Ctrl+C to stop

📊 Tick 1 - 3:45:22 PM
----------------------------------------
[MM-0] Providing liquidity for Team A at 0.1000 USDC
[ARB-0] Total probability: 0.9523
[MOM-0] Building price history...
[RETAIL-0] Buying 15.43 USDC of Team B at 0.1000 USDC
[WHALE-0] PUMP: Driving up Team A price
```

---

**Phase 3 is ready to run! This provides the realistic market simulation needed before moving to production.**
