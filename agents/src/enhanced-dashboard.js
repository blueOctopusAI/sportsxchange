import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global event emitter for bot activity
export const dashboardEvents = new EventEmitter();

class EnhancedDashboard {
  constructor() {
    this.statePath = path.join(__dirname, '../data/agent-state.json');
    this.phase3DataPath = path.join(__dirname, '../data/phase3-state.json');
    this.app = express();
    
    // In-memory storage for real-time data
    this.liveData = {
      bots: new Map(),
      markets: new Map(),
      trades: [],
      metrics: {
        totalTrades: 0,
        totalVolume: 0,
        startTime: Date.now(),
        tps: 0
      }
    };

    this.setupEventListeners();
    this.setupRoutes();
  }

  setupEventListeners() {
    // Listen for bot events
    dashboardEvents.on('bot:trade', (data) => {
      this.liveData.trades.push({
        ...data,
        timestamp: Date.now()
      });
      // Keep only last 100 trades
      if (this.liveData.trades.length > 100) {
        this.liveData.trades.shift();
      }
      this.liveData.metrics.totalTrades++;
      this.updateTPS();
    });

    dashboardEvents.on('bot:update', (data) => {
      this.liveData.bots.set(data.name, data);
    });

    dashboardEvents.on('market:update', (data) => {
      this.liveData.markets.set(data.id, data);
    });

    dashboardEvents.on('phase3:tick', (data) => {
      this.liveData.currentTick = data;
    });
  }

