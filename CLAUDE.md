# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Solana-based sports exchange and prediction market platform. Users trade on sports outcomes using bonding curve AMM mechanics on-chain. Includes Anchor smart contracts (Rust), a bot trading ecosystem (TypeScript/Node.js), and a React Native mobile app (Expo).

**Status: DORMANT** -- This project is not under active development. Refer to `/Users/jashanno/Developer/projects/intelligence-hub/projects.md` for current portfolio status.

## Stack

- **On-chain programs**: Rust with Anchor framework (Solana)
- **Tests & scripts**: TypeScript, ts-mocha, Chai
- **Bot ecosystem**: Node.js (JavaScript)
- **Mobile app**: React Native (Expo), TypeScript
- **Blockchain**: Solana (localnet for development)
- **Package manager**: Yarn (Anchor toolchain)

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `programs/sportsxchange/` | Anchor smart contract (Rust). Main entry at `src/lib.rs`, archived iterations in `src/archived/` |
| `agents/` | Bot trading ecosystem (~55 files). Market makers, arbitrage bots, momentum bots, whale bots, sports API integration, orchestrators |
| `agents/lib/` | Shared utilities for agent scripts (Solana client, helpers) |
| `agents/bots/` | Individual bot implementations (intelligent market maker, momentum, retail, whale, arbitrage) |
| `agents/sports/` | Sports data API integration |
| `sportsxchange-mobile/` | React Native (Expo) mobile app with Solana wallet integration |
| `tests/` | Anchor program integration tests (AMM trading, bonding curve, edge cases) |
| `migrations/` | Anchor deploy script |
| `docs/` | Implementation notes, checklists, mobile app docs |
| `app/` | Empty -- placeholder for web frontend |
| `test-ledger/` | Solana localnet ledger data |

## Development

### Prerequisites

- Rust toolchain with Solana CLI
- Anchor CLI (`@coral-xyz/anchor` v0.31.1)
- Node.js + Yarn
- Solana localnet (`solana-test-validator`)

### Build & Test

```bash
# Build Anchor program
anchor build

# Run tests (requires solana-test-validator)
anchor test

# Run specific test file
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/amm-trading.test.ts

# Mobile app
cd sportsxchange-mobile && expo start
```

### Program ID

- Localnet: `7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH`

## Architecture Notes

- **Bonding curve AMM**: On-chain automated market maker using bonding curve pricing for sports outcome tokens
- **Bot ecosystem**: Simulated trading environment with multiple bot archetypes (market maker, momentum, whale, arbitrage, random retail) for testing market dynamics
- **Phase 3 orchestrator**: Coordinates multi-bot trading sessions with real Solana transactions
- **Mobile wallet**: Expo app with `@solana-mobile/wallet-adapter-mobile` for on-device transaction signing

## Available Skills

| Skill | Purpose |
|-------|---------|
| `solana-expert` | Anchor programs, Rust smart contracts, PDAs, token operations, on-chain state |
| `frontend-expert` | React Native mobile app, Solana wallet integration, Expo, cross-platform UI |
| `test-engineer` | Anchor program tests, Solana localnet, TypeScript integration tests, state verification |

## Key Documentation

- `README.md` -- Project overview
- `TECHNICAL.md` -- Technical architecture details
- `BONDING_CURVE_DESIGN.md` -- AMM bonding curve design
- `BOT_ECOSYSTEM.md` -- Bot trading system design
- `BUILD_INSTRUCTIONS.md` -- Build and deploy guide
- `QUICK_START.md` -- Getting started
- `SIMULATION_GUIDE.md` -- Running bot simulations
- `LLM_ASSISTANT_GUIDE.md` / `LLM_ASSISTANT_GUIDE_v2.md` -- Context for AI assistants
- `STATUS.md` -- Development status
