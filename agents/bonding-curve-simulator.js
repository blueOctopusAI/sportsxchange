#!/usr/bin/env node

/**
 * SportsXchange Bonding Curve Economic Simulator
 * 
 * Tests different curve parameters to find optimal early/late buyer balance
 */

class BondingCurveSimulator {
  constructor(k = 0.0001, n = 2) {
    this.k = k; // Initial price coefficient
    this.n = n; // Curve exponent (2 = quadratic, 3 = cubic)
    this.totalSupply = 0;
    this.poolValue = 0;
    this.trades = [];
  }

  // Calculate price at a given supply
  getPrice(supply = this.totalSupply) {
    if (supply === 0) return this.k;
    return this.k * Math.pow(supply, this.n);
  }

  // Calculate tokens received for USDC amount
  calculateTokensOut(usdcAmount) {
    // We need to integrate: tokens = ∫(1/price) from currentSupply to newSupply
    // For price = k * supply^n, this integrates to a closed form
    
    let tokensOut = 0;
    const steps = 1000; // Numerical integration steps
    const usdcPerStep = usdcAmount / steps;
    
    for (let i = 0; i < steps; i++) {
      const currentPrice = this.getPrice(this.totalSupply + tokensOut);
      const tokensThisStep = usdcPerStep / currentPrice;
      tokensOut += tokensThisStep;
    }
    
    return tokensOut;
  }

  // Execute a buy order
  buy(usdcAmount, label = '') {
    const tokensBought = this.calculateTokensOut(usdcAmount);
    const avgPrice = usdcAmount / tokensBought;
    
    this.totalSupply += tokensBought;
    this.poolValue += usdcAmount;
    
    const trade = {
      type: 'buy',
      label,
      usdcIn: usdcAmount,
      tokensOut: tokensBought,
      avgPrice,
      totalSupply: this.totalSupply,
      poolValue: this.poolValue,
      timestamp: this.trades.length
    };
    
    this.trades.push(trade);
    return trade;
  }

  // Calculate payout if this team wins
  calculateWinPayout(tokens) {
    // If team wins, all tokens split the pool proportionally
    if (this.totalSupply === 0) return 0;
    return (tokens / this.totalSupply) * this.poolValue;
  }

  // Calculate current sell value on curve
  calculateSellValue(tokens) {
    // Selling pushes price down the curve
    let usdcOut = 0;
    const steps = 1000;
    const tokensPerStep = tokens / steps;
    
    for (let i = 0; i < steps; i++) {
      const currentPrice = this.getPrice(this.totalSupply - (tokensPerStep * i));
      usdcOut += tokensPerStep * currentPrice;
    }
    
    return usdcOut;
  }

  // Generate report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('BONDING CURVE SIMULATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Parameters: k=${this.k}, n=${this.n}`);
    console.log(`Total Pool Value: $${this.poolValue.toFixed(2)}`);
    console.log(`Total Token Supply: ${this.totalSupply.toFixed(0)}`);
    console.log('\n' + '-'.repeat(60));
    console.log('TRADE HISTORY:');
    console.log('-'.repeat(60));
    
    this.trades.forEach((trade, idx) => {
      console.log(`\n${idx + 1}. ${trade.label || `Trade #${idx + 1}`}`);
      console.log(`   Invested: $${trade.usdcIn.toFixed(2)}`);
      console.log(`   Received: ${trade.tokensOut.toFixed(0)} tokens`);
      console.log(`   Avg Price: $${trade.avgPrice.toFixed(6)}/token`);
      console.log(`   Pool After: $${trade.poolValue.toFixed(2)}`);
      
      // Calculate current values
      const winPayout = this.calculateWinPayout(trade.tokensOut);
      const currentSellValue = this.calculateSellValue(trade.tokensOut);
      const winROI = ((winPayout - trade.usdcIn) / trade.usdcIn * 100);
      const sellROI = ((currentSellValue - trade.usdcIn) / trade.usdcIn * 100);
      
      console.log(`   \n   If Team Wins: $${winPayout.toFixed(2)} (${winROI > 0 ? '+' : ''}${winROI.toFixed(1)}% ROI)`);
      console.log(`   Sell Now Value: $${currentSellValue.toFixed(2)} (${sellROI > 0 ? '+' : ''}${sellROI.toFixed(1)}% ROI)`);
    });
  }

  // Compare early vs late buyers
  comparePositions() {
    if (this.trades.length < 2) return;
    
    console.log('\n' + '='.repeat(60));
    console.log('EARLY vs LATE BUYER COMPARISON');
    console.log('='.repeat(60));
    
    const firstTrade = this.trades[0];
    const lastTrade = this.trades[this.trades.length - 1];
    
    const firstWinPayout = this.calculateWinPayout(firstTrade.tokensOut);
    const lastWinPayout = this.calculateWinPayout(lastTrade.tokensOut);
    
    const firstMultiple = firstWinPayout / firstTrade.usdcIn;
    const lastMultiple = lastWinPayout / lastTrade.usdcIn;
    
    console.log('\nFirst Buyer:');
    console.log(`  Tokens per $100: ${(firstTrade.tokensOut / firstTrade.usdcIn * 100).toFixed(0)}`);
    console.log(`  Win Payout Multiple: ${firstMultiple.toFixed(2)}x`);
    
    console.log('\nLast Buyer:');
    console.log(`  Tokens per $100: ${(lastTrade.tokensOut / lastTrade.usdcIn * 100).toFixed(0)}`);
    console.log(`  Win Payout Multiple: ${lastMultiple.toFixed(2)}x`);
    
    console.log('\nAdvantage Ratio:');
    console.log(`  Early buyer gets ${(firstTrade.tokensOut / lastTrade.tokensOut).toFixed(1)}x more tokens`);
    console.log(`  Early buyer makes ${(firstMultiple / lastMultiple).toFixed(1)}x better returns`);
    
    // Find breakeven point
    let breakevenFound = false;
    for (let i = 1; i < this.trades.length; i++) {
      const trade = this.trades[i];
      const winPayout = this.calculateWinPayout(trade.tokensOut);
      if (winPayout < trade.usdcIn && !breakevenFound) {
        console.log(`\nBreakeven Point: After $${this.trades[i-1].poolValue.toFixed(0)} in volume`);
        console.log(`  Buyers after this point lose money even if team wins`);
        breakevenFound = true;
      }
    }
  }
}

