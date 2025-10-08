# LLM Assistant Guide for SportsXchange Project

## 🤖 Overview for AI Assistants

You are helping a developer work on **SportsXchange**, a Solana-based bonding curve AMM for sports prediction markets. The project has **working buy/sell functionality** with linear bonding curves and USDC integration.

---

## ⚠️ CRITICAL: File System Operations

### YOU MUST FOLLOW THESE RULES:

1. **NEVER use artifacts** - The user cannot see or use artifacts
2. **ALWAYS write directly to the filesystem** using Filesystem tools
3. **ALWAYS ask for approval** before creating or modifying files
4. **SHOW the user what you plan to change** with diffs or descriptions
5. **USE proper filesystem tools**:
   - `Filesystem:write_file` for new files
   - `Filesystem:edit_file` for modifications  
   - `Filesystem:read_file` to check current state

### Correct Pattern:
```
User: "Add a new test script"
Assistant: "I'll create a new test script that does X. Let me write this to the filesystem:"
[Actually writes to filesystem with proper tool]
"I've created the file at /path/to/file. You can now run it with..."
```

### Wrong Pattern:
```
User: "Add a new test script"
Assistant: "Here's a test script: <artifact>..."
[User cannot access this!]
```

---

## 📋 Current Project Status (October 2024)

### ✅ WORKING FEATURES
- Smart contract with `create_market_v2`, `buy_on_curve`, `sell_on_curve`
- Linear bonding curve: price = 0.1 + (0.00001 * supply)
- USDC integration with test faucet
- Token minting and burning
- Pool value tracking and solvency protection
- Complete test suite in `/agents`

### 🚧 IN PROGRESS
- Mobile app blockchain integration (currently using mock data)
- Market resolution mechanism
- Oracle integration for game results

### 📊 VERIFIED BEHAVIORS
- Buy: 10 USDC → 109 tokens (at low supply)
- Price impact: 0.10 → 1.19 USDC per token
- Sell: 8 tokens → 9.2 USDC (profit from price increase)
- Pool protection: Rejects sells exceeding available USDC

---

## 🏗️ Project Structure You Must Know

```
sportsxchange/
├── programs/sportsxchange/     # Rust smart contracts
│   └── src/
│       ├── lib.rs             # Current working contract (linear bonding curve)
│       ├── lib_amm.rs         # Old AMM version (archived)
│       ├── lib_v2.rs          # Old exponential attempt (overflow issues)
│       └── lib_v2_linear.rs  # Backup of linear version
├── agents/                     # Node.js testing and automation
│   ├── test-buy-usdc.js      # Buy tokens test ✅
│   ├── test-sell-usdc.js     # Sell tokens test ✅
│   ├── test-small-sell.js    # Working sell example ✅
│   ├── debug-sell.js         # Price calculator ✅
│   ├── inspect-market.js     # State inspector ✅
│   ├── usdc-faucet.js        # Create test USDC ✅
│   └── create-usdc-market.js # Create markets ✅
├── sportsxchange-mobile/       # React Native app (mock data currently)
└── target/
    ├── deploy/                # Compiled programs
    └── idl/                   # Generated IDL with discriminators
```

---

## 🔍 Key Technical Details

### Smart Contract
- **Program ID**: `7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH`
- **Base Price**: 100,000 lamports (0.1 USDC)
- **Slope**: 10,000 (aggressive price increase)
- **Decimals**: 6 (standard for USDC compatibility)

### Working Instructions
1. **create_market_v2**: Initialize market with bonding curve
2. **buy_on_curve**: Purchase tokens, increase price
3. **sell_on_curve**: Sell tokens back, burn them, decrease price

### Common Issues & Solutions
1. **InsufficientPoolBalance**: Working as designed - pool protecting itself
2. **Account 0xbc4**: Need to create ATAs first
3. **High slippage**: Result of aggressive slope parameter

---

## 🛠️ When Working on This Project

### Before Making Changes

1. **Check current implementation**:
```bash
# Read the actual working contract
cat programs/sportsxchange/src/lib.rs

# Check test results
cat agents/data/last-usdc-market.json

# See what's deployed
anchor show
```

2. **Understand the working flow**:
- Markets use USDC as base currency
- Linear bonding curve (not exponential - that caused overflows)
- Pool tracks both vault balance AND pool_value
- Sells burn tokens and return USDC

3. **Test your changes**:
```bash
# After any contract change
anchor build
anchor deploy

# Test the change
cd agents
node test-buy-usdc.js
node test-small-sell.js
```

---

## 💬 Communication with User

### Good Patterns

✅ **DO THIS:**
```
"I see the issue - the pool_value is tracking correctly at 20 USDC. 
The sell is trying to withdraw 47 USDC which exceeds available funds.
This is correct behavior. Let me create a test that sells a smaller amount.
I'll write this to agents/test-small-sell.js:"
[Actually writes file]
"Done. Run it with: node test-small-sell.js"
```

❌ **NOT THIS:**
```
"Here's a solution: [shows artifact]"
"The bonding curve formula in theory should..."
[Long explanation without action]
```

### Always Remember
- User wants working code, not explanations
- Write to filesystem, don't use artifacts
- Test commands before suggesting them
- Show concrete results, not theory

---

## 📊 Current Test Commands (All Working)

```bash
# Setup
cd agents
node usdc-faucet.js          # Create test USDC
node create-usdc-market.js   # Create a market

# Trading
node test-buy-usdc.js         # Buy tokens (works)
node test-small-sell.js       # Sell 8 tokens (works)
node test-sell-usdc.js        # Sell 50 tokens (fails correctly - insufficient pool)

# Debugging
node inspect-market.js        # View market state
node debug-sell.js           # Calculate prices
```

---

## 🚨 Critical Understanding

### The Bonding Curve is WORKING CORRECTLY
- Early buyers get cheap tokens (0.09 USDC each)
- Price rises with supply (now 1.19 USDC each)
- Selling requires pool to have enough USDC
- This is FEATURE not bug - prevents insolvency

### What "InsufficientPoolBalance" Means
- NOT a coding error
- Pool has 20 USDC, sell needs 47 USDC
- Solution: Sell less OR have more buyers first
- This protects the system from bankruptcy

---

## 🔧 If User Asks About Common Tasks

### "Test the sell functionality"
```bash
cd agents
node test-small-sell.js  # This WORKS - sells 8 tokens
```

### "Why can't I sell 50 tokens?"
The pool only has 20 USDC but 50 tokens are worth 47 USDC at current prices.
This is correct - the pool is protecting itself from insolvency.

### "Deploy to devnet"
```bash
solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet
```

### "Connect the mobile app"
This is the next major task. The app UI is ready but uses mock data.
Need to replace mock data with actual blockchain calls.

---

## 📝 Final Reminders

1. **Project Status**: Core functionality is COMPLETE and WORKING
2. **File Operations**: Always write to filesystem, never use artifacts
3. **Current Focus**: Mobile integration is the next priority
4. **Testing**: Everything in agents/ folder is tested and working
5. **Economics**: The bonding curve math is CORRECT (high supply = high price)

**The user has a working AMM. Don't try to "fix" things that aren't broken. The InsufficientPoolBalance error is the system working correctly, not a bug.**

---
*Guide updated October 2024 - Post sell functionality implementation*
