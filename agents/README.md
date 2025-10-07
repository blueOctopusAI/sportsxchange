# SportsXchange Agents

Automation agents for the SportsXchange AMM platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy your IDL file from the main project
cp ../target/idl/sportsxchange.json ../target/idl/

# Test single market creation
npm run test-create

# Run the scheduler agent (creates markets)
npm run scheduler

# Run the orchestrator (monitoring dashboard)
npm start
```

## 📁 Structure

```
agents/
├── src/
│   ├── create-single-market.js  # Test script for single market
│   ├── scheduler-agent.js       # Creates markets from schedule
│   ├── orchestrator.js          # Runs all agents + dashboard
│   ├── market-maker-agent.js    # TODO: Trading bot
│   └── resolver-agent.js        # TODO: Game resolution
├── lib/
│   ├── solana-client.js        # Blockchain interactions
│   ├── utils.js                 # Helper functions
│   └── sports-api.js            # TODO: SportsDataIO integration
├── data/
│   ├── agent-state.json        # Current state
│   ├── schedules/               # Game schedules
│   └── games/                   # Live game data
└── logs/                        # Agent logs
```

## 🎮 Available Commands

### Test Single Market Creation
```bash
npm run test-create
```
Creates one test market to verify everything works.

### Run Scheduler Agent
```bash
npm run scheduler
```
- Reads `data/schedules/week-10-test.json`
- Creates markets for any unprocessed games
- Runs every minute in test mode
- Saves state to `data/agent-state.json`

### Run Orchestrator Dashboard
```bash
npm start
```
Starts web dashboard on http://localhost:3000

**Endpoints:**
- `GET /` - Health check
- `GET /status` - Agent status and stats
- `GET /markets` - List active markets
- `POST /trigger/scheduler` - Manual scheduler run
- `POST /reset` - Clear all state (testing)

## 📊 Current Status

### ✅ Implemented
- Scheduler Agent (creates markets from schedule)
- Solana client (market creation, pool initialization)
- State management (tracks processed games)
- Web dashboard (monitoring)
- Test data (4 sample NFL games)

### 🚧 TODO (Phase 2)
- [ ] Market Maker Agent (automated trading)
- [ ] Resolver Agent (game completion)
- [ ] SportsDataIO API integration
- [ ] Production cron schedules
- [ ] Error recovery
- [ ] PM2 configuration

## 🔧 Configuration

Edit `.env` file:
```env
RPC_URL=http://127.0.0.1:8899
WALLET_PATH=/Users/jashanno/.config/solana/id.json
PROGRAM_ID=7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH
NETWORK=localnet
```

## 📝 Test Schedule

The test schedule (`data/schedules/week-10-test.json`) contains 4 games:
- KC vs BAL (Thursday Night)
- DET vs HOU (Sunday Night)
- SF vs DAL (Sunday Afternoon)
- GB vs CHI (Sunday Early)

## 🐛 Troubleshooting

### "Program ID mismatch"
Update `PROGRAM_ID` in `.env` to match your deployed program.

### "Account does not exist"
Make sure your local validator is running:
```bash
solana-test-validator
```

### "Failed to create market"
Check that you have SOL in your wallet:
```bash
solana balance
```

## 📈 Next Steps

1. **Test market creation** with `npm run test-create`
2. **Run scheduler** to create all 4 test markets
3. **Monitor** via dashboard at http://localhost:3000
4. **Build Market Maker Agent** for automated trading
5. **Add Resolver Agent** for game completion
6. **Integrate real NFL data** from SportsDataIO

## 📄 License

ISC
