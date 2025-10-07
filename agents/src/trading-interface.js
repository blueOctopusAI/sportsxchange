import express from 'express';
import { TradingClient } from './trading-cli.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TradingInterface {
  constructor() {
    this.app = express();
    this.client = new TradingClient();
    this.setupRoutes();
  }

  async initialize() {
    await this.client.initialize();
  }

  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Main trading interface
    this.app.get('/', async (req, res) => {
      const state = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/agent-state.json'), 'utf-8'));
      
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>SportsXchange Trading</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'SF Mono', Monaco, monospace;
                background: #0a0a0a;
                color: #e0e0e0;
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
              }
              h1 { 
                font-size: 24px;
                font-weight: 400;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 1px solid #333;
              }
              .market-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                gap: 20px;
                margin: 30px 0;
              }
              .market-card {
                background: #111;
                border: 1px solid #222;
                padding: 20px;
              }
              .market-header {
                font-size: 18px;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #222;
              }
              .teams {
                color: #fff;
                font-weight: 500;
              }
              .pool-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 15px 0;
                padding: 15px;
                background: #0a0a0a;
                border: 1px solid #1a1a1a;
              }
              .info-item {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
              }
              .label {
                color: #666;
                font-size: 11px;
                text-transform: uppercase;
              }
              .value {
                color: #fff;
                font-weight: 500;
              }
              .trading-section {
                margin: 20px 0;
              }
              .trading-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 15px 0;
              }
              button {
                background: transparent;
                border: 1px solid #333;
                color: #888;
                padding: 12px;
                font-family: inherit;
                font-size: 13px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                transition: all 0.2s;
              }
              button:hover {
                border-color: #4CAF50;
                color: #4CAF50;
                background: rgba(76, 175, 80, 0.05);
              }
              button.sell:hover {
                border-color: #f44336;
                color: #f44336;
                background: rgba(244, 67, 54, 0.05);
              }
              
              /* Pulsing animation for fund button */
              @keyframes pulse {
                0%, 100% {
                  border-color: #4CAF50;
                  box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
                }
                50% {
                  border-color: #66BB6A;
                  box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
                }
              }
              button.fund-btn {
                position: relative;
              }
              button.fund-btn.pulse {
                animation: pulse 2s infinite;
                border-color: #4CAF50;
                color: #4CAF50;
              }
              button.fund-btn.pulse:hover {
                animation: none;
                background: rgba(76, 175, 80, 0.1);
              }
              
              input {
                width: 100%;
                padding: 10px;
                background: #0a0a0a;
                border: 1px solid #333;
                color: #fff;
                font-family: inherit;
                margin: 5px 0;
              }
              input:focus {
                outline: none;
                border-color: #4CAF50;
              }
              .address {
                font-size: 10px;
                color: #444;
                word-break: break-all;
                margin: 5px 0;
              }
              .status {
                padding: 10px;
                margin: 10px 0;
                background: #0a0a0a;
                border: 1px solid #222;
                font-size: 12px;
              }
              .success {
                border-color: #4CAF50;
                color: #4CAF50;
              }
              .error {
                border-color: #f44336;
                color: #f44336;
              }
              .balance-section {
                padding: 15px;
                background: #0a0a0a;
                border: 1px solid #1a1a1a;
                margin: 15px 0;
              }
              .balance-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
              }
              .home { color: #4CAF50; }
              .away { color: #2196F3; }
            </style>
          </head>
          <body>
            <h1>Trading Interface</h1>
            
            <div class="market-grid">
              ${state.activeMarkets.map(market => {
                const teams = market.gameId.split('-').slice(-2);
                return `
                  <div class="market-card">
                    <div class="market-header">
                      <span class="teams">${teams[0]} vs ${teams[1]}</span>
                    </div>
                    
                    <div class="address">Market: ${market.marketPda}</div>
                    
                    <div class="pool-info" id="pool-${market.marketPda}">
                      <div>
                        <div class="label">Loading pool data...</div>
                      </div>
                    </div>
                    
                    <div class="balance-section" id="balance-${market.marketPda}">
                      <div class="label">Your Balance</div>
                      <div class="balance-row">
                        <span>Loading...</span>
                      </div>
                    </div>
                    
                    <div class="trading-section">
                      <div style="margin-bottom: 10px;">
                        <div class="label">Fund Account (Get Test Tokens)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 100px; gap: 5px;">
                          <input type="number" id="fund-home-${market.marketPda}" placeholder="HOME amount" value="100">
                          <input type="number" id="fund-away-${market.marketPda}" placeholder="AWAY amount" value="100">
                          <button id="fund-btn-${market.marketPda}" class="fund-btn pulse" onclick="fundAccount('${market.marketPda}')">Fund</button>
                        </div>
                      </div>
                      
                      <div class="label">Trade</div>
                      <input type="number" id="amount-${market.marketPda}" placeholder="Amount" value="10">
                      
                      <div class="trading-buttons">
                        <button onclick="buyHome('${market.marketPda}')">Buy ${teams[0]}</button>
                        <button onclick="buyAway('${market.marketPda}')">Buy ${teams[1]}</button>
                      </div>
                    </div>
                    
                    <div id="status-${market.marketPda}"></div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <script>
              // Track which markets have been funded
              const fundedMarkets = new Set();
              
              async function loadPoolInfo(marketPda) {
                try {
                  const res = await fetch('/api/pool/' + marketPda);
                  const data = await res.json();
                  
                  document.getElementById('pool-' + marketPda).innerHTML = \`
                    <div>
                      <div class="info-item">
                        <span class="label">Home Reserve</span>
                        <span class="value">\${data.homeReserve.toFixed(2)}</span>
                      </div>
                      <div class="info-item">
                        <span class="label">Away Reserve</span>
                        <span class="value">\${data.awayReserve.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div class="info-item">
                        <span class="label">Home Prob</span>
                        <span class="value home">\${data.homeProb}</span>
                      </div>
                      <div class="info-item">
                        <span class="label">Away Prob</span>
                        <span class="value away">\${data.awayProb}</span>
                      </div>
                    </div>
                  \`;
                } catch (e) {
                  console.error('Failed to load pool info:', e);
                }
              }
              
              async function loadBalance(marketPda) {
                try {
                  const res = await fetch('/api/balance/' + marketPda);
                  const data = await res.json();
                  
                  document.getElementById('balance-' + marketPda).innerHTML = \`
                    <div class="label">Your Balance</div>
                    <div class="balance-row">
                      <span>HOME: <span class="home">\${data.homeBalance.toFixed(2)}</span></span>
                      <span>AWAY: <span class="away">\${data.awayBalance.toFixed(2)}</span></span>
                    </div>
                  \`;
                  
                  // If user has balance, stop pulsing the fund button
                  if (data.homeBalance > 0 || data.awayBalance > 0) {
                    fundedMarkets.add(marketPda);
                    const fundBtn = document.getElementById('fund-btn-' + marketPda);
                    if (fundBtn) {
                      fundBtn.classList.remove('pulse');
                    }
                  }
                } catch (e) {
                  console.error('Failed to load balance:', e);
                }
              }
              
              async function fundAccount(marketPda) {
                const homeAmount = document.getElementById('fund-home-' + marketPda).value;
                const awayAmount = document.getElementById('fund-away-' + marketPda).value;
                
                try {
                  const res = await fetch('/api/fund', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ marketPda, homeAmount, awayAmount })
                  });
                  
                  const result = await res.json();
                  showStatus(marketPda, result.success ? 'success' : 'error', result.message);
                  
                  if (result.success) {
                    // Stop pulsing after successful funding
                    fundedMarkets.add(marketPda);
                    const fundBtn = document.getElementById('fund-btn-' + marketPda);
                    if (fundBtn) {
                      fundBtn.classList.remove('pulse');
                    }
                    
                    loadBalance(marketPda);
                    loadPoolInfo(marketPda);
                  }
                } catch (e) {
                  showStatus(marketPda, 'error', 'Transaction failed: ' + e.message);
                }
              }
              
              async function buyHome(marketPda) {
                const amount = document.getElementById('amount-' + marketPda).value;
                await trade(marketPda, 'buy-home', amount);
              }
              
              async function buyAway(marketPda) {
                const amount = document.getElementById('amount-' + marketPda).value;
                await trade(marketPda, 'buy-away', amount);
              }
              
              async function trade(marketPda, action, amount) {
                // Check if user has been funded first
                if (!fundedMarkets.has(marketPda)) {
                  showStatus(marketPda, 'error', 'Please fund your account first!');
                  // Make the fund button pulse more noticeably
                  const fundBtn = document.getElementById('fund-btn-' + marketPda);
                  if (fundBtn) {
                    fundBtn.style.animation = 'pulse 0.5s 3';
                    setTimeout(() => {
                      fundBtn.style.animation = 'pulse 2s infinite';
                    }, 1500);
                  }
                  return;
                }
                
                try {
                  const res = await fetch('/api/trade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ marketPda, action, amount })
                  });
                  
                  const result = await res.json();
                  showStatus(marketPda, result.success ? 'success' : 'error', result.message);
                  
                  if (result.success) {
                    loadBalance(marketPda);
                    loadPoolInfo(marketPda);
                  }
                } catch (e) {
                  showStatus(marketPda, 'error', 'Transaction failed: ' + e.message);
                }
              }
              
              function showStatus(marketPda, type, message) {
                const statusEl = document.getElementById('status-' + marketPda);
                statusEl.className = 'status ' + type;
                statusEl.textContent = message;
                setTimeout(() => {
                  statusEl.textContent = '';
                }, 5000);
              }
              
              // Load initial data
              ${state.activeMarkets.map(m => `
                loadPoolInfo('${m.marketPda}');
                loadBalance('${m.marketPda}');
              `).join('')}
              
              // Refresh every 10 seconds
              setInterval(() => {
                ${state.activeMarkets.map(m => `
                  loadPoolInfo('${m.marketPda}');
                  loadBalance('${m.marketPda}');
                `).join('')}
              }, 10000);
            </script>
          </body>
        </html>
      `);
    });

    // API endpoints
    this.app.get('/api/pool/:marketPda', async (req, res) => {
      try {
        const poolInfo = await this.client.getPoolInfo(req.params.marketPda);
        res.json(poolInfo);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/balance/:marketPda', async (req, res) => {
      try {
        const balance = await this.client.getBalance(req.params.marketPda);
        res.json(balance);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/fund', async (req, res) => {
      try {
        const { marketPda, homeAmount, awayAmount } = req.body;
        const result = await this.client.fundUser(
          marketPda,
          parseInt(homeAmount),
          parseInt(awayAmount)
        );
        res.json({
          success: true,
          message: `Funded: ${homeAmount} HOME, ${awayAmount} AWAY`,
          result
        });
      } catch (error) {
        res.json({ success: false, message: error.message });
      }
    });

    this.app.post('/api/trade', async (req, res) => {
      try {
        const { marketPda, action, amount } = req.body;
        const direction = action === 'buy-home' ? 'away_for_home' : 'home_for_away';
        const result = await this.client.swap(marketPda, direction, parseInt(amount));
        
        res.json({
          success: true,
          message: `Swapped ${amount} tokens, got ~${result.expectedOut.toFixed(2)} out`,
          result
        });
      } catch (error) {
        res.json({ success: false, message: error.message });
      }
    });
  }

  async start() {
    const PORT = process.env.TRADING_PORT || 3001;
    this.app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('TRADING INTERFACE');
      console.log('='.repeat(60));
      console.log(`\nInterface: http://localhost:${PORT}`);
      console.log('\nFeatures:');
      console.log('  - Fund accounts with test tokens');
      console.log('  - Buy/sell HOME and AWAY tokens');
      console.log('  - View pool reserves and probabilities');
      console.log('  - Check your balances');
      console.log('\n' + '='.repeat(60));
    });
  }
}

const tradingInterface = new TradingInterface();
tradingInterface.initialize().then(() => {
  tradingInterface.start();
}).catch(console.error);
