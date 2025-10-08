# Simulation Guide for SportsXchange

## Overview

This guide explains how to run comprehensive market simulations locally to test the SportsXchange platform before any external deployment.

## Simulation Goals

Before considering deployment, we must achieve:
- ✅ 100+ markets created and resolved
- ✅ 10,000+ automated trades executed  
- ✅ Complete lifecycle testing (create → trade → halt → resolve → claim)
- ✅ Realistic trading patterns via bots
- ✅ Edge case coverage
- ✅ Performance metrics documented

## Market Lifecycle Simulation

### 1. Pre-Game Phase (T-24h to T-0)
```javascript
// Create market 24 hours before game
const market = await createMarket({
  gameId: "NFL_2024_W10_KC_BUF",
  teamA: "Kansas City Chiefs",
  teamB: "Buffalo Bills",
  gameTime: Date.now() + 24 * 60 * 60 * 1000,
  basePrice: 100000,  // 0.1 USDC
  slope: 10000
});

// Simulate trading activity
await simulatePreGameTrading(market, {
  duration: 24 * 60 * 60 * 1000,  // 24 hours
  traders: 100,                    // Number of bots
  volumeRange: [1, 100],           // USDC per trade
  frequency: "exponential"         // More activity closer to game
});
```

### 2. Game Time (T-0)
```javascript
// Halt trading when game starts
await haltTrading(market.address);

// Verify no trades possible
await expectRevert(
  buyTokens(market, 10),
  "TradingHalted"
);
```

### 3. Post-Game Resolution
```javascript
// Simulate game result
const result = simulateGameOutcome({
  teamA_win_probability: 0.55,
  teamB_win_probability: 0.45
});

// Resolve market
await resolveMarket(market.address, result.winner);

// Process claims
await processClaims(market);
```

## Trading Bot Types

### Market Maker Bot
Provides liquidity by placing orders on both sides:
```javascript
class MarketMakerBot {
  async run(market) {
    // Buy when price below fair value
    if (currentPrice < fairValue * 0.98) {
      await buy(market, amount);
    }
    
    // Sell when price above fair value
    if (currentPrice > fairValue * 1.02) {
      await sell(market, amount);
    }
  }
}
```

### Momentum Bot
Follows price trends:
```javascript
class MomentumBot {
  async run(market) {
    const trend = calculateTrend(market.priceHistory);
    
    if (trend > 0.05) {  // 5% upward trend
      await buy(market, amount * 2);
    } else if (trend < -0.05) {
      await sell(market, amount * 2);
    }
  }
}
```

### Arbitrage Bot
Exploits price differences between teams:
```javascript
class ArbitrageBot {
  async run(market) {
    const totalProbability = 
      market.teamA.impliedProbability + 
      market.teamB.impliedProbability;
    
    if (totalProbability < 0.98) {
      // Buy both for guaranteed profit
      await buyBoth(market);
    }
  }
}
```

### Retail Simulator Bot
Random trading to simulate retail behavior:
```javascript
class RetailBot {
  async run(market) {
    const action = Math.random();
    
    if (action < 0.4) {
      // 40% chance to buy
      const team = Math.random() < 0.5 ? 'A' : 'B';
      const amount = randomRange(1, 20);
      await buy(market, team, amount);
    } else if (action < 0.5) {
      // 10% chance to sell
      await sell(market, team, amount);
    }
    // 50% do nothing
  }
}
```

### Whale Bot
Large position traders:
```javascript
class WhaleBot {
  async run(market) {
    // Only trade on high conviction
    if (Math.random() < 0.05) {  // 5% chance
      const amount = randomRange(500, 2000);
      await buy(market, favoriteTeam, amount);
    }
  }
}
```

## Running Simulations

### Basic Simulation
```bash
cd agents
node simulation/run-basic.js --markets 10 --trades 1000
```

### Stress Test
```bash
node simulation/stress-test.js --markets 100 --concurrent 20
```

### Edge Case Testing
```bash
node simulation/edge-cases.js
# Tests: zero liquidity, max supply, rapid trades, etc.
```

### Full Ecosystem Simulation
```bash
node simulation/full-ecosystem.js \
  --markets 100 \
  --bots 50 \
  --duration 7d \
  --sports-api real
```

## Metrics to Track

### Market Metrics
- Total markets created
- Markets resolved successfully
- Average pool size
- Price discovery efficiency

### Trading Metrics  
- Total trades executed
- Average trade size
- Slippage statistics
- Gas costs per trade

### Bot Performance
- Profit/loss per bot type
- Market maker spread capture
- Arbitrage opportunities found
- Retail behavior patterns

### System Performance
- Transactions per second
- Memory usage
- Compute unit consumption
- Error rates

## Test Scenarios

### Scenario 1: NFL Sunday
- 16 concurrent games
- 1000 traders per game
- High volume period
- Test system under load

### Scenario 2: World Cup Final
- Single high-stakes game
- 10,000+ traders
- Massive liquidity
- Price discovery test

### Scenario 3: Market Manipulation
- Whale attempts pump & dump
- Bots defend against manipulation
- Test economic security

### Scenario 4: Technical Issues
- Validator restarts mid-trading
- Network congestion simulation
- Failed transaction handling

## Success Criteria

Before moving to testnet, achieve:

### Reliability
- [ ] 99.9% transaction success rate
- [ ] Zero fund loss incidents
- [ ] All edge cases handled gracefully

### Performance  
- [ ] Handle 100 TPS sustained
- [ ] Sub-second confirmation times
- [ ] Gas costs < $0.01 per trade

### Economics
- [ ] Efficient price discovery
- [ ] Adequate liquidity in all markets
- [ ] No exploitable arbitrage

### User Experience
- [ ] Mobile app fully functional
- [ ] Real-time updates working
- [ ] Intuitive trading flow

## Simulation Scripts Structure

```
agents/simulation/
├── bots/
│   ├── market-maker.js
│   ├── arbitrage.js
│   ├── momentum.js
│   ├── retail.js
│   └── whale.js
├── scenarios/
│   ├── nfl-sunday.js
│   ├── world-cup.js
│   ├── manipulation.js
│   └── technical-issues.js
├── utils/
│   ├── sports-data.js
│   ├── metrics.js
│   └── reporting.js
└── run-simulation.js
```

## Next Steps

1. **Build simulation framework** - Create the bot ecosystem
2. **Integrate sports data** - Use real schedules and outcomes
3. **Run initial tests** - Start with 10 markets, 100 trades
4. **Scale up** - Gradually increase to 100 markets, 10,000 trades
5. **Document results** - Track all metrics and issues
6. **Iterate** - Fix issues and re-run until perfect

---

*Remember: No external deployment until all simulations pass successfully on local validator*
