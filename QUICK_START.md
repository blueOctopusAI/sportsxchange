# Quick Start Guide

## 5-Minute Setup

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

### 3. Test Bonding Curves
```bash
cd agents
npm install
npm run test-bonding

# Output shows early buyer advantage:
# $100 at 0 supply → 10,000 tokens
# $100 at 10k supply → 1 token
```

### 4. Run Trading Interface
```bash
cd agents
npm run trading
# Open http://localhost:3001
```

### 5. Launch Mobile App
```bash
cd sportsxchange-mobile
npm install
npm start
# Press 'w' for web
```

## What You'll See

### Trading Interface (Web)
- Create markets
- Fund accounts with test tokens
- Buy/sell team tokens
- Watch probabilities change

### Mobile App
- Market discovery with 24h price changes
- Bonding curve price charts
- Live trading feed
- Portfolio tracking

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
```

## Troubleshooting

### "Unable to lock test-ledger"
```bash
pkill -9 solana-test-validator
rm -rf test-ledger
solana-test-validator > validator.log 2>&1 &
```

### "Account not initialized (0xbc4)"
The market needs funding first. Click the "Fund" button in the UI.

### Mobile app not updating
Pull down to refresh or restart with `npm start -- -c`

## Next Steps

1. **Experiment with bonding curves** - See how early buying pays off
2. **Create your own markets** - Any teams you want
3. **Test the mobile app** - Try on your actual phone with Expo Go
4. **Review the math** - Check `agents/simulator.js`
