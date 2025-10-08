import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Types
interface Market {
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
}

interface PricePoint {
  time: number;
  price: number;
  volume: number;
}

interface Trade {
  trader: string;
  team: string;
  action: 'buy' | 'sell';
  amount: number;
  tokens: number;
  price: number;
  timestamp: number;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [tradingModal, setTradingModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Trading state
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [tradeAmount, setTradeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Price chart data
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  
  // User balances
  const [userBalances, setUserBalances] = useState({
    USDC: 1000,
    positions: {} as Record<string, number>
  });

  // Mock markets with bonding curve data
  const mockMarkets: Market[] = [
    {
      gameId: '2024-WEEK10-KC-BAL',
      marketPda: 'HVoN6gYHdxeixkyBBtTNchu4x6MwsL9UNoY1fAiZrsTA',
      teamA: 'KC',
      teamB: 'BAL',
      teamASupply: 5234,
      teamBSupply: 3122,
      poolValue: 45234,
      volume24h: 125000,
      lastPrice: 8.65,
      priceChange24h: 45.2,
    },
    {
      gameId: '2024-WEEK10-DET-HOU',
      marketPda: 'AV5tb52EJgVh7eLEcDcmu4GYdXuAJBpBcyyNEbYHw9Zm',
      teamA: 'DET',
      teamB: 'HOU',
      teamASupply: 1234,
      teamBSupply: 2111,
      poolValue: 12300,
      volume24h: 45000,
      lastPrice: 3.21,
      priceChange24h: -12.3,
    },
  ];

  // Mock price history
  const generatePriceHistory = () => {
    const points: PricePoint[] = [];
    let price = 0.0001;
    for (let i = 0; i < 50; i++) {
      price = price * (1 + (Math.random() - 0.3) * 0.2);
      points.push({
        time: Date.now() - (50 - i) * 60000,
        price,
        volume: Math.random() * 1000
      });
    }
    return points;
  };

  // Mock recent trades
  const generateRecentTrades = (): Trade[] => {
    const trades: Trade[] = [];
    const actions: ('buy' | 'sell')[] = ['buy', 'buy', 'buy', 'sell'];
    const teams = ['KC', 'BAL'];
    
    for (let i = 0; i < 10; i++) {
      trades.push({
        trader: `0x${Math.random().toString(16).substr(2, 8)}...`,
        team: teams[Math.floor(Math.random() * teams.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        amount: Math.floor(Math.random() * 500) + 50,
        tokens: Math.floor(Math.random() * 1000) + 10,
        price: Math.random() * 10 + 0.5,
        timestamp: Date.now() - Math.floor(Math.random() * 3600000)
      });
    }
    
    return trades.sort((a, b) => b.timestamp - a.timestamp);
  };

  useEffect(() => {
    setMarkets(mockMarkets);
    setPriceHistory(generatePriceHistory());
    setRecentTrades(generateRecentTrades());
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    setTimeout(() => {
      setWalletAddress('3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk');
      setConnected(true);
      setLoading(false);
    }, 1000);
  };

  const calculateTokensOut = (usdcAmount: number, currentSupply: number) => {
    const k = 0.0001;
    const n = 1.5;
    let tokensOut = 0;
    const steps = 100;
    const usdcPerStep = usdcAmount / steps;
    
    for (let i = 0; i < steps; i++) {
      const price = k * Math.pow(currentSupply + tokensOut, n);
      if (price === 0) return 0;
      tokensOut += usdcPerStep / price;
    }
    
    return tokensOut;
  };

  const executeTrade = async () => {
    if (!selectedMarket || !tradeAmount || parseFloat(tradeAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    
    setTimeout(() => {
      const amount = parseFloat(tradeAmount);
      const team = selectedTeam === 'A' ? selectedMarket.teamA : selectedMarket.teamB;
      const currentSupply = selectedTeam === 'A' ? selectedMarket.teamASupply : selectedMarket.teamBSupply;
      
      if (tradeAction === 'buy') {
        const tokensOut = calculateTokensOut(amount, currentSupply);
        
        setUserBalances(prev => ({
          ...prev,
          USDC: prev.USDC - amount,
          positions: {
            ...prev.positions,
            [team]: (prev.positions[team] || 0) + tokensOut
          }
        }));
        
        Alert.alert('Success!', `Bought ${tokensOut.toFixed(2)} ${team} tokens for $${amount}`);
      }
      
      setIsProcessing(false);
      setTradingModal(false);
      setTradeAmount('');
    }, 1500);
  };

  const MarketCard = ({ market }: { market: Market }) => {
    const isPositive = market.priceChange24h > 0;
    const userPosition = userBalances.positions[market.teamA] || 0;
    const userPositionB = userBalances.positions[market.teamB] || 0;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => {
          setSelectedMarket(market);
          setTradingModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.teams}>{market.teamA} vs {market.teamB}</Text>
          <View style={[styles.priceChange, isPositive ? styles.positive : styles.negative]}>
            <Text style={styles.priceChangeText}>
              {isPositive ? '+' : ''}{market.priceChange24h.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Price</Text>
            <Text style={styles.statValue}>${market.lastPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pool</Text>
            <Text style={styles.statValue}>${(market.poolValue / 1000).toFixed(1)}k</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Vol</Text>
            <Text style={styles.statValue}>${(market.volume24h / 1000).toFixed(1)}k</Text>
          </View>
        </View>

        {(userPosition > 0 || userPositionB > 0) && (
          <View style={styles.positionBar}>
            <Text style={styles.positionLabel}>Your Position</Text>
            {userPosition > 0 && (
              <Text style={styles.positionValue}>{market.teamA}: {userPosition.toFixed(2)}</Text>
            )}
            {userPositionB > 0 && (
              <Text style={styles.positionValue}>{market.teamB}: {userPositionB.toFixed(2)}</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.tradeButton}>
          <Text style={styles.tradeButtonText}>TRADE</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const PriceChart = () => {
    if (priceHistory.length === 0) return null;
    
    const maxPrice = Math.max(...priceHistory.map(p => p.price));
    const minPrice = Math.min(...priceHistory.map(p => p.price));
    const priceRange = maxPrice - minPrice;
    
    return (
      <View style={styles.chart}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Price Chart</Text>
          <Text style={styles.currentPrice}>${priceHistory[priceHistory.length - 1].price.toFixed(4)}</Text>
        </View>
        <View style={styles.chartContainer}>
          <View style={styles.chartLine}>
            {priceHistory.map((point, index) => {
              const height = ((point.price - minPrice) / priceRange) * 100;
              return (
                <View
                  key={index}
                  style={[
                    styles.chartBar,
                    { height: `${height}%` }
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const RecentTradesFeed = () => (
    <View style={styles.tradesFeed}>
      <Text style={styles.feedTitle}>Recent Trades</Text>
      <ScrollView style={styles.tradesScroll} showsVerticalScrollIndicator={false}>
        {recentTrades.map((trade, index) => (
          <View key={index} style={styles.tradeItem}>
            <View style={styles.tradeInfo}>
              <Text style={[styles.tradeAction, trade.action === 'buy' ? styles.buyText : styles.sellText]}>
                {trade.action.toUpperCase()}
              </Text>
              <Text style={styles.tradeTeam}>{trade.team}</Text>
              <Text style={styles.tradeAmount}>${trade.amount}</Text>
            </View>
            <Text style={styles.tradeTime}>
              {new Date(trade.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <View style={styles.header}>
        <Text style={styles.title}>SportsXchange</Text>
        {connected ? (
          <View style={styles.walletInfo}>
            <Text style={styles.balanceText}>${userBalances.USDC.toFixed(2)}</Text>
            <TouchableOpacity style={styles.walletButton}>
              <Text style={styles.walletText}>
                {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={connectWallet} style={styles.connectButton}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectText}>Connect</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor="#4CAF50"
          />
        }
      >
        {!connected ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Connect wallet to start trading</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>🔥 Hot Markets</Text>
            {markets.map((market, index) => (
              <MarketCard key={index} market={market} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Trading Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={tradingModal}
        onRequestClose={() => setTradingModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedMarket?.teamA} vs {selectedMarket?.teamB}
              </Text>
              <TouchableOpacity onPress={() => setTradingModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <PriceChart />
            
            <View style={styles.actionTabs}>
              <TouchableOpacity
                style={[styles.tab, tradeAction === 'buy' && styles.tabActive]}
                onPress={() => setTradeAction('buy')}
              >
                <Text style={[styles.tabText, tradeAction === 'buy' && styles.tabTextActive]}>
                  BUY
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tradeAction === 'sell' && styles.tabActive]}
                onPress={() => setTradeAction('sell')}
              >
                <Text style={[styles.tabText, tradeAction === 'sell' && styles.tabTextActive]}>
                  SELL
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.teamSelection}>
              <TouchableOpacity
                style={[styles.teamButton, selectedTeam === 'A' && styles.teamButtonActive]}
                onPress={() => setSelectedTeam('A')}
              >
                <Text style={[styles.teamButtonText, selectedTeam === 'A' && styles.teamButtonTextActive]}>
                  {selectedMarket?.teamA}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamButton, selectedTeam === 'B' && styles.teamButtonActive]}
                onPress={() => setSelectedTeam('B')}
              >
                <Text style={[styles.teamButtonText, selectedTeam === 'B' && styles.teamButtonTextActive]}>
                  {selectedMarket?.teamB}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Amount (USDC)</Text>
              <TextInput
                style={styles.input}
                value={tradeAmount}
                onChangeText={setTradeAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#666"
              />
              <Text style={styles.expectedOutput}>
                Expected: ~{tradeAmount ? calculateTokensOut(
                  parseFloat(tradeAmount) || 0,
                  selectedTeam === 'A' ? selectedMarket?.teamASupply || 0 : selectedMarket?.teamBSupply || 0
                ).toFixed(2) : '0'} tokens
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.executeButton, isProcessing && styles.disabledButton]}
              onPress={executeTrade}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.executeButtonText}>
                  {tradeAction === 'buy' ? 'BUY NOW' : 'SELL NOW'}
                </Text>
              )}
            </TouchableOpacity>

            <RecentTradesFeed />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  walletButton: {
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  walletText: {
    color: '#888',
    fontSize: 12,
  },
  connectButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  connectText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  teams: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  priceChange: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  positive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  negative: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  priceChangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  positionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    marginBottom: 15,
  },
  positionLabel: {
    fontSize: 12,
    color: '#888',
  },
  positionValue: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  tradeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tradeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#111',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  // Chart
  chart: {
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chartTitle: {
    color: '#888',
    fontSize: 14,
  },
  currentPrice: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
  },
  chartContainer: {
    height: 120,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 10,
  },
  chartLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  chartBar: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  // Trade controls
  actionTabs: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  teamSelection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  teamButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
  },
  teamButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a1a1a',
  },
  teamButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  teamButtonTextActive: {
    color: '#fff',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  expectedOutput: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  executeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // Trades feed
  tradesFeed: {
    flex: 1,
  },
  feedTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  tradesScroll: {
    maxHeight: 200,
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tradeInfo: {
    flexDirection: 'row',
    gap: 10,
  },
  tradeAction: {
    fontSize: 12,
    fontWeight: '600',
  },
  buyText: {
    color: '#4CAF50',
  },
  sellText: {
    color: '#f44336',
  },
  tradeTeam: {
    color: '#fff',
    fontSize: 12,
  },
  tradeAmount: {
    color: '#888',
    fontSize: 12,
  },
  tradeTime: {
    color: '#666',
    fontSize: 11,
  },
});
