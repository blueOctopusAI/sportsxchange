// config/markets.ts

// Configuration for your deployed markets and contracts
export const CONFIG = {
  // Your deployed program ID
  PROGRAM_ID: '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH',
  
  // RPC endpoint
  RPC_ENDPOINT: process.env.EXPO_PUBLIC_RPC_URL || 'http://127.0.0.1:8899',
  
  // Your test wallet for local development
  TEST_WALLET: '3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk',
  
  // Known markets (add as you create them)
  MARKETS: [
    {
      marketPda: '2QYdDgN5u4VnAV7bQXtptBHBZpGwNkkfh1bJYuQP4toH',
      gameId: '2024-BONDING-1759936839692',
      teamA: 'CHIEFS',
      teamB: 'RAVENS',
      usdcMint: 'HD9WUV5tugf26UkBLPiD598Hg1kJCJfjMa8UFicgxxDt', // From your last test
    },
    // Add more markets as you create them
  ],
  
  // Bonding curve parameters
  BONDING_CURVE: {
    BASE_PRICE: 100_000,  // 0.0001 SOL per token
    SLOPE: 10_000,        // Price increase rate
  }
};

// Helper to get latest market
export const getLatestMarket = () => {
  return CONFIG.MARKETS[CONFIG.MARKETS.length - 1] || null;
};

// Helper to find market by teams
export const findMarketByTeams = (teamA: string, teamB: string) => {
  return CONFIG.MARKETS.find(
    m => (m.teamA === teamA && m.teamB === teamB) ||
         (m.teamA === teamB && m.teamB === teamA)
  );
};
