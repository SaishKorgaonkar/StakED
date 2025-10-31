import { useEffect, useState, useRef, useMemo } from "react";
import { CONTRACT_ADDRESSES } from "../lib/web3Utils";

interface WinRateDataPoint {
  date: string;
  winRate: number;
  period: string;
  stakesWon: number;
  stakesTotal: number;
  examResult?: string; 
  examId?: string; 
}

interface ClassmateAnalytics {
  walletAddress: string;
  totalStaked: string;
  totalStakesWon: number;
  totalStakesLost: number;
  winRate: number;
  totalEarnings: string;
  totalEarningsValue: number;
  winRateHistory?: WinRateDataPoint[];
}

// Flow EVM Blockscout configuration
const BLOCKSCOUT_BASE_URL = import.meta.env.VITE_BLOCKSCOUT_BASE_URL || "https://evm-testnet.flowscan.io/api";

const logsCache = {
  data: null as any[] | null,
  timestamp: 0,
  CACHE_DURATION: 60000,
};

async function getFlowEVMTransactions(walletAddresses: string[]) {
  const now = Date.now();
  
  if (logsCache.data && (now - logsCache.timestamp) < logsCache.CACHE_DURATION) {
    console.log("Using cached Flow EVM transaction data");
    return logsCache.data;
  }

  console.log("Fetching fresh Flow EVM transaction data...");
  
  const allTransactions: any[] = [];
  
  // Fetch transactions for each wallet address
  for (const address of walletAddresses) {
    try {
      console.log(`Fetching transactions for ${address}...`);
      
      const url = `${BLOCKSCOUT_BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc`;
      
      await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`Rate limited for ${address}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(`Flow EVM API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === "1" && data.result) {
        // Filter for contract-related transactions
        const contractTxs = data.result.filter((tx: any) => 
          tx.to?.toLowerCase() === CONTRACT_ADDRESSES.EXAM_STAKING_ADDRESS?.toLowerCase() || 
          tx.from?.toLowerCase() === CONTRACT_ADDRESSES.EXAM_STAKING_ADDRESS?.toLowerCase()
        );
        
        // Add the address info to each transaction
        const enrichedTxs = contractTxs.map((tx: any) => ({
          ...tx,
          walletAddress: address
        }));
        
        allTransactions.push(...enrichedTxs);
        console.log(`Found ${contractTxs.length} contract transactions for ${address}`);
      }
    } catch (error) {
      console.error(`Error fetching transactions for ${address}:`, error);
    }
  }
  
  logsCache.data = allTransactions;
  logsCache.timestamp = now;
  
  console.log(`Total Flow EVM contract transactions: ${allTransactions.length}`);
  return allTransactions;
}

// Helper function to clear cache manually
export function clearClassmateAnalyticsCache() {
  logsCache.data = null;
  logsCache.timestamp = 0;
  console.log("🧹 Classmate analytics cache cleared");
}

