#!/bin/bash

# Quick script to get test USDC

echo "💰 Getting Test USDC for SportsXchange"
echo "======================================"
echo ""

# Default wallet address (your test wallet)
WALLET=${1:-"3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk"}
AMOUNT=${2:-1000}

echo "Wallet: $WALLET"
echo "Amount: $AMOUNT USDC"
echo ""

# Run the faucet
node usdc-faucet.js $WALLET $AMOUNT

echo ""
echo "✅ Ready to trade on SportsXchange!"
