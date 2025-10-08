#!/usr/bin/env node

/**
 * SportsXchange Phase 3 Orchestrator
 * Combines sports data, market creation, and bot ecosystem
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import sports API
import { sportsAPI } from './sports/sports-api.js';

// Import bots
import { MarketMakerBot } from './bots/market-maker-bot.js';
import { RandomRetailBot } from './bots/random-retail-bot.js';
import { ArbitrageBot } from './bots/arbitrage-bot.js';
import { MomentumBot } from './bots/momentum-bot.js';
import { WhaleBot } from './bots/whale-bot.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Phase3Orchestrator {
  constructor(config = {}) {
    this.connection = null;
    this.program = null;
    this.wallet = null;
    this.bots = [];
    this.markets = new Map();
    this.metrics = {
      marketsCreated: 0,
      totalTrades: 0,
      totalVolume: 0,
      errors: 0,
      startTime: Date.now()
    };
    this.running = false;
    this.config = {
      tickInterval: config.tickInterval || 5000, // 5 seconds between ticks
      maxMarkets: config.maxMarkets || 5,
      botsPerMarket: config.botsPerMarket || 10,
      ...config
    };
  }

  async initialize() {
    console.log('🚀 Initializing Phase 3 Orchestrator');
    console.log('='.repeat(50));

    // Setup connection
    this.connection = new Connection(process.env.RPC_URL || 'http://localhost:8899', 'confirmed');
    
    // Test connection
    try {
      const version = await this.connection.getVersion();
      console.log('✅ Connected to validator:', version);
    } catch (error) {
      throw new Error('Cannot connect to validator. Is it running?');
    }

    // Load wallet
    const walletPath = process.env.WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet not found at: ${walletPath}`);
    }
    
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    console.log('✅ Wallet loaded:', this.wallet.publicKey.toBase58());

    // Create simplified program interface for simulation
    // We'll use this for Phase 3 simulation without needing full IDL
    this.program = {
      programId: new PublicKey(process.env.PROGRAM_ID || '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH'),
      provider: { connection: this.connection },
      account: {
        marketV2: {
          fetch: async (pubkey) => {
            // Simulated market data for testing
            return {
              teamASupply: Math.floor(Math.random() * 1000),
              teamBSupply: Math.floor(Math.random() * 1000),
              basePrice: 100000,
              slope: 10000,
              poolValue: Math.floor(Math.random() * 10000) * 1000000,
              tradingHalted: false
            };
          }
        }
      }
    };
    console.log('✅ Program interface ready (simulation mode)');

    console.log('✅ Initialization complete\n');
  }

  async createMarketsFromSportsData() {
    console.log('📅 Fetching upcoming games...');
    
    const games = await sportsAPI.getUpcomingGames();
    console.log(`Found ${games.length} upcoming games\n`);

    for (const game of games.slice(0, this.config.maxMarkets)) {
      try {
        console.log(`Creating market for: ${game.awayTeam.name} @ ${game.homeTeam.name}`);
        
        // Check if market already exists
        const marketKey = `market_${game.gameId}`;
        if (this.markets.has(marketKey)) {
          console.log('  Market already exists, skipping...');
          continue;
        }

        // In production, this would create actual markets on-chain
        // For now, we'll simulate it
        const market = {
          publicKey: PublicKey.unique(),
          gameId: game.gameId,
          teamA: game.homeTeam.name,
          teamB: game.awayTeam.name,
          teamAMint: PublicKey.unique(),
          teamBMint: PublicKey.unique(),
          basePrice: 100000, // 0.1 USDC
          slope: 10000,
          created: Date.now(),
          game: game
        };

        this.markets.set(marketKey, market);
        this.metrics.marketsCreated++;
        
        console.log(`  ✅ Market created: ${market.publicKey.toBase58().slice(0, 8)}...`);
        
        // Get fair probabilities from betting data
        const fairProb = await sportsAPI.calculateFairProbability(game.gameId);
        console.log(`  Fair probabilities - Home: ${(fairProb.home * 100).toFixed(1)}%, Away: ${(fairProb.away * 100).toFixed(1)}%`);
        
      } catch (error) {
        console.error(`  ❌ Error creating market: ${error.message}`);
        this.metrics.errors++;
      }
    }

    console.log(`\n✅ Created ${this.metrics.marketsCreated} markets\n`);
  }

  async initializeBots() {
    console.log('🤖 Initializing bot ecosystem...');

    // Create diverse bot ecosystem for each market
    for (const [key, market] of this.markets.entries()) {
      console.log(`\nCreating bots for ${market.teamA} vs ${market.teamB}:`);

      // Market Makers (2 per market)
      for (let i = 0; i < 2; i++) {
        const bot = new MarketMakerBot({
          name: `MM-${key}-${i}`,
          spreadPercent: 0.01 + Math.random() * 0.02, // 1-3% spread
          maxPositionUSDC: 100 + Math.random() * 200 // 100-300 USDC
        });
        // Initialize bot with connection only (simulation mode)
        bot.connection = this.connection;
        bot.programId = this.program.programId;
        bot.program = this.program;
        this.bots.push({ bot, market });
        console.log(`  Added ${bot.name}`);
      }

      // Arbitrage Bot (1 per market)
      const arbBot = new ArbitrageBot({
        name: `ARB-${key}`,
        minProfitPercent: 0.001,
        maxPositionSize: 500
      });
      arbBot.connection = this.connection;
      arbBot.programId = this.program.programId;
      arbBot.program = this.program;
      this.bots.push({ bot: arbBot, market });
      console.log(`  Added ${arbBot.name}`);

      // Momentum Traders (2 per market)
      for (let i = 0; i < 2; i++) {
        const bot = new MomentumBot({
          name: `MOM-${key}-${i}`,
          momentumThreshold: 0.03 + Math.random() * 0.05, // 3-8% threshold
          multiplier: 1.5 + Math.random() // 1.5-2.5x multiplier
        });
        bot.connection = this.connection;
        bot.programId = this.program.programId;
        bot.program = this.program;
        this.bots.push({ bot, market });
        console.log(`  Added ${bot.name}`);
      }

      // Retail Traders (4 per market)
      for (let i = 0; i < 4; i++) {
        const bot = new RandomRetailBot({
          name: `RETAIL-${key}-${i}`,
          minTradeSize: 1,
          maxTradeSize: 20 + Math.random() * 30, // 20-50 USDC
          tradeFrequency: 0.2 + Math.random() * 0.3, // 20-50% frequency
          favoriteTeam: Math.random() < 0.3 ? (Math.random() < 0.5 ? 'A' : 'B') : null
        });
        bot.connection = this.connection;
        bot.programId = this.program.programId;
        bot.program = this.program;
        this.bots.push({ bot, market });
        console.log(`  Added ${bot.name}`);
      }

      // Whale (1 per market, 50% chance)
      if (Math.random() < 0.5) {
        const strategies = ['value', 'pump', 'dump', 'manipulate'];
        const bot = new WhaleBot({
          name: `WHALE-${key}`,
          minTradeSize: 200,
          maxTradeSize: 500 + Math.random() * 500, // 500-1000 USDC
          frequency: 0.02 + Math.random() * 0.03, // 2-5% frequency
          strategy: strategies[Math.floor(Math.random() * strategies.length)]
        });
        bot.connection = this.connection;
        bot.programId = this.program.programId;
        bot.program = this.program;
        this.bots.push({ bot, market });
        console.log(`  Added ${bot.name} (${bot.strategy} strategy)`);
      }
    }

    console.log(`\n✅ Initialized ${this.bots.length} bots across ${this.markets.size} markets\n`);
  }

  async runSimulation() {
    this.running = true;
    let tick = 0;

    console.log('🏁 Starting simulation...');
    console.log('Press Ctrl+C to stop\n');

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n⚠️ Stopping simulation...');
      this.running = false;
    });

    while (this.running) {
      tick++;
      console.log(`\n📊 Tick ${tick} - ${new Date().toLocaleTimeString()}`);
      console.log('-'.repeat(40));

      // Execute all bots
      const promises = this.bots.map(async ({ bot, market }) => {
        try {
          await bot.execute(market);
          this.metrics.totalTrades += bot.metrics.tradesExecuted;
        } catch (error) {
          console.error(`Error executing ${bot.name}: ${error.message}`);
          this.metrics.errors++;
        }
      });

      await Promise.all(promises);

      // Display metrics every 5 ticks
      if (tick % 5 === 0) {
        this.displayMetrics();
      }

      // Simulate live game updates every 10 ticks
      if (tick % 10 === 0) {
        await this.simulateGameUpdates();
      }

      // Wait for next tick
      await new Promise(resolve => setTimeout(resolve, this.config.tickInterval));
    }

    // Final report
    this.displayFinalReport();
  }

  async simulateGameUpdates() {
    console.log('\n🏈 Simulating game updates...');
    
    for (const [key, market] of this.markets.entries()) {
      // Simulate random game events that might affect trading
      if (Math.random() < 0.3) { // 30% chance of an update
        const events = [
          'Touchdown scored!',
          'Field goal made',
          'Interception!',
          'Fumble recovered',
          'Injury timeout',
          'End of quarter'
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        const team = Math.random() < 0.5 ? market.teamA : market.teamB;
        
        console.log(`  ${team}: ${event}`);
        
        // This could trigger bot reactions in a real system
      }
    }
  }

  displayMetrics() {
    const runtime = (Date.now() - this.metrics.startTime) / 1000;
    const tps = this.metrics.totalTrades / runtime;

    console.log('\n' + '='.repeat(50));
    console.log('📈 METRICS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Runtime: ${Math.floor(runtime / 60)}m ${Math.floor(runtime % 60)}s`);
    console.log(`Markets: ${this.markets.size}`);
    console.log(`Active Bots: ${this.bots.length}`);
    console.log(`Total Trades: ${this.metrics.totalTrades}`);
    console.log(`Trades/Second: ${tps.toFixed(2)}`);
    console.log(`Errors: ${this.metrics.errors}`);
    console.log('='.repeat(50));
  }

  displayFinalReport() {
    console.log('\n\n' + '='.repeat(60));
    console.log('🏁 SIMULATION COMPLETE - PHASE 3 RESULTS');
    console.log('='.repeat(60));

    const runtime = (Date.now() - this.metrics.startTime) / 1000;

    console.log('\n📊 Overall Statistics:');
    console.log(`  Total Runtime: ${Math.floor(runtime / 60)} minutes`);
    console.log(`  Markets Created: ${this.metrics.marketsCreated}`);
    console.log(`  Bots Deployed: ${this.bots.length}`);
    console.log(`  Total Trades: ${this.metrics.totalTrades}`);
    console.log(`  Average TPS: ${(this.metrics.totalTrades / runtime).toFixed(2)}`);
    console.log(`  Errors: ${this.metrics.errors}`);
    console.log(`  Error Rate: ${((this.metrics.errors / this.metrics.totalTrades) * 100).toFixed(2)}%`);

    console.log('\n🤖 Bot Performance:');
    const botTypes = {
      MarketMaker: [],
      Arbitrage: [],
      Momentum: [],
      Retail: [],
      Whale: []
    };

    for (const { bot } of this.bots) {
      const type = bot.name.split('-')[0];
      const metrics = bot.getMetrics();
      
      if (type === 'MM') botTypes.MarketMaker.push(metrics);
      else if (type === 'ARB') botTypes.Arbitrage.push(metrics);
      else if (type === 'MOM') botTypes.Momentum.push(metrics);
      else if (type === 'RETAIL') botTypes.Retail.push(metrics);
      else if (type === 'WHALE') botTypes.Whale.push(metrics);
    }

    for (const [type, bots] of Object.entries(botTypes)) {
      if (bots.length === 0) continue;
      
      const totalTrades = bots.reduce((sum, b) => sum + b.tradesExecuted, 0);
      const totalErrors = bots.reduce((sum, b) => sum + b.errors, 0);
      
      console.log(`\n  ${type} Bots (${bots.length} total):`);
      console.log(`    Total Trades: ${totalTrades}`);
      console.log(`    Avg Trades/Bot: ${(totalTrades / bots.length).toFixed(1)}`);
      console.log(`    Errors: ${totalErrors}`);
    }

    console.log('\n📈 Market Analysis:');
    for (const [key, market] of this.markets.entries()) {
      console.log(`\n  ${market.teamA} vs ${market.teamB}:`);
      console.log(`    Market ID: ${market.publicKey.toBase58().slice(0, 8)}...`);
      console.log(`    Game Time: ${market.game.dateTime}`);
      // In a real system, we'd fetch actual market data here
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PHASE 3 COMPLETE - Sports Data & Automation Integrated!');
    console.log('\nNext Steps:');
    console.log('1. Review bot trading patterns in logs/');
    console.log('2. Analyze market efficiency metrics');
    console.log('3. Fine-tune bot parameters');
    console.log('4. Connect to actual blockchain transactions');
    console.log('5. Proceed to Phase 4: Mobile Integration');
    console.log('='.repeat(60) + '\n');
  }

  async run() {
    try {
      await this.initialize();
      await this.createMarketsFromSportsData();
      await this.initializeBots();
      await this.runSimulation();
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  }
}

// Run the orchestrator
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new Phase3Orchestrator({
    tickInterval: 3000, // 3 second ticks
    maxMarkets: 3, // Start with 3 markets
    botsPerMarket: 10
  });
  
  orchestrator.run().catch(console.error);
}

export default Phase3Orchestrator;
