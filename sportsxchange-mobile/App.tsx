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
} from 'react-native';

// Types
interface Market {
  gameId: string;
  marketPda: string;
  poolPda: string;
  homeTeam: string;
  awayTeam: string;
  homeReserve: number;
  awayReserve: number;
  homeProb: string;
  awayProb: string;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mock markets data
  const mockMarkets: Market[] = [
    {
      gameId: '2024-WEEK10-KC-BAL',
      marketPda: 'HVoN6gYHdxeixkyBBtTNchu4x6MwsL9UNoY1fAiZrsTA',
      poolPda: 'C8S797BgJ6JAHdRFdt4nWHw9aHBhdM3xsSjqU15CXJrR',
      homeTeam: 'KC',
      awayTeam: 'BAL',
      homeReserve: 1000,
      awayReserve: 1000,
      homeProb: '50.0%',
      awayProb: '50.0%',
    },
    {
      gameId: '2024-WEEK10-DET-HOU',
      marketPda: 'AV5tb52EJgVh7eLEcDcmu4GYdXuAJBpBcyyNEbYHw9Zm',
      poolPda: '6vjxTyaL38nkkCHFyLypo8b3M155Wtw5CLFStvpq4Aq3',
      homeTeam: 'DET',
      awayTeam: 'HOU',
      homeReserve: 1000,
      awayReserve: 1000,
      homeProb: '50.0%',
      awayProb: '50.0%',
    },
    {
      gameId: '2024-WEEK10-SF-DAL',
      marketPda: '9tt9xoeZ4iyGH1hX7ntVamvE1ktD614T55bHnYqw3Rhw',
      poolPda: 'AaV8ebpbn4TfDSeQPhRSsFaj9wKASgUNYYGbHrA638f',
      homeTeam: 'SF',
      awayTeam: 'DAL',
      homeReserve: 1000,
      awayReserve: 1000,
      homeProb: '50.0%',
      awayProb: '50.0%',
    },
    {
      gameId: '2024-WEEK10-GB-CHI',
      marketPda: '8JHVdcX52BiRgCx3YAZPGAt5LDyBXGqC8523413XYb7M',
      poolPda: '39sNocGLXt4p6JzT2yChavmj6cJ6FbgHF4WgdfFfQrMw',
      homeTeam: 'GB',
      awayTeam: 'CHI',
      homeReserve: 1000,
      awayReserve: 1000,
      homeProb: '50.0%',
      awayProb: '50.0%',
    },
  ];

  useEffect(() => {
    // Load markets on mount
    setMarkets(mockMarkets);
  }, []);

  const connectWallet = async () => {
    try {
      setLoading(true);
      
      // Mock connection for testing
      setTimeout(() => {
        setWalletAddress('3t1ohp3Kxke4j3ejuAWvKkapkSAMmG7iSUKryqLAGRwk');
        setConnected(true);
        if (Platform.OS === 'web') {
          alert('Wallet connected!');
        } else {
          Alert.alert('Success', 'Wallet connected!');
        }
        setLoading(false);
      }, 1000);
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Failed to connect wallet');
      } else {
        Alert.alert('Error', 'Failed to connect wallet');
      }
      console.error('Connection error:', error);
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setWalletAddress(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Refresh market data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleTrade = (market: Market) => {
    const message = `Trade ${market.homeTeam} vs ${market.awayTeam}: Trading interface coming soon!`;
    if (Platform.OS === 'web') {
      alert(message);
    } else {
      Alert.alert('Trade', message);
    }
  };

  const MarketCard = ({ market }: { market: Market }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleTrade(market)}>
      <View style={styles.cardHeader}>
        <Text style={styles.teams}>
          {market.homeTeam} vs {market.awayTeam}
        </Text>
      </View>
      
      <View style={styles.poolInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>HOME</Text>
          <Text style={[styles.value, styles.homeColor]}>{market.homeProb}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>AWAY</Text>
          <Text style={[styles.value, styles.awayColor]}>{market.awayProb}</Text>
        </View>
      </View>

      <View style={styles.reserves}>
        <Text style={styles.reserveText}>
          Pool: {market.homeReserve} / {market.awayReserve}
        </Text>
      </View>

      <TouchableOpacity style={styles.tradeButton} onPress={() => handleTrade(market)}>
        <Text style={styles.tradeButtonText}>TRADE</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <View style={styles.header}>
        <Text style={styles.title}>SportsXchange</Text>
        {connected ? (
          <TouchableOpacity onPress={disconnectWallet} style={styles.walletButton}>
            <Text style={styles.walletText}>
              {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={connectWallet} style={styles.connectButton}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectText}>Connect Wallet</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {!connected ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Connect your wallet to start trading</Text>
          </View>
        ) : markets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No markets available</Text>
          </View>
        ) : (
          markets.map((market, index) => (
            <MarketCard key={index} market={market} />
          ))
        )}
      </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#0a0a0a',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  walletButton: {
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  walletText: {
    color: '#4CAF50',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  connectButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  connectText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 15,
  },
  teams: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  poolInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  infoRow: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
    letterSpacing: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  homeColor: {
    color: '#4CAF50',
  },
  awayColor: {
    color: '#2196F3',
  },
  reserves: {
    marginBottom: 15,
  },
  reserveText: {
    color: '#888',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tradeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
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
});
