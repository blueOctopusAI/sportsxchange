import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SportsXchangeOrchestrator {
  constructor() {
    this.statePath = path.join(__dirname, '../data/agent-state.json');
    this.app = express();
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Main dashboard
    this.app.get('/', (req, res) => {
      const state = this.loadState();
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>SportsXchange Dashboard</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                line-height: 1.6;
              }
              .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
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
              
              .grid { 
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 30px 0;
              }
              
              .card {
                background: #111;
                border: 1px solid #222;
                padding: 20px;
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
              }
              
              .status-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 8px;
              }
              .status-active { background: #4CAF50; }
              .status-inactive { background: #666; }
              .status-error { background: #f44336; }
              
              .market-list {
                background: #111;
                border: 1px solid #222;
                margin: 20px 0;
              }
              
              .market-item {
                padding: 15px 20px;
                border-bottom: 1px solid #1a1a1a;
              }
              
              .market-item:last-child { border-bottom: none; }
              
              .market-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              }
              
              .market-teams {
                font-size: 16px;
                color: #fff;
              }
              
              .market-status {
                font-size: 11px;
                padding: 3px 8px;
                background: #1a1a1a;
                color: #4CAF50;
                text-transform: uppercase;
              }
              
              .market-details {
                font-size: 11px;
                color: #666;
                font-family: monospace;
              }
              
              .address {
                font-family: monospace;
                font-size: 10px;
                color: #444;
                word-break: break-all;
              }
              
              .refresh-notice {
                position: fixed;
                bottom: 20px;
                right: 20px;
                font-size: 11px;
                color: #444;
              }
              
              .actions {
                margin-top: 30px;
                display: flex;
                gap: 15px;
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
              }
              
              button:hover {
                border-color: #4CAF50;
                color: #4CAF50;
              }
            </style>
            <meta http-equiv="refresh" content="30">
          </head>
          <body>
            <div class="container">
              <header>
                <h1>SportsXchange Agent Dashboard</h1>
                <nav>
                  <a href="/" class="active">Overview</a>
                  <a href="/markets">Markets</a>
                  <a href="/status">System Status</a>
                  <a href="/api/status">API</a>
                </nav>
              </header>
              
              <div class="grid">
                <div class="card">
                  <h2>Markets</h2>
                  <div class="metric">
                    <span class="metric-value">${state.stats.totalMarketsCreated || 0}</span>
                  </div>
                  <div class="metric-label">Total Created</div>
                </div>
                
                <div class="card">
                  <h2>Active Pools</h2>
                  <div class="metric">
                    <span class="metric-value">${state.activeMarkets.length}</span>
                  </div>
                  <div class="metric-label">Currently Trading</div>
                </div>
                
                <div class="card">
                  <h2>Resolved Games</h2>
                  <div class="metric">
                    <span class="metric-value">${state.stats.totalGamesResolved || 0}</span>
                  </div>
                  <div class="metric-label">Completed</div>
                </div>
                
                <div class="card">
                  <h2>System Status</h2>
                  <div style="margin-top: 10px;">
                    <div style="margin: 5px 0;">
                      <span class="status-indicator ${state.lastSchedulerRun ? 'status-active' : 'status-inactive'}"></span>
                      <span style="font-size: 12px;">Scheduler</span>
                    </div>
                    <div style="margin: 5px 0;">
                      <span class="status-indicator status-inactive"></span>
                      <span style="font-size: 12px;">Market Maker</span>
                    </div>
                    <div style="margin: 5px 0;">
                      <span class="status-indicator status-inactive"></span>
                      <span style="font-size: 12px;">Resolver</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <h2 style="font-size: 14px; margin-top: 40px; margin-bottom: 20px; color: #888;">RECENT MARKETS</h2>
              <div class="market-list">
                ${state.activeMarkets.slice(0, 5).map(m => {
                  const teams = m.gameId.split('-').slice(-2).join(' vs ');
                  return `
                    <div class="market-item">
                      <div class="market-header">
                        <span class="market-teams">${teams}</span>
                        <span class="market-status">Active</span>
                      </div>
                      <div class="market-details">
                        <div>Market: <span class="address">${m.marketPda}</span></div>
                        <div>Pool: <span class="address">${m.poolPda}</span></div>
                      </div>
                    </div>
                  `;
                }).join('')}
                ${state.activeMarkets.length === 0 ? '<div class="market-item"><span style="color: #666;">No active markets</span></div>' : ''}
              </div>
              
              <div class="actions">
                <form action="/trigger/scheduler" method="post" style="display: inline;">
                  <button type="submit">Run Scheduler</button>
                </form>
                <form action="/reset" method="post" style="display: inline;">
                  <button type="submit">Reset State</button>
                </form>
              </div>
              
              <div class="refresh-notice">Auto-refresh: 30s</div>
            </div>
          </body>
        </html>
      `);
    });

    // Markets page
    this.app.get('/markets', (req, res) => {
      const state = this.loadState();
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Markets - SportsXchange</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                line-height: 1.6;
              }
              .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
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
              
              .markets-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              
              .markets-table th {
                text-align: left;
                padding: 12px;
                border-bottom: 1px solid #333;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #666;
              }
              
              .markets-table td {
                padding: 12px;
                border-bottom: 1px solid #1a1a1a;
                font-size: 13px;
              }
              
              .markets-table tr:hover {
                background: #111;
              }
              
              .address-cell {
                font-family: monospace;
                font-size: 11px;
                color: #666;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              
              .status-badge {
                display: inline-block;
                padding: 2px 8px;
                font-size: 10px;
                text-transform: uppercase;
                background: #1a1a1a;
                color: #4CAF50;
              }
              
              .section-header {
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #888;
                margin: 40px 0 20px 0;
              }
            </style>
            <meta http-equiv="refresh" content="30">
          </head>
          <body>
            <div class="container">
              <header>
                <h1>Markets</h1>
                <nav>
                  <a href="/">Overview</a>
                  <a href="/markets" class="active">Markets</a>
                  <a href="/status">System Status</a>
                  <a href="/api/status">API</a>
                </nav>
              </header>
              
              <div class="section-header">Active Markets (${state.activeMarkets.length})</div>
              <table class="markets-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Market Address</th>
                    <th>Pool Address</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.activeMarkets.map(m => {
                    const teams = m.gameId.split('-').slice(-2).join(' vs ');
                    const created = new Date(m.createdAt).toLocaleString();
                    return `
                      <tr>
                        <td style="font-weight: 500; color: #fff;">${teams}</td>
                        <td class="address-cell">${m.marketPda}</td>
                        <td class="address-cell">${m.poolPda}</td>
                        <td style="color: #666;">${created}</td>
                        <td><span class="status-badge">Active</span></td>
                      </tr>
                    `;
                  }).join('')}
                  ${state.activeMarkets.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #666;">No active markets</td></tr>' : ''}
                </tbody>
              </table>
              
              <div class="section-header">Completed Games (${state.completedGames.length})</div>
              ${state.completedGames.length === 0 ? '<p style="color: #666;">No completed games yet</p>' : ''}
            </div>
          </body>
        </html>
      `);
    });

    // Status page
    this.app.get('/status', (req, res) => {
      const state = this.loadState();
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>System Status - SportsXchange</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                line-height: 1.6;
              }
              .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
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
              
              .status-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 30px;
                margin: 30px 0;
              }
              
              .status-section {
                background: #111;
                border: 1px solid #222;
                padding: 20px;
              }
              
              .status-section h2 {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #666;
                margin-bottom: 15px;
              }
              
              .status-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #1a1a1a;
              }
              
              .status-row:last-child { border-bottom: none; }
              
              .status-label {
                font-size: 13px;
                color: #888;
              }
              
              .status-value {
                font-size: 13px;
                color: #fff;
                font-family: monospace;
              }
              
              .error-log {
                background: #111;
                border: 1px solid #222;
                padding: 20px;
                margin-top: 30px;
              }
              
              .error-item {
                padding: 10px;
                margin: 10px 0;
                background: #1a0a0a;
                border-left: 3px solid #f44336;
                font-size: 12px;
                font-family: monospace;
                color: #ff6b6b;
              }
            </style>
            <meta http-equiv="refresh" content="10">
          </head>
          <body>
            <div class="container">
              <header>
                <h1>System Status</h1>
                <nav>
                  <a href="/">Overview</a>
                  <a href="/markets">Markets</a>
                  <a href="/status" class="active">System Status</a>
                  <a href="/api/status">API</a>
                </nav>
              </header>
              
              <div class="status-grid">
                <div class="status-section">
                  <h2>Statistics</h2>
                  <div class="status-row">
                    <span class="status-label">Markets Created</span>
                    <span class="status-value">${state.stats.totalMarketsCreated || 0}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Active Markets</span>
                    <span class="status-value">${state.activeMarkets.length}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Processed Games</span>
                    <span class="status-value">${state.processedGames.length}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Resolved Games</span>
                    <span class="status-value">${state.stats.totalGamesResolved || 0}</span>
                  </div>
                </div>
                
                <div class="status-section">
                  <h2>Agent Status</h2>
                  <div class="status-row">
                    <span class="status-label">Scheduler</span>
                    <span class="status-value">${state.lastSchedulerRun ? new Date(state.lastSchedulerRun).toLocaleString() : 'Never'}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Market Maker</span>
                    <span class="status-value">Not Implemented</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Resolver</span>
                    <span class="status-value">Not Implemented</span>
                  </div>
                </div>
              </div>
              
              ${state.errors.length > 0 ? `
                <div class="error-log">
                  <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 15px;">Recent Errors</h2>
                  ${state.errors.slice(-5).map(e => `
                    <div class="error-item">
                      ${e.timestamp}: ${e.error || e.message}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `);
    });

    // API endpoint
    this.app.get('/api/status', (req, res) => {
      const state = this.loadState();
      res.json({
        stats: state.stats,
        lastRuns: {
          scheduler: state.lastSchedulerRun,
          marketMaker: state.lastMarketMakerRun,
          resolver: state.lastResolverRun
        },
        activeMarkets: state.activeMarkets,
        processedGames: state.processedGames,
        errors: state.errors.slice(-5)
      });
    });

    // Trigger scheduler
    this.app.post('/trigger/scheduler', (req, res) => {
      res.redirect('/');
    });

    // Reset state
    this.app.post('/reset', (req, res) => {
      const emptyState = {
        processedGames: [],
        activeMarkets: [],
        completedGames: [],
        lastSchedulerRun: null,
        lastResolverRun: null,
        lastMarketMakerRun: null,
        errors: [],
        stats: {
          totalMarketsCreated: 0,
          totalGamesResolved: 0,
          totalTradesExecuted: 0
        }
      };
      fs.writeFileSync(this.statePath, JSON.stringify(emptyState, null, 2));
      res.redirect('/');
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

  async start() {
    console.log('\n' + '='.repeat(60));
    console.log('SPORTSXCHANGE ORCHESTRATOR');
    console.log('='.repeat(60));
    
    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => {
      console.log(`\nDashboard: http://localhost:${PORT}`);
      console.log('\nAvailable endpoints:');
      console.log('  /         - Dashboard');
      console.log('  /markets  - Market list');
      console.log('  /status   - System status');
      console.log('  /api/status - JSON API');
      console.log('\n' + '='.repeat(60));
    });
  }
}

const orchestrator = new SportsXchangeOrchestrator();
orchestrator.start().catch(console.error);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
