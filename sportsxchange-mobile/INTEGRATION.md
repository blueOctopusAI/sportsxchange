# Testing Mobile App with Bonding Curve Contracts

## Setup Instructions

### 1. Install Dependencies
```bash
cd sportsxchange-mobile
npm install
```

### 2. Start Local Solana Validator
In a separate terminal:
```bash
solana-test-validator
```

### 3. Deploy Smart Contracts (if not already deployed)
In the project root:
```bash
cd /Users/jashanno/Developer/projects/sportsxchange
anchor deploy
```

### 4. Create a Test Market
Run the bonding curve test to create a market:
```bash
cd agents
node test-bonding-curve.js
```

This will create a market and save the details to `data/last-bonding-market.json`

### 5. Update Mobile App Configuration
Edit `sportsxchange-mobile/config/markets.ts` and add your new market:
```typescript
MARKETS: [
  {
    marketPda: 'YOUR_MARKET_PDA',
    gameId: 'YOUR_GAME_ID',
    teamA: 'TEAM_A',
    teamB: 'TEAM_B',
    usdcMint: 'YOUR_USDC_MINT',
  },
]
```

### 6. Test Connection
```bash
cd sportsxchange-mobile
node scripts/test-connection.js
```

### 7. Run the Mobile App
```bash
npm start

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web browser
```

## What's Connected

✅ **SportsXchangeClient.ts** - Updated to work with bonding curve
- `buyOnCurve()` - Buy tokens with USDC
- `sellOnCurve()` - Sell tokens for USDC
- `getMarketData()` - Fetch market info from blockchain
- `calculateTokensOut()` - Linear bonding curve math
- `getUserBalances()` - Check token balances

✅ **Hooks** - React hooks for easy integration
- `useMarkets()` - Fetch and track markets
- `useTrading()` - Execute buy/sell transactions

✅ **Config** - Centralized configuration
- Program ID
- RPC endpoint
- Known markets
- Bonding curve parameters

## Testing Transactions

1. **Connect Wallet** (currently mock, needs mobile wallet adapter)
2. **Select a Market** (KC vs BAL or your created market)
3. **Click TRADE**
4. **Enter USDC amount**
5. **Click BUY NOW**

The transaction will be sent to your local validator!

## Current Limitations

- **Wallet Connection**: Currently using mock wallet. Need to integrate:
  - Phantom Mobile SDK
  - Solflare Mobile Adapter
  - Or Mobile Wallet Adapter protocol

- **USDC Funding**: Need to mint test USDC to user wallets for testing

- **Market Discovery**: Currently using hardcoded market list. In production, use:
  - On-chain market registry
  - Indexer service (Helius, etc.)
  - GraphQL API

## Next Steps

1. **Add Mobile Wallet Adapter**:
```bash
npm install @solana-mobile/mobile-wallet-adapter-protocol
```

2. **Create Test USDC Faucet** for easy testing

3. **Add Transaction History** tracking

4. **Implement Push Notifications** for game results

5. **Add Market Resolution UI** for claiming winnings
