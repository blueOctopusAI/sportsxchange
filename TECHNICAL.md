# Technical Documentation

## Architecture Overview

SportsXchange consists of three main components:

### 1. Smart Contracts (Solana/Anchor)
- **Current**: AMM implementation with x*y=k formula
- **Next**: Bonding curve implementation for dynamic pricing
- **Location**: `/programs/sportsxchange/src/lib.rs` (AMM), `lib_v2.rs` (bonding curves)

### 2. Mobile App (React Native)
- Wallet connection interface
- Market browsing and trading
- Bonding curve price charts
- Real-time trade feed
- **Location**: `/sportsxchange-mobile/`

### 3. Trading Agents (Node.js)
- Market creation automation
- Web-based trading interface
- Economic simulations
- **Location**: `/agents/`

## Bonding Curve Implementation

### Math Formula
```
price = k * supply^n

Where:
- k = 0.0001 (initial price coefficient)
- n = 1.5 (curve exponent)
```

### Token Distribution
```
Supply Level    | $100 Investment Gets
----------------|---------------------
0 tokens        | 10,000 tokens
1,000 tokens    | 31 tokens
5,000 tokens    | 3 tokens
10,000 tokens   | 1 token
```

### Smart Contract Storage
```rust
pub struct MarketV2 {
    pub team_a_mint: Pubkey,
    pub team_b_mint: Pubkey,
    pub usdc_vault: Pubkey,
    pub k_value: u64,        // Scaled by 10^9
    pub n_value: u64,        // Scaled by 10^2
    pub team_a_supply: u64,
    pub team_b_supply: u64,
    pub pool_value: u64,
    pub trading_halted: bool,
    pub is_resolved: bool,
    pub winner: Option<u8>,
}
```

## Key Algorithms

### Calculate Tokens Out
```javascript
function calculateTokensOut(usdcAmount, currentSupply, k, n) {
  let tokensOut = 0;
  const steps = 100;
  const usdcPerStep = usdcAmount / steps;
  
  for (let i = 0; i < steps; i++) {
    const price = k * Math.pow(currentSupply + tokensOut, n);
    tokensOut += usdcPerStep / price;
  }
  
  return tokensOut;
}
```

### Market Resolution
1. Trading halts when game starts
2. Oracle provides winner (currently manual)
3. Winning tokens redeemable for pool share
4. Losing tokens worth $0

## API Endpoints (Trading Interface)

```
GET  /                      # Web UI
GET  /api/pool/:marketPda   # Get pool info
GET  /api/balance/:marketPda # Get user balance
POST /api/fund              # Fund account (testnet)
POST /api/trade             # Execute trade
```

## Environment Variables

```bash
# .env file in /agents
RPC_URL=http://localhost:8899
PROGRAM_ID=7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH
WALLET_PATH=~/.config/solana/id.json
TRADING_PORT=3001
```

## Testing

### Unit Tests
```bash
anchor test
```

### Bonding Curve Simulation
```bash
cd agents
npm run test-bonding
```

### Integration Test
```bash
cd agents
npm run test-trading
```

## Deployment

### Local Development
```bash
# Terminal 1: Validator
solana-test-validator

# Terminal 2: Deploy
anchor deploy

# Terminal 3: Trading Interface
cd agents && npm run trading

# Terminal 4: Mobile App
cd sportsxchange-mobile && npm start
```

### Devnet Deployment
```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

## Security Considerations

1. **Slippage Protection**: All trades include min_out parameters
2. **Authority Controls**: Only market creator can halt/resolve
3. **Overflow Protection**: All math operations use checked arithmetic
4. **Reentrancy**: State updates before external calls

## Known Issues

1. Market state doesn't persist mint addresses (requires discovery from blockchain)
2. No automated oracle for game results
3. Mobile app uses mock data (blockchain integration pending)

## Next Steps

1. Deploy bonding curve contract
2. Integrate mobile app with real blockchain
3. Add oracle for automated resolution
4. Implement referral system
5. Add liquidity provider rewards
