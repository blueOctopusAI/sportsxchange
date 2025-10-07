# SportsXchange Product Roadmap

## Executive Summary

SportsXchange is a dynamic, head-to-head sports trading platform where fans can buy and sell tokens tied to real NFL matchups. Unlike traditional sports betting, which locks a user into a single wager, SportsXchange creates continuous markets that move as the game unfolds. Fans can flip positions, ride momentum swings, and experience the thrill of trading in real time.

### Core Innovation
Each NFL game spawns a market with two tokens: **Home** and **Away**. These tokens are locked into a head-to-head AMM pool, meaning every purchase of Home directly affects the value of Away, and vice versa. As the game progresses, market sentiment, automated bots, and in-game events drive volatility. At the final whistle, the winning team's token becomes redeemable, while the loser's token is burned.

### Vision
Merge sports fandom with live trading dopamine. Instead of a static bet, users actively participate throughout the game, flipping sides, reacting to touchdowns, and competing with other fans. The system is designed to be viral and demo-friendly, with bold UI, live price swings, and hype-worthy clips optimized for TikTok/social.

### Development Philosophy
This project is being developed first as a **learning showcase on a local Solana validator**. The goal is not immediate commercialization but rather to:
- ✅ Prove the core mechanic (head-to-head markets that open, trade, and resolve)
- 🔄 Automate weekly game setup and closure with agents
- 🔄 Build a viral mobile demo app that looks and feels like a real crypto product
- 🔄 Create a credible blueprint for future expansion into live testnet, mainnet, and potentially cross-league markets

## Strategic Context

SportsXchange combines three emerging trends:
1. **Live sports betting & fantasy engagement** → fans want interactivity, not static wagers
2. **Crypto trading dynamics** → the pump/fun of memecoins, with sports at the center
3. **AI/agents** → automating schedule setup, market making, and resolution

The product plan prioritizes **NFL** as the entry point due to cultural dominance and weekly cadence.

---

## Product Outline

### Core Mechanics
- **Market Creation:** Each NFL matchup spawns a market with a Home and Away token
- **Head-to-Head AMM:** One shared pool where buying one side pushes the other down
- **Dynamic Trading:** Users can flip positions mid-game
- **Game Resolution:** At final whistle, winning token is redeemable, loser goes to zero

### Platform Scope (Phase 1)
- **League:** NFL only
- **Markets:** All games each week, unlocked near kickoff
- **Environment:** Local Solana validator first; testnet later
- **Users:** Developers, early testers, demo audiences

### Automation via Agents
- **Scheduler Agent:** Pulls weekly NFL schedule, seeds markets pre-kickoff
- **Market Maker Agent:** Simulates volume and volatility, spikes activity on scoring events
- **Resolution Agent:** Closes markets at game end, triggers redemption
- **Content Agent (later):** Generates posts/memes tied to game markets

### Mobile App (React Native + Expo)
- **Board Screen:** Tiles for Live and Upcoming games. Countdown timers before kickoff
- **Game Screen:**
  - Team logos, score, game clock, possession marker
  - Dual charts (Home vs Away)
  - Buy/Sell buttons with one-tap trades
  - Hype animations (confetti, sounds on scoring)
- **Demo Tools:** Scripted simulation and screen record export for TikTok

---

## Build Phases

### ✅ Phase 1 — Core System (Local Dev)
**Status:** COMPLETE

**Goal:** End-to-end loop on local Solana validator

**Deliverables:**
- ✅ Deploy local validator (solana-test-validator)
- ✅ Build Market Factory program (Anchor)
- ✅ Build Head-to-Head AMM (Anchor)
- ✅ Market creation instruction
- ✅ Pool initialization instruction
- ✅ Swap instructions (home ↔ away)
- ✅ Market resolution instruction
- ✅ Comprehensive test suite

**Acceptance Criteria:** ✅
- Create → trade → resolve one game with visible volatility and redemption flow
- All tests passing
- AMM constant product formula verified
- PDA derivation working correctly

**Completed:** October 2025

---

### 🔄 Phase 2 — Automation & Agents
**Status:** NEXT

**Goal:** Hands-off weekly operations

**Tasks:**
- [ ] Write Scheduler Script to seed full NFL slate
  - Integrate SportsDataIO API for weekly schedule
  - Auto-create markets for all games
  - Set kickoff timers
