# SportsXchange

> Head-to-head sports trading platform on Solana

SportsXchange is a dynamic, real-time sports trading platform where fans buy and sell tokens tied to NFL matchups. Unlike traditional sports betting, SportsXchange creates continuous markets that move as games unfold, allowing users to flip positions, ride momentum swings, and trade throughout the game.

## 🎯 Core Concept

Each NFL game spawns a market with two tokens: **Home** and **Away**. These tokens exist in a head-to-head AMM pool where every purchase of one side directly affects the value of the other. As the game progresses, market sentiment, automated bots, and in-game events drive volatility. At the final whistle, the winning team's token becomes redeemable while the loser's token goes to zero.

## ⚙️ Architecture

### Anchor Program (Solana)
- **Market Factory** - Creates markets for each NFL matchup
- **Head-to-Head AMM** - Constant product formula (x × y = k)
- **Liquidity Pools** - Token vaults with automated pricing
- **Resolution Engine** - Declares winners and settles markets

### Key Features
- ✅ PDA-based market accounts (deterministic addresses)
- ✅ Separate SPL token mints for each side
- ✅ Slippage protection on swaps
- ✅ Event emissions for price tracking
- ✅ Market lifecycle management (create → trade → resolve)

## 🚀 Quick Start

### Prerequisites
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.31+
- Node.js 18+
- Yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sportsxchange.git
cd sportsxchange

# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test
```

### Local Development

```bash
# Start local validator
solana-test-validator

# Deploy to local
anchor deploy

