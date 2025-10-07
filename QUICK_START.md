# SportsXchange Quick Start Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Start Solana Validator
```bash
# IMPORTANT: Run in background (recommended)
solana-test-validator > validator.log 2>&1 &

# Verify it's running
ps aux | grep solana-test-validator
```

### Step 2: Deploy Smart Contracts (if not already deployed)
```bash
# From project root
anchor build
anchor deploy
```

### Step 3: Create Markets (if none exist)
```bash
cd agents
npm run test-simple
```

### Step 4: Start Trading Interface
```bash
cd agents
npm run trading
```

Open browser to: **http://localhost:3001**

### Step 5: Trade!
1. Click the pulsing **Fund** button to get test tokens
2. Enter amount and click **Buy KC** or **Buy BAL** to trade
3. Watch probabilities update in real-time

---

## 🛠️ Validator Management

### Starting the Validator

**Option 1: Background (Recommended)**
```bash
solana-test-validator > validator.log 2>&1 &
```

**Option 2: Foreground**
```bash
solana-test-validator
# Use Ctrl+C to stop (NOT Ctrl+Z!)
```

### Stopping the Validator

```bash
# If running in background
pkill solana-test-validator

# If in foreground
# Press Ctrl+C (NOT Ctrl+Z!)
```

### Check Validator Status
```bash
# See if running
ps aux | grep solana-test-validator

# Check cluster
solana cluster-version

# View logs (if background)
tail -f validator.log
```

---

## 🔧 Common Issues & Fixes

### "Unable to lock test-ledger directory"

**Problem**: Validator already running or suspended

**Fix**:
```bash
# Step 1: Try to recover suspended process
fg
# Press Ctrl+C

# Step 2: If that fails, kill all validators
pkill -9 solana-test-validator

# Step 3: Clean up
rm -rf test-ledger

# Step 4: Start fresh
solana-test-validator > validator.log 2>&1 &
```

### "Transaction simulation failed: Error processing Instruction 0"

**Problem**: Token accounts don't exist

**Fix**: Click the **Fund** button first (it will be pulsing green)

### "Market not found"

**Problem**: No markets created yet

**Fix**:
```bash
cd agents
npm run test-simple
```

### "Insufficient SOL for transaction"

**Problem**: Wallet needs SOL for fees

**Fix**:
```bash
solana airdrop 2
```

---

## 📝 Available Scripts

### Market Management
```bash
npm run test-simple     # Create 4 test markets
npm run scheduler       # Auto-create markets for games
npm start              # Start monitoring dashboard
```

### Trading
```bash
npm run trading        # Start web interface (port 3001)
npm run test-trading   # Run automated trading test
```

### CLI Trading
```bash
# Fund account
npm run cli fund <MARKET_PDA> 100 100

# Check balance
npm run cli balance <MARKET_PDA>

# Make trades
npm run cli buy-home <MARKET_PDA> 10
npm run cli buy-away <MARKET_PDA> 10
```

---

## 🎯 Trading Interface Features

### Visual Indicators
- **Pulsing Green Button**: Fund button pulses until account is funded
- **Green Values**: HOME token probabilities
- **Blue Values**: AWAY token probabilities
- **Auto-refresh**: Balances update every 10 seconds

### How AMM Pricing Works
- Initial pool: 1000/1000 (50%/50% probability)
- Buying HOME: Increases HOME price, decreases AWAY price
- Constant product formula: x * y = k
- ~1% slippage on 10 token trades

---

## 🔒 Important Notes

### Validator Tips
- **NEVER** use Ctrl+Z (suspends process, keeps lock)
- **ALWAYS** use Ctrl+C to stop cleanly
- Run in background for better workflow
- Check `validator.log` for issues

### Trading Tips
- Fund first (100 tokens each recommended)
- Start with small trades (10 tokens)
- Watch probability changes
- Each market is independent

---

## 📊 Market PDAs (for CLI)

```
KC vs BAL:  HVoN6gYHdxeixkyBBtTNchu4x6MwsL9UNoY1fAiZrsTA
DET vs HOU: AV5tb52EJgVh7eLEcDcmu4GYdXuAJBpBcyyNEbYHw9Zm
SF vs DAL:  9tt9xoeZ4iyGH1hX7ntVamvE1ktD614T55bHnYqw3Rhw
GB vs CHI:  8JHVdcX52BiRgCx3YAZPGAt5LDyBXGqC8523413XYb7M
```

---

## 🆘 Need Help?

1. Check validator is running: `ps aux | grep solana`
2. Check logs: `tail -f validator.log`
3. Restart everything:
```bash
pkill solana-test-validator
rm -rf test-ledger
solana-test-validator > validator.log 2>&1 &
cd agents && npm run trading
```

---

## 🎉 Success Checklist

✅ Validator running in background  
✅ Markets created (4 test markets)  
✅ Trading interface at http://localhost:3001  
✅ Fund button clicked (stopped pulsing)  
✅ First trade completed  

**You're ready to trade!** 🚀