- [ ] Write Resolution Script to finalize games
  - Poll SportsDataIO for final scores
  - Auto-call `resolve_market` with winner
  - Handle edge cases (overtime, postponements)
- [ ] Write Bot/Market Maker Script
  - Baseline liquidity maintenance
  - Event-driven volatility (touchdowns, turnovers)
  - Configurable trading patterns
- [ ] Build monitoring dashboard
  - View all active markets
  - Track reserve ratios
  - Monitor agent health

**Acceptance Criteria:**
- NFL week runs start to finish with no manual intervention
- Markets auto-create Thursday before games
- Market maker executes trades on scoring events
- Markets auto-resolve 5 minutes post-game
- Error handling for API failures

**Estimated Duration:** 2-3 weeks

---

### 🔮 Phase 3 — Viral-Ready Demo
**Status:** PLANNED

**Goal:** App looks/feels hype for TikTok/social

**Tasks:**
- [ ] Build React Native app scaffold
  - Board screen with game tiles
  - Game screen with charts
  - Wallet adapter integration
- [ ] Add flashy branding, animations, and audio
  - Confetti on touchdowns
  - Sound effects for swaps
  - Smooth transitions
- [ ] Add scripted "demo mode" for non-live recording
  - Pre-recorded game data
  - Simulated price movements
  - Fake user activity
- [ ] Optimize charts for volatility visualization
  - Real-time price updates
  - Volume indicators
  - Trade history feed
- [ ] One-tap "clip generator" for TikTok export
  - 60-second highlight reels
  - Auto-add branding/music
  - Share directly to social

**Acceptance Criteria:**
- 60-second demo video shows full hype loop (price surges, score updates, fan battle)
- App runs smoothly on iOS and Android
- Demo mode generates realistic trading scenarios
- UI optimized for mobile recording

**Estimated Duration:** 3-4 weeks

---

### 🔮 Phase 4 — Testnet Deployment
**Status:** FUTURE

**Goal:** Move from local to public testnet

**Tasks:**
- [ ] Audit program security
  - Review access controls
  - Test edge cases
  - Validate math operations
- [ ] Deploy to Solana devnet
  - Update RPC endpoints
  - Fund deployer wallet
  - Verify program deployment
- [ ] Set up monitoring infrastructure
  - Transaction tracking
  - Error alerting
  - Performance metrics
- [ ] Beta testing with real users
  - Invite small user group
  - Gather feedback
  - Iterate on UX

**Acceptance Criteria:**
- Program deployed to devnet
- 10+ beta users complete full game cycle
- Zero critical bugs in production
- Performance meets targets (<500ms swap execution)

**Estimated Duration:** 2-3 weeks

---

### 🔮 Phase 5 — Beyond NFL
**Status:** FUTURE

**Goal:** Expand product universe

**Opportunities:**
- [ ] Add NBA/college basketball for daily cadence
- [ ] Add college football/March Madness for high-energy volatility
- [ ] Introduce merch/social loops around city branding
- [ ] Consider public mainnet deployment
- [ ] Multi-league tournament mode
- [ ] Social features (leaderboards, friend groups)
- [ ] Advanced trading features (limit orders, stop-loss)

**Strategic Decisions Required:**
- Licensing/IP considerations
- Multi-league complexity vs focus
- Monetization strategy
- Community building approach

---

## Technical Architecture

### Current Stack
- **Blockchain:** Solana (local validator → devnet → mainnet)
- **Framework:** Anchor 0.31+
- **Language:** Rust (program), TypeScript (client/agents)
- **Mobile:** React Native + Expo
- **Data:** SportsDataIO (NFL scoring events)

### Program Components
```
Market Factory
├── create_market()       - Spawn new game market
├── initialize_pool()     - Seed AMM with liquidity
└── resolve_market()      - Declare winner

AMM Engine
├── swap_home_for_away()  - Trade home → away
└── swap_away_for_home()  - Trade away → home

Account Structures
├── Market (PDA)          - Game metadata + state
└── LiquidityPool (PDA)   - Token vaults + reserves
```

