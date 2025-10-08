# SportsXchange Mobile App

## Tech Stack
- **React Native** with Expo
- **TypeScript** for type safety
- **Solana Web3.js** for blockchain interaction
- **SPL Token** for token operations

## Current Features

### ✅ Completed UI
1. **Market Listing**
   - Hot markets display
   - Real-time price changes
   - Pool values and 24h volume
   - User positions tracking

2. **Trading Interface**
   - Buy/Sell modal
   - Team selection (A vs B)
   - USDC amount input
   - Expected tokens calculation
   - Transaction processing

3. **Price Visualization**
   - Live price charts
   - Recent trades feed
   - Price change indicators

4. **Wallet Integration**
   - Connect wallet button
   - Balance display
   - Address truncation

### 🔄 In Progress
- Connecting to actual Solana network
- Real blockchain transactions
- Live data from smart contracts

## Running the App

```bash
cd sportsxchange-mobile
npm install
npm start

# For iOS
npm run ios

# For Android  
npm run android

# For Web
npm run web
```

## Client Integration

The `SportsXchangeClient.ts` file provides:
- Pool information fetching
- User funding functionality
- Token swap operations
- Transaction building

## Mock Data
Currently using mock data for:
- Markets (KC vs BAL, DET vs HOU)
- Price history
- Recent trades
- User balances

## Next Steps
1. Connect to local Solana cluster
2. Test with deployed smart contracts
3. Replace mock data with real blockchain data
4. Add push notifications for game results
5. Implement claim winnings flow
