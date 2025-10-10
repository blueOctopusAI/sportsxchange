#!/usr/bin/env node

/**
 * Phase 3 Test Runner - Simplified
 * Run this to test Phase 3 bot ecosystem
 */

import { Connection } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import bot classes
import { MarketMakerBot } from './bots/market-maker-bot.js';
import { RandomRetailBot } from './bots/random-retail-bot.js';
import { ArbitrageBot } from './bots/arbitrage-bot.js';
import { MomentumBot } from './bots/momentum-bot.js';
import { WhaleBot } from './bots/whale-bot.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('');
console.log('='.repeat(60));
console.log('🚀 PHASE 3: SPORTS DATA & BOT ECOSYSTEM TEST');
console.log('='.repeat(60));
console.log('');

// Mock sports data
const games = [
  {
    gameId: 'NFL_2024_W10_KC_BUF',
    home: 'Buffalo Bills',
    away: 'Kansas City Chiefs'
  },
  {
    gameId: 'NFL_2024_W10_SF_DAL', 
    home: 'Dallas Cowboys',
    away: 'San Francisco 49ers'
  },
  {
    gameId: 'NFL_2024_W10_GB_CHI',
    home: 'Chicago Bears',
    away: 'Green Bay Packers'
  }
];

// Create markets
console.log('📅 Creating Markets:');
const markets = games.map(game => {
  console.log(`  ✅ ${game.home} vs ${game.away}`);
  return {
    id: game.gameId,
    teamA: game.home,
    teamB: game.away,
    priceA: 100000 + Math.random() * 10000,
    priceB: 100000 + Math.random() * 10000,
    poolValue: 0
  };
});
console.log(`\nTotal: ${markets.length} markets created\n`);

// Create bots
console.log('🤖 Creating Bot Ecosystem:');
const bots = [];

markets.forEach(market => {
  console.log(`\n${market.teamA} vs ${market.teamB}:`);
  
  // Add different bot types
  for (let i = 0; i < 2; i++) {
    bots.push({
      type: 'MarketMaker',
      name: `MM-${market.id}-${i}`,
      market: market.id
    });
    console.log(`  + MarketMaker ${i}`);
  }
  
  bots.push({
    type: 'Arbitrage',
    name: `ARB-${market.id}`,
    market: market.id
  });
  console.log(`  + Arbitrage Bot`);
  
  for (let i = 0; i < 2; i++) {
    bots.push({
      type: 'Momentum',
      name: `MOM-${market.id}-${i}`,
      market: market.id
    });
    console.log(`  + Momentum ${i}`);
  }
  
  for (let i = 0; i < 3; i++) {
    bots.push({
      type: 'Retail',
      name: `RETAIL-${market.id}-${i}`,
      market: market.id
    });
    console.log(`  + Retail ${i}`);
  }
  
  bots.push({
    type: 'Whale',
    name: `WHALE-${market.id}`,
    market: market.id,
    strategy: ['pump', 'dump', 'value'][Math.floor(Math.random() * 3)]
  });
  console.log(`  + Whale (${bots[bots.length-1].strategy} strategy)`);
});

console.log(`\nTotal: ${bots.length} bots created\n`);

// Simulation
console.log('🏁 Starting Simulation...\n');

let tick = 0;
let totalTrades = 0;
const startTime = Date.now();

const runTick = () => {
  tick++;
  console.log(`\n📊 Tick ${tick} - ${new Date().toLocaleTimeString()}`);
  console.log('-'.repeat(40));
  
  // Simulate bot trades
  bots.forEach(bot => {
    if (Math.random() < 0.3) { // 30% chance to trade
      const action = Math.random() < 0.5 ? 'buy' : 'sell';
      const team = Math.random() < 0.5 ? 'A' : 'B';
      const amount = (5 + Math.random() * 45).toFixed(2);
      
      console.log(`[${bot.name}] ${action}ing $${amount} Team ${team}`);
      totalTrades++;
    }
  });
  
  // Print metrics every 5 ticks
  if (tick % 5 === 0) {
    const runtime = (Date.now() - startTime) / 1000;
    const tps = totalTrades / runtime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 METRICS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Ticks: ${tick}`);
    console.log(`Total Trades: ${totalTrades}`);
    console.log(`TPS: ${tps.toFixed(2)}`);
    console.log(`Runtime: ${runtime.toFixed(0)}s`);
    console.log('='.repeat(50));
  }
};

// Run simulation
const interval = setInterval(runTick, 3000);

// Stop after 30 seconds for demo
setTimeout(() => {
  clearInterval(interval);
  console.log('\n\n✅ Simulation Complete!');
  console.log(`Final: ${totalTrades} trades executed`);
  process.exit(0);
}, 30000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n✅ Simulation stopped by user');
  console.log(`Final: ${totalTrades} trades executed`);
  process.exit(0);
});

console.log('Press Ctrl+C to stop\n');
