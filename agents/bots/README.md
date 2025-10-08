# SportsXchange Bot Ecosystem

## Overview

A mini trading bot ecosystem for testing the SportsXchange bonding curve AMM locally. This system simulates realistic market activity with different bot strategies to validate the economic model before deployment.

## Bot Types

### 1. Market Maker Bot
- **Purpose**: Provide liquidity and tighten spreads
- **Strategy**: Places orders on both sides, maintains balanced positions
- **Config**: 2% spread, max 50-100 USDC exposure per side

### 2. Random Retail Bot  
- **Purpose**: Simulate unpredictable retail trader behavior
- **Strategy**: Random buys/sells with emotional decisions (FOMO, panic)
- **Config**: 1-25 USDC trades, 30-40% activity rate

### 3. Momentum Bot
- **Purpose**: Follow and amplify price trends
- **Strategy**: Buys on upward momentum, sells on downward
- **Config**: 2% threshold, 1.5x multiplier on strong trends

### 4. Arbitrage Bot
- **Purpose**: Keep prices efficient between teams
- **Strategy**: Exploits pricing inefficiencies when total probability ≠ 100%
- **Config**: 1% minimum profit threshold

### 5. Whale Bot
- **Purpose**: Make large trades that impact the market
- **Strategy**: Value investing, momentum following, or pump/dump
- **Config**: 50-500 USDC trades, 5-8% activity rate

## Quick Start

### 1. Setup Environment
```bash
cd agents
npm install

# Make sure you have a market created
node create-usdc-market.js
```

### 2. Run Mini Ecosystem (Quick Test)
```bash
# Run 10 bots for ~3 minutes
npm run bots:mini
```

### 3. Run Full Test Suite
```bash
# Test all bot logic
npm run test:bots

# Then run ecosystem
npm run bots
```

### 4. Custom Configuration
```javascript
// Edit run-mini-ecosystem.js to customize:
const orchestrator = new BotOrchestrator({
    tickInterval: 2000,      // Speed of trading
    maxTicks: 100,          // Duration
    logInterval: 10,        // Reporting frequency
});

// Add more bots
orchestrator.addBot(WhaleBot, {
    minTradeSize: 200,      // Bigger whale
    strategy: 'pump'        // Aggressive strategy
}, 2);  // Add 2 whales
```

## Metrics & Monitoring

The system tracks:
- **Trade Metrics**: Total trades, success rate, volume
- **Bot Performance**: Individual P&L, errors, opportunities
- **Market Impact**: Price movements, liquidity changes
- **System Health**: TPS, gas usage, error rates

Metrics are saved to `agents/bot-metrics/` after each run.

## Test Coverage

Each bot type has tests for:
- ✅ Initialization and configuration
- ✅ Strategy execution logic
- ✅ Position management
- ✅ Error handling
- ✅ Metric tracking
- ✅ Edge cases (zero liquidity, max supply)

Run tests:
```bash
npm run test:bots
```

## Configuration Options

### Orchestrator Settings
```javascript
{
    tickInterval: 2000,      // Ms between trading rounds
    maxTicks: 100,          // Total rounds to run
    logInterval: 10,        // Rounds between summaries
    saveMetrics: true,      // Save results to file
}
```

### Bot Configurations

#### Market Maker
```javascript
{
    spreadPercent: 0.02,     // Bid-ask spread
    maxPositionUSDC: 100,    // Max exposure per side
    minTradeSize: 5,         // Min trade size
    maxTradeSize: 20,        // Max trade size
}
```

#### Random Retail
```javascript
{
    tradeFrequency: 0.3,     // Chance to trade each round
    sellProbability: 0.2,    // Chance to sell vs buy
    favoriteTeam: 'A',       // Bias towards team
    panicSellThreshold: 0.8, // Sell if down 20%
}
```

#### Momentum
```javascript
{
    lookbackPeriod: 10,      // Ticks to analyze
    momentumThreshold: 0.03, // 3% move triggers
    tradeMultiplier: 1.5,    // Size multiplier
    stopLossPercent: 0.1,    // 10% stop loss
}
```

## Expected Results

After running the mini ecosystem:

### Typical Metrics (100 ticks)
- **Total Trades**: 150-300
- **Success Rate**: 95-99%
- **Total Volume**: 500-2000 USDC
- **Price Impact**: ±10-30% from start

### Bot Behaviors
- Market makers maintain 2-5% spreads
- Retail bots create noise and volatility
- Momentum bots amplify trends
- Arbitrage keeps prices rational
- Whales create significant moves

## Next Steps

1. **Run Initial Test**: Verify basic functionality
2. **Tune Parameters**: Adjust bot configs for realistic behavior
3. **Scale Up**: Add more bots, longer duration
4. **Add Sports Data**: Integrate real game schedules
5. **Full Simulation**: 100+ markets, 10,000+ trades

## Troubleshooting

### "No market found"
```bash
# Create a market first
node create-usdc-market.js
```

### "Insufficient funds"
```bash
# Fund bot wallets
node usdc-faucet.js
# Transfer to bot addresses shown in logs
```

### High failure rate
- Check pool liquidity
- Reduce trade sizes
- Adjust slippage tolerance

### Performance issues
- Increase tickInterval (slower trading)
- Reduce bot count
- Check validator performance

---

**Remember**: This is for LOCAL TESTING ONLY. Do not deploy bots to mainnet without extensive testing and security review.
