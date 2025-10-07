import { SolanaClient } from '../lib/solana-client.js';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SchedulerAgent {
  constructor() {
    this.client = new SolanaClient();
    this.statePath = path.join(__dirname, '../data/agent-state.json');
    this.state = this.loadState();
    this.isProcessing = false;
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
    } catch {
      return {
        processedGames: [],
        activeMarkets: [],
        lastSchedulerRun: null,
        errors: [],
        stats: {
          totalMarketsCreated: 0
        }
      };
    }
  }

  saveState() {
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  async processWeeklySchedule() {
    if (this.isProcessing) {
      console.log('⏭️  Already processing, skipping this run');
      return;
    }

    this.isProcessing = true;
    console.log('\n' + '='.repeat(50));
    console.log('📅 SCHEDULER AGENT - Processing Weekly Schedule');
    console.log('   Time:', new Date().toISOString());
    console.log('='.repeat(50));

    try {
      // Load test schedule
      const schedulePath = path.join(__dirname, '../data/schedules/week-10-test.json');
      const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
      
      console.log(`\n📋 Found ${schedule.games.length} games in Week ${schedule.week}`);

      let created = 0;
      let skipped = 0;
      let failed = 0;

      for (const game of schedule.games) {
        // Check if already processed
        if (this.state.processedGames.includes(game.gameId)) {
          console.log(`\n⏭️  Skipping ${game.gameId} (already processed)`);
          skipped++;
          continue;
        }

        console.log(`\n🎮 Processing: ${game.gameId}`);
        console.log(`   ${game.awayTeam} @ ${game.homeTeam}`);
        console.log(`   Kickoff: ${new Date(game.kickoff).toLocaleString()}`);

        try {
          // Create market
          console.log('   Creating market...');
          const marketResult = await this.client.createMarket(
            game.gameId,
            game.homeTeam,
            game.awayTeam
          );

          // Initialize pool
          console.log('   Initializing pool...');
          const poolResult = await this.client.initializePool(
            marketResult.marketPda,
            marketResult.homeMint,
            marketResult.awayMint
          );

          // Update game data
          game.marketPda = marketResult.marketPda;
          game.poolPda = poolResult.poolPda;
          game.status = 'market_created';

          // Update state
          this.state.processedGames.push(game.gameId);
          this.state.activeMarkets.push({
            gameId: game.gameId,
            marketPda: marketResult.marketPda,
            poolPda: poolResult.poolPda,
            createdAt: new Date().toISOString()
          });
          this.state.stats.totalMarketsCreated++;
          
          created++;
          console.log(`   ✅ Market created successfully!`);

          // Save state after each successful creation
          this.saveState();

          // Save updated schedule
          fs.writeFileSync(schedulePath, JSON.stringify(schedule, null, 2));

        } catch (error) {
          console.error(`   ❌ Failed to create market:`, error.message);
          this.state.errors.push({
            gameId: game.gameId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          failed++;
          this.saveState();
        }

        // Small delay between markets to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Update last run time
      this.state.lastSchedulerRun = new Date().toISOString();
      this.saveState();

      console.log('\n' + '='.repeat(50));
      console.log('📊 SCHEDULER SUMMARY');
      console.log(`   ✅ Created: ${created} markets`);
      console.log(`   ⏭️  Skipped: ${skipped} markets`);
      console.log(`   ❌ Failed: ${failed} markets`);
      console.log(`   📈 Total Markets: ${this.state.stats.totalMarketsCreated}`);
      console.log('='.repeat(50) + '\n');

    } catch (error) {
      console.error('❌ Scheduler error:', error);
      this.state.errors.push({
        type: 'scheduler_crash',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      this.saveState();
    } finally {
      this.isProcessing = false;
    }
  }

  async start() {
    console.log('🚀 Starting Scheduler Agent');
    console.log('   Mode: TEST (runs every minute)');
    console.log('   Watching: data/schedules/week-10-test.json');
    
    // Initialize Solana client
    await this.client.initialize();
    
    // Run immediately on start
    await this.processWeeklySchedule();

    // Schedule for every minute (testing)
    cron.schedule('* * * * *', async () => {
      console.log('\n⏰ Scheduler wake up:', new Date().toLocaleTimeString());
      await this.processWeeklySchedule();
    });

    // For production: Run every Thursday at 10am
    // cron.schedule('0 10 * * 4', async () => {
    //   await this.processWeeklySchedule();
    // });

    console.log('✅ Scheduler is running (CTRL+C to stop)');
  }
}

// Start the agent
const agent = new SchedulerAgent();
agent.start().catch(console.error);

// Keep process alive
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Scheduler Agent...');
  process.exit(0);
});
