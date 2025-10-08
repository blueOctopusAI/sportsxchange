# SportsXchange

**Bonding curve prediction markets for sports betting on Solana**

## What is SportsXchange?

A decentralized sports prediction market that uses bonding curves to create dynamic pricing. Early buyers get exponentially more tokens than late buyers, creating natural price discovery through trading activity.

## How It Works

### Bonding Curve Mechanics
- Markets start with tokens priced near zero
- Each purchase increases the price along a curve (price = k * supply^n)
- Early buyers can profit by selling to later buyers OR holding until game resolution
- Winning team tokens are redeemable for a share of the pool
- Losing team tokens become worthless

### Example
- First $100 invested → 10,000 tokens at $0.01 each
- After $10k volume → $100 gets you 100 tokens at $1 each  
- Early buyer advantage: 100x more tokens

## Project Structure

```
sportsxchange/
├── programs/           # Solana smart contracts (Anchor)
├── agents/            # Trading bots and automation
├── sportsxchange-mobile/  # React Native mobile app
└── tests/             # Integration tests
```

## Quick Start

### Prerequisites
- Node.js 18+
- Rust & Anchor CLI
- Solana CLI
- iOS/Android simulator (for mobile)

### 1. Start Local Validator
```bash
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
```

### 4. Run Mobile App
```bash
cd sportsxchange-mobile
npm install
npm start
# Press 'w' for web or scan QR for mobile
```

## Mobile App Features

- **Market Discovery**: Browse active prediction markets
- **Bonding Curve Trading**: Buy/sell with dynamic pricing
- **Price Charts**: Visual representation of price movement
- **Recent Trades**: Live feed of trading activity
- **Portfolio Tracking**: View your positions and P&L

## Smart Contract

The core contract (`programs/sportsxchange/src/lib.rs`) implements:
- AMM with constant product formula (original version)
- Bonding curves for dynamic pricing (v2 in development)
- Market creation and resolution
- Fee collection and distribution

Key instructions:
- `create_market` - Initialize a new prediction market
- `buy_on_curve` - Purchase team tokens
- `sell_on_curve` - Sell tokens back to the pool
- `resolve_market` - Declare winner and enable claims
- `claim_winnings` - Redeem winning tokens for USDC

## Trading Agents

Located in `/agents`, these Node.js scripts provide:
- Market creation automation
- Trading interfaces
- Price simulation
- Bonding curve testing

Run the web trading interface:
```bash
cd agents
npm run trading  # http://localhost:3001
```

## Development Status

✅ **Completed**
- AMM smart contract deployed
- Basic trading functionality
- Mobile app with bonding curve UI
- Economic simulation tools

🚧 **In Progress**
- Bonding curve contract deployment
- Real wallet integration
- Oracle for game results

## License

MIT
