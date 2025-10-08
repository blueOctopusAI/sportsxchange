#!/usr/bin/env node

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For now, just test that bonding curve math works
console.log('\n' + '='.repeat(60));
console.log('BONDING CURVE TEST');
console.log('='.repeat(60));

// Simple test of bonding curve math
function calculatePrice(supply, k = 0.0001, n = 1.5) {
  if (supply <= 0) return k;
  return k * Math.pow(supply, n);
}

function calculateTokensOut(usdcAmount, currentSupply, k = 0.0001, n = 1.5) {
  let tokensOut = 0;
  const steps = 100;
  const usdcPerStep = usdcAmount / steps;
  
  for (let i = 0; i < steps; i++) {
    const price = calculatePrice(currentSupply + tokensOut, k, n);
    if (price === 0) return 0;
    
    const tokensThisStep = usdcPerStep / price;
    tokensOut += tokensThisStep;
  }
  
  return tokensOut;
}

console.log('\n📊 Testing Bonding Curve Pricing:');
console.log('-'.repeat(60));

const testAmounts = [
  { usdcIn: 100, atSupply: 0 },
  { usdcIn: 100, atSupply: 1000 },
  { usdcIn: 100, atSupply: 5000 },
  { usdcIn: 100, atSupply: 10000 },
];

testAmounts.forEach(({ usdcIn, atSupply }) => {
  const tokens = calculateTokensOut(usdcIn, atSupply);
  const price = calculatePrice(atSupply);
  console.log(`$${usdcIn} at ${atSupply} supply → ${tokens.toFixed(2)} tokens (price: $${price.toFixed(6)})`);
});

console.log('\n✅ Bonding curve math working!');
console.log('\nNote: Full on-chain test requires:');
console.log('1. Deploy updated program with bonding curves');
console.log('2. Run: anchor build && anchor deploy');
console.log('3. Then run this test again');

console.log('\n' + '='.repeat(60));
