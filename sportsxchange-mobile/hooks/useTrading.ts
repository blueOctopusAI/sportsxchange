// hooks/useTrading.ts
import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { SportsXchangeClient } from '../src/SportsXchangeClient';
import { Alert } from 'react-native';

export const useTrading = (client: SportsXchangeClient) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const buyTokens = async (
    marketPda: string,
    team: 'A' | 'B',
    usdcAmount: number,
    walletPubkey: string,
    signTransaction?: (tx: any) => Promise<any>
  ) => {
    if (!signTransaction) {
      Alert.alert('Error', 'Wallet not connected');
      return null;
    }

    try {
      setIsProcessing(true);
      
      const pubkey = new PublicKey(walletPubkey);
      const signature = await client.buyOnCurve(
        marketPda,
        team,
        usdcAmount,
        pubkey,
        signTransaction
      );

      Alert.alert(
        'Success!', 
        `Transaction confirmed!\nSignature: ${signature.slice(0, 8)}...`
      );

      return signature;
    } catch (error) {
      console.error('Buy error:', error);
      Alert.alert(
        'Transaction Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const sellTokens = async (
    marketPda: string,
    team: 'A' | 'B',
    tokenAmount: number,
    walletPubkey: string,
    signTransaction?: (tx: any) => Promise<any>
  ) => {
    if (!signTransaction) {
      Alert.alert('Error', 'Wallet not connected');
      return null;
    }

    try {
      setIsProcessing(true);
      
      const pubkey = new PublicKey(walletPubkey);
      const signature = await client.sellOnCurve(
        marketPda,
        team,
        tokenAmount,
        pubkey,
        signTransaction
      );

      Alert.alert(
        'Success!',
        `Sold ${tokenAmount} tokens!\nSignature: ${signature.slice(0, 8)}...`
      );

      return signature;
    } catch (error) {
      console.error('Sell error:', error);
      Alert.alert(
        'Transaction Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTokensOut = (
    usdcAmount: number,
    currentSupply: number,
    basePrice: number,
    slope: number
  ): number => {
    return client.calculateTokensOut(usdcAmount, currentSupply, basePrice, slope);
  };

  const calculateUsdcIn = (
    tokenAmount: number,
    currentSupply: number,
    basePrice: number,
    slope: number
  ): number => {
    return client.calculateUsdcIn(tokenAmount, currentSupply, basePrice, slope);
  };

  return {
    buyTokens,
    sellTokens,
    calculateTokensOut,
    calculateUsdcIn,
    isProcessing,
  };
};
