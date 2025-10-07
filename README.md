# SportsXchange

A decentralized sports betting AMM (Automated Market Maker) built on Solana that enables users to trade on NFL game outcomes.

## Overview

SportsXchange creates prediction markets for NFL games where users can trade HOME and AWAY tokens. The protocol uses a constant product AMM (x*y=k) to provide liquidity and price discovery. When games conclude, markets resolve and winning tokens become redeemable 1:1 for the underlying asset.

## Architecture

### Smart Contracts (`/programs/sportsxchange`)
- **Market Creation**: Creates prediction markets for games with HOME/AWAY token pairs
- **Liquidity Pools**: Constant product AMM for price discovery
- **Trading**: Swap between HOME and AWAY tokens based on pool reserves
- **Resolution**: Oracle-based game resolution system

### Automation Agents (`/agents`)
- **Scheduler Agent**: Automatically creates markets for upcoming NFL games
- **Market Maker Agent**: Provides liquidity and trading volume (coming soon)
- **Resolver Agent**: Resolves markets when games complete (coming soon)

### Web Dashboard (`/agents`)
- Real-time monitoring of markets and pools
- System status tracking
- Agent management interface

## Getting Started

### Prerequisites
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.31.1
- Node.js 18+

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/sportsxchange.git
cd sportsxchange
```

2. **Build the smart contracts**
```bash
anchor build
```

3. **Run tests**
```bash
anchor test
```

4. **Deploy to localnet**
```bash
solana-test-validator
anchor deploy
```

5. **Set up agents**
```bash
cd agents
npm install
cp .env.example .env
# Edit .env with your wallet path and program ID
```

## Running the Agents

### Prerequisites - Start Solana Validator

**IMPORTANT**: Always start the Solana test validator before running agents or trading interface.

```bash
# Option 1: Run in foreground (use Ctrl+C to stop cleanly)
solana-test-validator

# Option 2: Run in background (recommended)
solana-test-validator > validator.log 2>&1 &

# To check if validator is running
ps aux | grep solana-test-validator

# To view logs (if running in background)
tail -f validator.log

# To stop validator (if running in background)
pkill solana-test-validator
```

**Common Validator Issues:**

If you get "Unable to lock test-ledger directory":
```bash
# 1. Check for suspended processes
fg  # Brings suspended process to foreground
# Then press Ctrl+C to kill it

# 2. Or kill all validator processes
pkill -9 solana-test-validator

# 3. Clean up the lock
rm -rf test-ledger

# 4. Start fresh
solana-test-validator
```

**Never use Ctrl+Z** with the validator - it suspends the process but keeps the lock. Always use **Ctrl+C** to stop cleanly.

### Start the Dashboard
```bash
cd agents
npm start
# Visit http://localhost:3000
```

The dashboard provides:
- Real-time market monitoring
- Agent status tracking
- Market creation history
- System statistics

### Test Market Creation
```bash
cd agents
npm run test-simple
```

### Run Scheduler (creates markets automatically)
```bash
npm run scheduler
```

## Project Structure

```
sportsxchange/
├── programs/sportsxchange/     # Solana smart contracts
│   ├── src/
│   │   └── lib.rs             # Main program logic
│   └── Cargo.toml
├── tests/                      # Integration tests
│   └── sportsxchange.ts       # TypeScript tests
├── agents/                     # Automation agents
│   ├── src/
│   │   ├── scheduler-agent.js # Market creation bot
│   │   ├── orchestrator.js    # Web dashboard
│   │   └── create-simple-market.js
│   ├── lib/
│   │   └── solana-client.js  # Blockchain interface
│   └── data/
│       ├── schedules/         # Game schedules
│       └── agent-state.json   # State tracking
├── migrations/                 # Deploy scripts
└── Anchor.toml                # Anchor configuration
```

## Key Features

- **Permissionless Markets**: Anyone can create markets for games
- **Constant Product AMM**: Automated pricing based on x*y=k
- **Binary Outcomes**: Simple HOME/AWAY token mechanics
- **Automated Operations**: Agents handle market lifecycle
- **Real-time Dashboard**: Monitor all markets and agents

## Testing

Run the full test suite:
```bash
anchor test
```

Test individual components:
```bash
# Test market creation
cd agents && npm run test-simple

# Test scheduler
npm run scheduler
```

## Configuration

### Environment Variables
Create `agents/.env`:
```env
RPC_URL=http://127.0.0.1:8899
WALLET_PATH=/path/to/your/wallet.json
PROGRAM_ID=your_program_id
NETWORK=localnet
```

### Program Configuration
Update `Anchor.toml` with your program ID and cluster settings.

## Development Status

- ✅ Core AMM smart contracts
- ✅ Market creation and initialization
- ✅ Token swapping mechanics
- ✅ Scheduler agent for automated market creation
- ✅ Web dashboard for monitoring
- 🚧 Market maker agent for liquidity
- 🚧 Resolution agent for game completion
- 🚧 Real sports data integration
- 🚧 Frontend trading interface

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

## Security

This is experimental software. Use at your own risk. Not audited for production use.
