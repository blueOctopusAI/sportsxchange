# Quick Start Guide

## 5-Minute Setup for Complete Trading

### 1. Start Solana Validator
```bash
# Run in background (recommended)
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
# Follow prompts to mint test USDC
```

### 4. Create a Market
```bash
node create-usdc-market.js
# Creates a new sports prediction market
```

### 5. Test Complete Trading Cycle
```bash
# Buy tokens with USDC
node test-buy-usdc.js

# Check market state
node inspect-market.js

# Sell tokens back for USDC
node test-small-sell.js

# Debug pricing calculations
node debug-sell.js
```

### 6. Launch Mobile App (Optional)
```bash
cd sportsxchange-mobile
npm install
npm start
# Press 'w' for web
```

## What You'll See

### Successful Buy
```
💰 Buying 100 Team A tokens for 10 USDC...
✅ Buy successful!
   Tokens received: 109.090909
   New supply: 109.090909
   New price: ~1.19 USDC per token
```

### Successful Sell
```
🎯 Selling 8 Team A tokens...
✅ Sell successful!
   USDC received: 9.2
   Tokens burned: 8
   New supply: 101.090909
```

### Market Inspection
```
📊 Market State:
   Team A supply: 109.090909 tokens
   Pool value: 20 USDC
   Current price: 1.19 USDC per token
✅ Vault and pool_value match!
```

## Common Commands

```bash
# Check validator status
ps aux | grep solana

# View logs
tail -f validator.log

# Stop validator
pkill solana-test-validator

# Reset everything
pkill solana-test-validator
rm -rf test-ledger
solana-test-validator > validator.log 2>&1 &

# Rebuild after contract changes
anchor build && anchor deploy
```

## Understanding the Bonding Curve

### Price Progression Example
| Action | Supply | Price | Total Pool |
|--------|--------|-------|------------|
| Initial | 0 | 0.10 USDC | 0 USDC |
| Buy 10 USDC | 109 tokens | 1.19 USDC | 10 USDC |
| Buy 10 USDC more | 117 tokens | 1.27 USDC | 20 USDC |
| Sell 8 tokens | 109 tokens | 1.19 USDC | 10.8 USDC |

### Key Insights
- **Early Advantage**: First buyers get 10x more tokens
- **Price Discovery**: Market finds fair value through trading
- **Pool Protection**: Can't sell more than pool contains
- **Token Burns**: Selling reduces supply permanently

## Troubleshooting

### "InsufficientPoolBalance" when selling
This is correct behavior! The pool is protecting itself. Try:
- Selling fewer tokens
- Having more buyers add liquidity first
- Creating a new market with different parameters

### "Account not initialized (0xbc4)"
Token accounts need creation first:
```bash
# This is handled automatically in test scripts
# Manual fix: Create associated token accounts
```

### Mobile app not updating
The mobile app currently uses mock data. Blockchain integration coming soon.

## Testing Different Scenarios

### Test Small Market (Low Liquidity)
```bash
# Create market, buy small amount
node create-usdc-market.js
# Edit test-buy-usdc.js to buy only 1 USDC worth
node test-buy-usdc.js
node test-small-sell.js
```

### Test Large Market (High Liquidity)
```bash
# Multiple buyers adding liquidity
node test-buy-usdc.js  # Run multiple times
node inspect-market.js  # Check pool value
node test-sell-usdc.js  # Now larger sells work
```

### Test Price Impact
```bash
node debug-sell.js
# Shows exact calculations for different amounts
```

## Next Steps

1. **Experiment with parameters** - Try different base_price and slope values
2. **Test edge cases** - What happens at very high supplies?
3. **Build strategies** - When to buy, when to sell
4. **Mobile integration** - Connect the app to real data

## Success Checklist

- [x] Validator running
- [x] Contracts deployed
- [x] USDC minted
- [x] Market created
- [x] Tokens bought
- [x] Tokens sold
- [x] Bonding curve verified
- [ ] Mobile app connected (pending)
- [ ] Deployed to devnet (ready when you are)

---

*Quick Start updated with complete buy/sell functionality - October 2024*