# Run test suite
anchor test --skip-local-validator
```

## 📊 Program Instructions

### 1. Create Market
Creates a new betting market for an NFL game.

```rust
pub fn create_market(
    ctx: Context<CreateMarket>,
    game_id: String,        // e.g., "2024-WEEK1-KC-BAL"
    home_team: String,      // e.g., "KC"
    away_team: String,      // e.g., "BAL"
) -> Result<()>
```

**Accounts:**
- Market (PDA) - Derived from `game_id`
- Home Mint - SPL token for home team
- Away Mint - SPL token for away team

### 2. Initialize Pool
Seeds the AMM pool with initial liquidity.

```rust
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    initial_home_amount: u64,  // e.g., 1,000,000,000 (1000 tokens)
    initial_away_amount: u64,  // e.g., 1,000,000,000 (1000 tokens)
) -> Result<()>
```

**Accounts:**
- Market - Existing market account
- Pool (PDA) - Derived from market address
- Home Vault - ATA for home tokens
- Away Vault - ATA for away tokens

### 3. Swap Home for Away
Trade home tokens for away tokens.

```rust
pub fn swap_home_for_away(
    ctx: Context<Swap>,
    amount_in: u64,
    minimum_amount_out: u64,  // Slippage protection
) -> Result<()>
```

**AMM Formula:**
```
amount_out = (reserve_away × amount_in) / (reserve_home + amount_in)
```

### 4. Swap Away for Home
Trade away tokens for home tokens.

```rust
pub fn swap_away_for_home(
    ctx: Context<Swap>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()>
```

### 5. Resolve Market
Declares the winning team and closes the market.

```rust
pub fn resolve_market(
    ctx: Context<ResolveMarket>,
    winner: TeamSide,  // TeamSide::Home or TeamSide::Away
) -> Result<()>
```

**Effects:**
- Sets `market.winner`
- Sets `market.is_active = false`
- Emits `MarketResolvedEvent`

## 🧪 Test Suite

```bash
anchor test
```

**Coverage:**
- ✅ Market creation with PDA derivation
- ✅ Pool initialization with 1000/1000 liquidity
- ✅ Price calculation verification (1:1 ratio)
- ✅ Market resolution flow
- ✅ Double-resolution prevention

**Example Output:**
```
✓ Creates a market with PDA (463ms)
✓ Initializes liquidity pool (467ms)
✓ Calculates price correctly (50/50 split)
✓ Resolves market with winner (473ms)
✓ Cannot resolve inactive market

5 passing (1s)
```

## 📐 Account Structures

### Market
```rust
pub struct Market {
    pub authority: Pubkey,      // Creator/admin
    pub game_id: String,        // Unique identifier
    pub home_team: String,      // Team code
    pub away_team: String,      // Team code
    pub home_mint: Pubkey,      // Home token mint
    pub away_mint: Pubkey,      // Away token mint
    pub is_active: bool,        // Trading enabled
    pub winner: Option<TeamSide>, // Result
    pub bump: u8,               // PDA bump seed
}
// Space: 203 bytes
```

### LiquidityPool
```rust
pub struct LiquidityPool {
    pub market: Pubkey,         // Parent market
    pub home_vault: Pubkey,     // Home token ATA
    pub away_vault: Pubkey,     // Away token ATA
    pub home_reserve: u64,      // Home token balance
    pub away_reserve: u64,      // Away token balance
    pub constant_k: u64,        // AMM invariant
    pub bump: u8,               // PDA bump seed
}
// Space: 129 bytes
```

## 🎮 Example Usage (TypeScript)

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sportsxchange } from "./target/types/sportsxchange";

const program = anchor.workspace.Sportsxchange as Program<Sportsxchange>;

// 1. Create market
const [marketPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), Buffer.from("2024-WEEK1-KC-BAL")],
  program.programId
);

await program.methods
  .createMarket("2024-WEEK1-KC-BAL", "KC", "BAL")
  .accounts({
    market: marketPda,
    homeMint: homeMint.publicKey,
    awayMint: awayMint.publicKey,
  })
  .rpc();

// 2. Initialize pool
const [poolPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool"), marketPda.toBuffer()],
  program.programId
);

await program.methods
  .initializePool(
    new anchor.BN(1_000_000_000),
    new anchor.BN(1_000_000_000)
  )
  .accounts({
    market: marketPda,
    pool: poolPda,
    // ... other accounts
  })
  .rpc();

// 3. Swap tokens
await program.methods
  .swapHomeForAway(
    new anchor.BN(10_000_000),  // 10 HOME tokens
    new anchor.BN(9_900_000)     // Min 9.9 AWAY tokens (1% slippage)
  )
  .accounts({
    market: marketPda,
    pool: poolPda,
    // ... user token accounts
  })
  .rpc();

// 4. Resolve market
await program.methods
  .resolveMarket({ home: {} })
  .accounts({
    market: marketPda,
  })
  .rpc();
```

## 📈 Economics

### Initial Pool Setup
- **Liquidity:** 1000 HOME + 1000 AWAY
- **Constant K:** 1,000,000 (1000 × 1000)
- **Initial Price:** 1:1 ratio

### Price Impact Example
Starting: 1000 HOME / 1000 AWAY

User buys 10 HOME tokens:
- **Amount In:** 10 AWAY
- **Amount Out:** ~9.9 HOME
- **New Ratio:** 990.1 HOME / 1010 AWAY
- **New Price:** 1 HOME = 1.02 AWAY (+2%)

### Transaction Costs (Localnet)
- Market creation: ~0.002 SOL
- Pool initialization: ~0.003 SOL
- Swap: ~0.0001 SOL

## 🔮 Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full product vision and build phases.

**Current Status:** ✅ Phase 1 Complete
- Market creation
- AMM pools
- Swap engine
- Resolution system

**Next Phase:** Agent automation + React Native UI

## 🛠️ Development

### Project Structure
```
sportsxchange/
├── programs/
│   └── sportsxchange/
│       └── src/
│           └── lib.rs          # Anchor program
├── tests/
│   └── sportsxchange.ts        # Test suite
├── app/                        # React Native (future)
├── Anchor.toml                 # Anchor config
└── package.json
```

### Key Dependencies
- `anchor-lang` ^0.31.1
- `anchor-spl` ^0.31.1 (with idl-build)
- `@solana/spl-token` ^0.4.9
- `@solana/web3.js` ^1.95.8

### Error Codes
- `6000` - MathOverflow
- `6001` - SlippageExceeded
- `6002` - MarketNotActive
- `6003` - MarketAlreadyResolved

## 🤝 Contributing

This is a learning/showcase project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

ISC

## 🔗 Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [SPL Token Program](https://spl.solana.com/token)

---

**Built with ❤️ for Sports Ball**