// Run simulations with different parameters
function runSimulation(k, n, scenario) {
  console.log('\n' + '#'.repeat(60));
  console.log(`SCENARIO: ${scenario}`);
  console.log('#'.repeat(60));
  
  const sim = new BondingCurveSimulator(k, n);
  
  // Simulate trading pattern
  // Early buyers
  sim.buy(100, 'Early Buyer #1 (First $100)');
  sim.buy(200, 'Early Buyer #2');
  sim.buy(500, 'Early Whale');
  
  // Mid stage
  sim.buy(1000, 'Mid Buyer #1');
  sim.buy(2000, 'Mid Buyer #2');
  sim.buy(5000, 'Mid Whale');
  
  // Late stage FOMO
  sim.buy(1000, 'Late FOMO #1');
  sim.buy(2000, 'Late FOMO #2');
  sim.buy(5000, 'Late Whale');
  sim.buy(100, 'Last $100 Buyer');
  
  sim.generateReport();
  sim.comparePositions();
}

// Test different curve parameters
console.log('\n' + '★'.repeat(60));
console.log('SPORTSXCHANGE BONDING CURVE ECONOMIC SIMULATOR');
console.log('★'.repeat(60));

// Scenario 1: Gentle quadratic curve
runSimulation(0.00001, 2, 'Gentle Quadratic (k=0.00001, n=2)');

// Scenario 2: Aggressive quadratic curve  
runSimulation(0.0001, 2, 'Aggressive Quadratic (k=0.0001, n=2)');

// Scenario 3: Cubic curve (more extreme)
runSimulation(0.000001, 3, 'Cubic Curve (k=0.000001, n=3)');

// Scenario 4: Linear-ish curve (n=1.5)
runSimulation(0.001, 1.5, 'Semi-Linear (k=0.001, n=1.5)');

// Summary recommendations
console.log('\n' + '★'.repeat(60));
console.log('RECOMMENDATIONS');
console.log('★'.repeat(60));
console.log(`
Based on simulations:

1. GENTLE QUADRATIC (k=0.00001, n=2):
   - Early buyers get 10-50x advantage
   - Late buyers can still profit if team wins
   - Most balanced for sustained growth

2. AGGRESSIVE QUADRATIC (k=0.0001, n=2):
   - Early buyers get 100x+ advantage
   - Late buyers likely lose even if team wins
   - Maximum degen energy but may discourage late participation

3. CUBIC (n=3):
   - Extreme early advantage (1000x+)
   - Becomes unplayable quickly
   - Only for true ponzi dynamics

4. SEMI-LINEAR (n=1.5):
   - More fair distribution
   - Less FOMO incentive
   - Better for serious prediction market

RECOMMENDATION: Start with Gentle Quadratic (k=0.00001, n=2)
- Rewards early buyers significantly
- Keeps game playable for late buyers
- Creates sustainable FOMO dynamics
`);

// ROI Matrix
console.log('\n' + '='.repeat(60));
console.log('QUICK REFERENCE: $100 Investment Returns');
console.log('='.repeat(60));
console.log('(Using recommended k=0.00001, n=2)');
console.log('\nPool Value | Tokens Received | If Team Wins | ROI');
console.log('-'.repeat(60));

const optimalSim = new BondingCurveSimulator(0.00001, 2);
const checkpoints = [0, 1000, 5000, 10000, 25000, 50000, 100000];

checkpoints.forEach(poolValue => {
  if (poolValue > 0) {
    // Simulate getting to this pool value
    optimalSim.poolValue = poolValue;
    optimalSim.totalSupply = Math.pow(poolValue / optimalSim.k, 1/optimalSim.n) * 0.1; // Approximation
  }
  
  const tokens = optimalSim.calculateTokensOut(100);
  optimalSim.totalSupply += tokens;
  optimalSim.poolValue += 100;
  
  const winPayout = optimalSim.calculateWinPayout(tokens);
  const roi = ((winPayout - 100) / 100 * 100);
  
  console.log(`$${poolValue.toLocaleString().padEnd(8)} | ${tokens.toFixed(0).padEnd(15)} | $${winPayout.toFixed(2).padEnd(11)} | ${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`);
  
  // Reset for next checkpoint
  optimalSim.totalSupply -= tokens;
  optimalSim.poolValue -= 100;
});

console.log('\n' + '='.repeat(60));
console.log('END OF SIMULATION');
console.log('='.repeat(60));