  updateTPS() {
    const runtime = (Date.now() - this.liveData.metrics.startTime) / 1000;
    this.liveData.metrics.tps = this.liveData.metrics.totalTrades / runtime;
  }

  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Enhanced dashboard with Phase 3 visualization
    this.app.get('/', (req, res) => {
      const state = this.loadState();
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>SportsXchange Dashboard - Phase 3</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                line-height: 1.6;
              }
              .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
              
              header { 
                border-bottom: 1px solid #333;
                padding: 20px 0;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              
              h1 { 
                font-size: 24px;
                font-weight: 400;
                color: #fff;
                letter-spacing: -0.5px;
              }
              
              .phase-indicator {
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              nav { 
                margin-top: 20px;
                display: flex;
                gap: 30px;
              }
              
              nav a { 
                color: #888;
                text-decoration: none;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: color 0.2s;
              }
              nav a:hover { color: #fff; }
              nav a.active { color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 2px; }
              
              .grid { 
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
              }
              
              .card {
                background: #111;
                border: 1px solid #222;
                padding: 20px;
                border-radius: 8px;
                position: relative;
                overflow: hidden;
              }
              
              .card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, #4CAF50, #2196F3);
                opacity: 0;
                transition: opacity 0.3s;
              }
              
              .card.active::before {
                opacity: 1;
              }
              
              .card h2 {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #666;
                margin-bottom: 15px;
              }
              
              .metric {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin-bottom: 8px;
              }
              
              .metric-value {
                font-size: 28px;
                font-weight: 300;
                color: #fff;
              }
              
              .metric-label {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
              }
              
              .metric-change {
                font-size: 11px;
                margin-left: 8px;
              }
              
              .positive { color: #4CAF50; }
              .negative { color: #f44336; }
              
              /* Bot Activity Section */
              .bot-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
              }
              
              .bot-card {
                background: #151515;
                border: 1px solid #252525;
                padding: 15px;
                border-radius: 6px;
                transition: all 0.2s;
              }
              
              .bot-card.trading {
                border-color: #4CAF50;
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
              }
              
              .bot-name {
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              }
              
              .bot-type {
                display: inline-block;
                padding: 2px 6px;
                background: #1a1a1a;
                color: #4CAF50;
                font-size: 9px;
                border-radius: 3px;
                margin-left: 5px;
              }
              
              .bot-stats {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                font-size: 11px;
              }
              
              .bot-stat {
                text-align: center;
              }
              
              .bot-stat-value {
                color: #fff;
                font-size: 14px;
                font-weight: 500;
              }
              
              .bot-stat-label {
                color: #666;
                font-size: 9px;
                text-transform: uppercase;
                margin-top: 2px;
              }
              
              /* Live Trade Feed */
              .trade-feed {
                background: #111;
                border: 1px solid #222;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                max-height: 400px;
                overflow-y: auto;
              }
              
              .trade-feed h3 {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #666;
                margin-bottom: 15px;
              }
              
              .trade-item {
                padding: 10px;
                border-bottom: 1px solid #1a1a1a;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s;
              }
              
              .trade-item:hover {
                background: #151515;
              }
              
              .trade-info {
                flex: 1;
              }
              
              .trade-bot {
                font-size: 11px;
                color: #888;
              }
              
              .trade-action {
                font-size: 12px;
                color: #fff;
                margin: 2px 0;
              }
              
              .trade-action .buy { color: #4CAF50; }
              .trade-action .sell { color: #f44336; }
              
              .trade-time {
                font-size: 10px;
                color: #666;
              }
              
              /* Market visualization */
              .market-viz {
                background: #111;
                border: 1px solid #222;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
              }
              
              .market-item {
                padding: 15px;
                border-bottom: 1px solid #1a1a1a;
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr;
                align-items: center;
              }
              
              .market-teams {
                font-size: 14px;
                color: #fff;
                font-weight: 500;
              }
              
              .market-price {
                text-align: center;
              }
              
              .price-value {
                font-size: 16px;
                color: #4CAF50;
                font-weight: 600;
              }
              
              .price-label {
                font-size: 10px;
                color: #666;
                text-transform: uppercase;
              }
              
              /* Controls */
              .controls {
                display: flex;
                gap: 15px;
                margin: 20px 0;
              }
              
              button {
                background: transparent;
                border: 1px solid #333;
                color: #888;
                padding: 10px 20px;
                font-family: inherit;
                font-size: 12px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: all 0.2s;
                border-radius: 4px;
              }
              
              button:hover {
                border-color: #4CAF50;
                color: #4CAF50;
              }
              
              button.active {
                background: #4CAF50;
                color: #000;
                border-color: #4CAF50;
              }
              
              .status-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 8px;
                animation: pulse 2s infinite;
              }
              
              @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
              }
              
              .status-active { background: #4CAF50; }
              .status-inactive { background: #666; }
              .status-error { background: #f44336; }
              
              /* Chart placeholder */
              .chart-container {
                background: #0f0f0f;
                border: 1px solid #222;
                border-radius: 8px;
                padding: 20px;
                height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
              }
              
              .refresh-notice {
                position: fixed;
                bottom: 20px;
                right: 20px;
                font-size: 11px;
                color: #444;
                background: #111;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #222;
              }
            </style>
            <script>
              // Auto-refresh every 2 seconds for live data
              setTimeout(() => location.reload(), 2000);
              
              // Add some interactivity
              document.addEventListener('DOMContentLoaded', () => {
                // Animate cards on load
                document.querySelectorAll('.card').forEach((card, i) => {
                  setTimeout(() => {
                    card.classList.add('active');
                  }, i * 100);
                });
              });
            </script>
          </head>
          <body>
            <div class="container">
              <header>
                <div>
                  <h1>SportsXchange Dashboard</h1>
                  <nav>
                    <a href="/" class="active">Overview</a>
                    <a href="/phase3">Phase 3 Bots</a>
                    <a href="/markets">Markets</a>
                    <a href="/trades">Live Trades</a>
                    <a href="/api/status">API</a>
                  </nav>
                </div>
                <div class="phase-indicator">Phase 3: Testing</div>
              </header>
              
              <div class="grid">
                <div class="card active">
                  <h2>Total Markets</h2>
                  <div class="metric">
                    <span class="metric-value">${this.liveData.markets.size}</span>
                  </div>
                  <div class="metric-label">Active Markets</div>
                </div>
                
                <div class="card active">
                  <h2>Active Bots</h2>
                  <div class="metric">
                    <span class="metric-value">${this.liveData.bots.size}</span>
                  </div>
                  <div class="metric-label">Trading Agents</div>
                </div>
                
                <div class="card active">
                  <h2>Total Trades</h2>
                  <div class="metric">
                    <span class="metric-value">${this.liveData.metrics.totalTrades}</span>
                    <span class="metric-change positive">+${this.liveData.trades.length} recent</span>
                  </div>
                  <div class="metric-label">Executed Trades</div>
                </div>
                
                <div class="card active">
                  <h2>Performance</h2>
                  <div class="metric">
                    <span class="metric-value">${this.liveData.metrics.tps.toFixed(2)}</span>
                  </div>
                  <div class="metric-label">Trades Per Second</div>
                </div>
                
                <div class="card active">
                  <h2>System Status</h2>
                  <div style="margin-top: 10px;">
                    <div style="margin: 5px 0;">
                      <span class="status-indicator status-active"></span>
                      <span style="font-size: 12px;">Phase 3 Orchestrator</span>
                    </div>
                    <div style="margin: 5px 0;">
                      <span class="status-indicator ${this.liveData.bots.size > 0 ? 'status-active' : 'status-inactive'}"></span>
                      <span style="font-size: 12px;">Bot Ecosystem</span>
                    </div>
                    <div style="margin: 5px 0;">
                      <span class="status-indicator ${this.liveData.markets.size > 0 ? 'status-active' : 'status-inactive'}"></span>
                      <span style="font-size: 12px;">Sports Data</span>
                    </div>
                  </div>
                </div>
                
                <div class="card active">
                  <h2>Current Tick</h2>
                  <div class="metric">
                    <span class="metric-value">${this.liveData.currentTick || 0}</span>
                  </div>
                  <div class="metric-label">Simulation Cycle</div>
                </div>
              </div>
              
              <div class="controls">
                <button onclick="fetch('/api/phase3/start', {method: 'POST'}).then(() => location.reload())">
                  Start Phase 3
                </button>
                <button onclick="fetch('/api/phase3/stop', {method: 'POST'}).then(() => location.reload())">
                  Stop Simulation
                </button>
                <button onclick="location.href='/phase3'">
                  View Bot Details
                </button>
                <button onclick="location.href='/trades'">
                  Live Trade Feed
                </button>
              </div>
              
              <div class="chart-container">
                <div>Price & Volume Chart (Coming Soon)</div>
              </div>
              
              <div class="trade-feed">
                <h3>Recent Activity</h3>
                ${this.liveData.trades.slice(-10).reverse().map(trade => `
                  <div class="trade-item">
                    <div class="trade-info">
                      <div class="trade-bot">${trade.bot || 'Unknown Bot'}</div>
                      <div class="trade-action">
                        <span class="${trade.type}">${trade.type?.toUpperCase() || 'TRADE'}</span>
                        ${trade.amount ? `$${trade.amount.toFixed(2)} USDC` : ''}
                        ${trade.team ? `Team ${trade.team}` : ''}
                      </div>
                    </div>
                    <div class="trade-time">${new Date(trade.timestamp).toLocaleTimeString()}</div>
                  </div>
                `).join('')}
                ${this.liveData.trades.length === 0 ? '<div style="text-align: center; color: #666; padding: 20px;">No trades yet. Start Phase 3 to begin simulation.</div>' : ''}
              </div>
              
              <div class="refresh-notice">
                <span class="status-indicator status-active"></span>
                Live Updates: 2s
              </div>
            </div>
          </body>
        </html>
      `);
    });

    // Phase 3 Bot Details Page
    this.app.get('/phase3', (req, res) => {
      const botArray = Array.from(this.liveData.bots.values());
      const botsByType = {
        'MarketMaker': botArray.filter(b => b.type === 'MarketMaker'),
        'Arbitrage': botArray.filter(b => b.type === 'Arbitrage'),
        'Momentum': botArray.filter(b => b.type === 'Momentum'),
        'Retail': botArray.filter(b => b.type === 'Retail'),
        'Whale': botArray.filter(b => b.type === 'Whale')
      };

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Phase 3 Bot Ecosystem</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                line-height: 1.6;
              }
              .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
              
              header { 
                border-bottom: 1px solid #333;
                padding: 20px 0;
                margin-bottom: 30px;
              }
              
              h1 { 
                font-size: 24px;
                font-weight: 400;
                color: #fff;
                letter-spacing: -0.5px;
              }
              
              nav { 
                margin-top: 20px;
                display: flex;
                gap: 30px;
              }
              
              nav a { 
                color: #888;
                text-decoration: none;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: color 0.2s;
              }
              nav a:hover { color: #fff; }
              nav a.active { color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 2px; }
              
              .bot-type-section {
                margin: 30px 0;
              }
              
              .section-header {
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #888;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              
              .bot-count {
                background: #1a1a1a;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                color: #4CAF50;
              }
              
              .bot-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
              }
              
              .bot-detail-card {
                background: #111;
                border: 1px solid #222;
                border-radius: 8px;
                padding: 20px;
                transition: all 0.2s;
              }
              
              .bot-detail-card:hover {
                border-color: #333;
                transform: translateY(-2px);
              }
              
              .bot-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
              }
              
              .bot-name {
                font-size: 13px;
                color: #fff;
                font-weight: 500;
              }
              
              .bot-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #4CAF50;
              }
              
              .bot-metrics {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-top: 15px;
              }
              
              .bot-metric {
                background: #0a0a0a;
                padding: 8px;
                border-radius: 4px;
              }
              
              .bot-metric-value {
                font-size: 16px;
                color: #fff;
                font-weight: 600;
              }
              
              .bot-metric-label {
                font-size: 10px;
                color: #666;
                text-transform: uppercase;
                margin-top: 2px;
              }
              
              .bot-strategy {
                margin-top: 15px;
                padding: 10px;
                background: #0a0a0a;
                border-radius: 4px;
                font-size: 11px;
                color: #888;
              }
            </style>
            <script>
              setTimeout(() => location.reload(), 3000);
            </script>
          </head>
          <body>
            <div class="container">
              <header>
                <h1>Phase 3 Bot Ecosystem</h1>
                <nav>
                  <a href="/">Overview</a>
                  <a href="/phase3" class="active">Phase 3 Bots</a>
                  <a href="/markets">Markets</a>
                  <a href="/trades">Live Trades</a>
                  <a href="/api/status">API</a>
                </nav>
              </header>
              
              ${Object.entries(botsByType).map(([type, bots]) => `
                <div class="bot-type-section">
                  <div class="section-header">
                    ${type} Bots
                    <span class="bot-count">${bots.length}</span>
                  </div>
                  <div class="bot-grid">
                    ${bots.map(bot => `
                      <div class="bot-detail-card">
                        <div class="bot-header">
                          <span class="bot-name">${bot.name}</span>
                          <span class="bot-status"></span>
                        </div>
                        <div class="bot-metrics">
                          <div class="bot-metric">
                            <div class="bot-metric-value">${bot.tradesExecuted || 0}</div>
                            <div class="bot-metric-label">Trades</div>
                          </div>
                          <div class="bot-metric">
                            <div class="bot-metric-value">${bot.errors || 0}</div>
                            <div class="bot-metric-label">Errors</div>
                          </div>
                        </div>
                        ${bot.strategy ? `
                          <div class="bot-strategy">
                            Strategy: ${bot.strategy}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                    ${bots.length === 0 ? '<div style="color: #666;">No bots of this type active</div>' : ''}
                  </div>
                </div>
              `).join('')}
              
              ${botArray.length === 0 ? `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                  <h2 style="font-size: 18px; margin-bottom: 10px;">No Bots Active</h2>
                  <p>Start Phase 3 simulation to see bot activity</p>
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `);
    });

    // Live trades page
    this.app.get('/trades', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Live Trade Feed</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                line-height: 1.6;
              }
              .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
              
              header { 
                border-bottom: 1px solid #333;
                padding: 20px 0;
                margin-bottom: 30px;
              }
              
              h1 { 
                font-size: 24px;
                font-weight: 400;
                color: #fff;
                letter-spacing: -0.5px;
              }
              
              nav { 
                margin-top: 20px;
                display: flex;
                gap: 30px;
              }
              
              nav a { 
                color: #888;
                text-decoration: none;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: color 0.2s;
              }
              nav a:hover { color: #fff; }
              nav a.active { color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 2px; }
              
              .trade-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              
              .trade-table th {
                text-align: left;
                padding: 12px;
                border-bottom: 1px solid #333;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #666;
              }
              
              .trade-table td {
                padding: 12px;
                border-bottom: 1px solid #1a1a1a;
                font-size: 13px;
              }
              
              .trade-table tr:hover {
                background: #111;
              }
              
              .buy { color: #4CAF50; }
              .sell { color: #f44336; }
              
              .trade-bot {
                font-size: 11px;
                color: #888;
              }
              
              .trade-amount {
                font-weight: 600;
                color: #fff;
              }
            </style>
            <script>
              setTimeout(() => location.reload(), 1000);
            </script>
          </head>
          <body>
            <div class="container">
              <header>
                <h1>Live Trade Feed</h1>
                <nav>
                  <a href="/">Overview</a>
                  <a href="/phase3">Phase 3 Bots</a>
                  <a href="/markets">Markets</a>
                  <a href="/trades" class="active">Live Trades</a>
                  <a href="/api/status">API</a>
                </nav>
              </header>
              
              <table class="trade-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Bot</th>
                    <th>Type</th>
                    <th>Team</th>
                    <th>Amount</th>
                    <th>Market</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.liveData.trades.slice(-50).reverse().map(trade => `
                    <tr>
                      <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
                      <td class="trade-bot">${trade.bot || 'Unknown'}</td>
                      <td class="${trade.type}">${trade.type?.toUpperCase() || 'TRADE'}</td>
                      <td>${trade.team || '-'}</td>
                      <td class="trade-amount">${trade.amount ? `$${trade.amount.toFixed(2)}` : '-'}</td>
                      <td style="font-size: 11px; color: #666;">${trade.market || 'Simulation'}</td>
                    </tr>
                  `).join('')}
                  ${this.liveData.trades.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #666; padding: 40px;">No trades yet. Start Phase 3 simulation to see activity.</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `);
    });

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json({
        phase: 'Phase 3',
        metrics: this.liveData.metrics,
        bots: Array.from(this.liveData.bots.values()),
        markets: Array.from(this.liveData.markets.values()),
        recentTrades: this.liveData.trades.slice(-20),
        currentTick: this.liveData.currentTick || 0
      });
    });

    // Control endpoints
    this.app.post('/api/phase3/start', async (req, res) => {
      // Import and start Phase 3 orchestrator
      try {
        const { default: Phase3Orchestrator } = await import('../phase3-orchestrator.js');
        
        // Create instance with dashboard integration
        const orchestrator = new Phase3Orchestrator({
          tickInterval: 3000,
          maxMarkets: 3,
          botsPerMarket: 10,
          dashboard: this // Pass dashboard instance
        });
        
        // Store reference
        this.orchestrator = orchestrator;
        
        // Start in background
        orchestrator.run().catch(console.error);
        
        res.json({ success: true, message: 'Phase 3 started' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/phase3/stop', (req, res) => {
      if (this.orchestrator) {
        this.orchestrator.running = false;
        res.json({ success: true, message: 'Phase 3 stopped' });
      } else {
        res.json({ success: false, message: 'Phase 3 not running' });
      }
    });

    // WebSocket support for real-time updates (optional enhancement)
    this.app.get('/api/stream', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const sendUpdate = () => {
        res.write(`data: ${JSON.stringify({
          metrics: this.liveData.metrics,
          latestTrade: this.liveData.trades[this.liveData.trades.length - 1],
          botCount: this.liveData.bots.size,
          currentTick: this.liveData.currentTick
        })}\n\n`);
      };
      
      const interval = setInterval(sendUpdate, 1000);
      
      req.on('close', () => {
        clearInterval(interval);
      });
    });
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
    } catch {
      return {
        processedGames: [],
        activeMarkets: [],
        completedGames: [],
        errors: [],
        stats: {}
      };
    }
  }

  // Method to update bot data from Phase 3
  updateBotData(bot, market) {
    dashboardEvents.emit('bot:update', {
      name: bot.name,
      type: bot.constructor.name,
      tradesExecuted: bot.metrics?.tradesExecuted || 0,
      errors: bot.metrics?.errors || 0,
      strategy: bot.strategy || null
    });
  }

  // Method to log trades
  logTrade(bot, type, team, amount, market) {
    dashboardEvents.emit('bot:trade', {
      bot: bot.name,
      type,
      team,
      amount,
      market: market.gameId
    });
  }

  async start() {
    console.log('\n' + '='.repeat(60));
    console.log('SPORTSXCHANGE ENHANCED DASHBOARD');
    console.log('='.repeat(60));
    
    const PORT = process.env.DASHBOARD_PORT || 3000;
    this.app.listen(PORT, () => {
      console.log(`\n✅ Dashboard: http://localhost:${PORT}`);
      console.log('\n📊 Available Views:');
      console.log('  /         - Overview with Phase 3 metrics');
      console.log('  /phase3   - Bot ecosystem details');
      console.log('  /markets  - Active markets');
      console.log('  /trades   - Live trade feed');
      console.log('  /api/status - JSON API');
      console.log('\n🎮 Controls:');
      console.log('  Start Phase 3 from dashboard');
      console.log('  Real-time updates every 2 seconds');
      console.log('\n' + '='.repeat(60));
    });
  }
}

// Export for use by other modules
export default EnhancedDashboard;

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new EnhancedDashboard();
  dashboard.start().catch(console.error);
}