export function useClassmateAnalytics(walletAddresses: string[]) {
  const [analytics, setAnalytics] = useState<Record<string, ClassmateAnalytics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const memoizedAddresses = useMemo(() => {
    return walletAddresses.sort().join(',');
  }, [walletAddresses]);

  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (walletAddresses.length === 0) {
      setIsLoading(false);
      setAnalytics({});
      return;
    }

    fetchTimeoutRef.current = setTimeout(() => {
      const fetchAllAnalytics = async () => {
        setIsLoading(true);
        try {
          console.log("📊 Fetching classmate analytics for Flow EVM...");
          const transactions = await getFlowEVMTransactions(walletAddresses);

          const results: Record<string, ClassmateAnalytics> = {};

          // Parse Flow value from wei
          const parseFlowValue = (weiValue: string): number => {
            try {
              return parseFloat(weiValue) / Math.pow(10, 18); // 18 decimals for FLOW
            } catch {
              return 0;
            }
          };

          for (const walletAddress of walletAddresses) {
            // Validate wallet address format
            if (!walletAddress || walletAddress.length !== 42 || !walletAddress.startsWith('0x')) {
              console.warn(`⚠️ Invalid wallet address format: ${walletAddress}`);
              continue;
            }
            
            console.log(`🔍 Analyzing ${walletAddress}...`);
            
            // Filter transactions for this specific wallet
            const walletTransactions = transactions.filter((tx: any) => 
              tx.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
            );
            
            let totalStaked = 0;
            let totalEarnings = 0;
            let stakingTransactions = 0;
            let claimTransactions = 0;
            const winRateHistory: WinRateDataPoint[] = [];

            // Sort transactions by timestamp for proper chronological order
            walletTransactions.sort((a: any, b: any) => parseInt(a.timeStamp) - parseInt(b.timeStamp));

            walletTransactions.forEach((tx: any, index: number) => {
              const value = parseFlowValue(tx.value);
              
              // Outgoing transactions to contract (stakes)
              if (tx.to?.toLowerCase() === CONTRACT_ADDRESSES.EXAM_STAKING_ADDRESS?.toLowerCase() && value > 0) {
                totalStaked += value;
                stakingTransactions++;
                console.log(`📈 STAKE for ${walletAddress}: ${value} FLOW`);
                
                // Add to win rate history (mark as pending/lost initially)
                const currentWinRate = stakingTransactions > 0 ? (claimTransactions / stakingTransactions) * 100 : 0;
                winRateHistory.push({
                  date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString(),
                  winRate: Math.round(currentWinRate),
                  period: `Transaction ${index + 1}`,
                  stakesWon: claimTransactions,
                  stakesTotal: stakingTransactions,
                  examResult: 'LOST', // Default to lost, will update if claim found
                  examId: tx.hash?.slice(0, 8) + '...' || `TX${index}`
                });
              }
              
              // Incoming transactions from contract (claims/rewards)
              else if (tx.from?.toLowerCase() === CONTRACT_ADDRESSES.EXAM_STAKING_ADDRESS?.toLowerCase() && value > 0) {
                totalEarnings += value;
                claimTransactions++;
                console.log(`💰 CLAIM for ${walletAddress}: ${value} FLOW`);
                
                // Add claim to win rate history
                const currentWinRate = stakingTransactions > 0 ? (claimTransactions / stakingTransactions) * 100 : 0;
                winRateHistory.push({
                  date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString(),
                  winRate: Math.round(currentWinRate),
                  period: `Transaction ${index + 1}`,
                  stakesWon: claimTransactions,
                  stakesTotal: stakingTransactions,
                  examResult: 'WON',
                  examId: tx.hash?.slice(0, 8) + '...' || `TX${index}`
                });
              }
            });

            const totalProcessed = stakingTransactions;
            const won = claimTransactions;
            const lost = Math.max(0, stakingTransactions - claimTransactions);
            const winRate = totalProcessed > 0 ? (won / totalProcessed) * 100 : 0;
            const netEarnings = totalEarnings - totalStaked;

            console.log(`📊 Summary for ${walletAddress}:`, {
              totalStaked: totalStaked.toFixed(4) + ' FLOW',
              totalEarnings: totalEarnings.toFixed(4) + ' FLOW',
              netEarnings: netEarnings.toFixed(4) + ' FLOW',
              won,
              lost,
              winRate: winRate.toFixed(1) + '%',
              transactionCount: walletTransactions.length
            });

            results[walletAddress] = {
              walletAddress,
              totalStaked: `${totalStaked.toFixed(4)} FLOW`,
              totalStakesWon: won,
              totalStakesLost: lost,
              winRate: Math.round(winRate),
              totalEarnings: `${netEarnings >= 0 ? "+" : ""}${netEarnings.toFixed(4)} FLOW`,
              totalEarningsValue: netEarnings,
              winRateHistory: winRateHistory,
            };
          }

          setAnalytics(results);
          setError(null);
          console.log("✅ Classmate analytics completed successfully");
        } catch (err: any) {
          console.error("❌ Classmate analytics fetch error:", err);
          setError(err.message);
          setAnalytics({});
        } finally {
          setIsLoading(false);
        }
      };

      fetchAllAnalytics();
    }, 1000); // Debounce for 1 second

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [memoizedAddresses]);

  return { analytics, isLoading, error };
}

export default useClassmateAnalytics;