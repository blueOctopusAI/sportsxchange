// hooks/useMarkets.ts
import { useState, useEffect, useCallback } from 'react';
import { SportsXchangeClient } from '../src/SportsXchangeClient';

export interface Market {
  gameId: string;
  marketPda: string;
  teamA: string;
  teamB: string;
  teamASupply: number;
  teamBSupply: number;
  poolValue: number;
  volume24h: number;
  lastPrice: number;
  priceChange24h: number;
  teamAProb: number;
  teamBProb: number;
}

// Initialize client
const client = new SportsXchangeClient(
  'http://127.0.0.1:8899', // Local cluster
  '7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH' // Your program ID
);

// Set the test USDC mint from your last market creation
// You'll need to update this with the actual USDC mint from your test
client.setUsdcMint('2xSDtGc2P5vsW5uU1oun1BzvFwZWv3QzJLwgxJTXDf9F');

export const useMarkets = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch real markets
      const realMarkets = await client.getAllMarkets();
      
      if (realMarkets.length > 0) {
        // Convert to app format
        const formattedMarkets = realMarkets.map(m => {
          const probs = client.calculateProbabilities(m);
          return {
            gameId: m.gameId,
            marketPda: m.marketPda,
            teamA: m.teamA,
            teamB: m.teamB,
            teamASupply: m.teamASupply,
            teamBSupply: m.teamBSupply,
            poolValue: m.poolValue,
            volume24h: m.poolValue * 2.5, // Estimate
            lastPrice: m.basePrice / 1_000_000,
            priceChange24h: 0, // Would need historical data
            teamAProb: probs.teamAProb,
            teamBProb: probs.teamBProb,
          };
        });
        
        setMarkets(formattedMarkets);
      } else {
        // Fall back to mock data if no real markets
        const mockMarkets: Market[] = [
          {
            gameId: '2024-TEST-KC-BAL',
            marketPda: 'MockMarket1',
            teamA: 'KC',
            teamB: 'BAL',
            teamASupply: 5234,
            teamBSupply: 3122,
            poolValue: 45234,
            volume24h: 125000,
            lastPrice: 0.10,
            priceChange24h: 45.2,
            teamAProb: 62.6,
            teamBProb: 37.4,
          },
        ];
        setMarkets(mockMarkets);
      }
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
      
      // Use mock data on error
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  return { markets, loading, error, refetch: fetchMarkets, client };
};