### Agent Architecture
```
Scheduler Agent (Node.js)
├── Fetch weekly NFL schedule
├── Create markets for all games
└── Set kickoff activation timers

Market Maker Agent (Node.js)
├── Monitor game events (SportsDataIO)
├── Execute swaps on touchdowns/turnovers
└── Maintain baseline liquidity

Resolution Agent (Node.js)
├── Poll for game completion
├── Fetch final scores
└── Call resolve_market()

Content Agent (Future)
├── Generate hype posts
├── Create game recaps
└── Share to social platforms
```

---

## Risk Assessment

### Technical Risks
| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| **AMM Complexity** | High | Extensive testing, conservative initial parameters | ✅ Mitigated |
| **Oracle Reliability** | High | Fallback data sources, manual override capability | 🔄 In Progress |
| **Frontrunning** | Medium | Consider private mempools, transaction priority fees | 📋 Planned |
| **Slippage** | Medium | User-configurable slippage tolerance | ✅ Implemented |
| **Program Bugs** | High | Audit before mainnet, testnet beta period | 📋 Planned |

### Product Risks
| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| **User Adoption** | High | Focus on viral demo, TikTok marketing | 🔄 In Progress |
| **Licensing/IP** | High | Operate in legal gray area initially, consult lawyers later | 📋 To Address |
| **Market Depth** | Medium | Market maker bots provide baseline liquidity | 📋 Planned |
| **Regulatory** | High | Start as non-commercial demo, pivot if needed | 📋 Monitoring |

### Operational Risks
| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| **API Rate Limits** | Medium | Cache data, implement retry logic | 📋 Planned |
| **Server Costs** | Low | Start with free tier services | ✅ Current |
| **Data Accuracy** | High | Multiple data sources, validation checks | 📋 Planned |

---

## Success Metrics

### Phase 1 (Complete)
- ✅ Program compiles without errors
- ✅ All tests passing (5/5)
- ✅ Market creation working
- ✅ AMM swaps functional
- ✅ Resolution logic verified

### Phase 2 (Agents)
- [ ] 16 markets auto-created weekly
- [ ] 95%+ uptime for agents
- [ ] <10 second delay on event detection
- [ ] 100% accurate game resolution

### Phase 3 (Mobile Demo)
- [ ] App runs on iOS and Android
- [ ] <3 second load time
- [ ] 60fps animations
- [ ] 10+ demo videos created

### Phase 4 (Testnet)
- [ ] 50+ beta users
- [ ] 100+ completed game cycles
- [ ] <1% error rate
- [ ] Positive user feedback (4+/5 stars)

---

## Open Questions

### Product
- What happens if a game is postponed or cancelled?
- How do we handle overtime/tie games?
- Should we add a "push" outcome (refund both sides)?
- What's the right initial liquidity amount per market?

### Technical
- Should we use Pyth/Switchboard for price feeds instead of agents?
- How do we prevent bot abuse/manipulation?
- What's the optimal pool size for each game?
- Should we implement a fee structure (protocol fee, LP fees)?

### Business
- When do we need to address licensing/legal?
- What's the monetization strategy?
- How do we handle customer support for beta users?
- Should we build a web app in addition to mobile?

---

## Deliverables Recap

**Phase 1 (✅ Complete):**
- ✅ Local Solana AMM programs (Factory + Pool)
- ✅ Test suite with 5 passing tests
- ✅ Documentation (README + ROADMAP)

**Phase 2 (Next):**
- [ ] Scheduler, Resolution, Market Maker agents
- [ ] SportsDataIO integration
- [ ] Monitoring dashboard

**Phase 3 (Future):**
- [ ] React Native app with Live/Upcoming games and Game screen
- [ ] Viral demo mode for TikTok-ready clips
- [ ] Wallet adapter integration

**Phase 4+ (Vision):**
- [ ] Testnet deployment
- [ ] Beta user testing
- [ ] Multi-league expansion
- [ ] Mainnet launch

---

## Resources

### APIs & Data Sources
- **SportsDataIO:** NFL schedule, live scores, play-by-play
- **Alternative:** ESPN API, The Odds API

### Development Tools
- **Anchor:** Solana program framework
- **Solana Playground:** Quick prototyping
- **Metaplex:** NFT tooling (future merch integration)

### Design Inspiration
- **Polymarket:** Prediction market UX patterns
- **Pump.fun:** Viral crypto trading mechanics
- **Robinhood:** Simple mobile trading UI

---

**Last Updated:** October 7, 2025  
**Status:** Phase 1 Complete, Phase 2 In Planning
