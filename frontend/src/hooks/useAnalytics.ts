import { useEffect, useState } from "react";

interface ExamResult {
  exam: string;
  netReward: number;
}

interface WinRateDataPoint {
  date: string;
  winRate: number;
  period: string; 
  stakesWon: number;
  stakesTotal: number;
  examResult?: string; 
  examId?: string;
}

interface AnalyticsMetrics {
  totalStaked: string;
  totalStakesWon: number;
  totalStakesLost: number;
  winRate: number;
  totalEarnings: string;
  totalEarningsValue: number;
  classesJoined: number;
  examResults: ExamResult[];
  winRateHistory: WinRateDataPoint[];
}

// Flow EVM Testnet Configuration
const FLOW_EVM_TESTNET_API = import.meta.env.VITE_BLOCKSCOUT_BASE_URL || "https://evm-testnet.flowscan.io/api";
const EXAM_STAKING_ADDRESS = import.meta.env.VITE_EXAM_STAKING_ADDRESS;

console.log(`🔧 Analytics config loaded:`, {
  FLOW_EVM_TESTNET_API,
  EXAM_STAKING_ADDRESS
});

const getMockAnalytics = (): AnalyticsMetrics => ({
  totalStaked: "0.0",
  totalStakesWon: 0,
  totalStakesLost: 0,
  winRate: 0,
  totalEarnings: "0.0",
  totalEarningsValue: 0,
  classesJoined: 0,
  examResults: [],
  winRateHistory: []
});

const parseFlowValue = (weiValue: string): number => {
  try {
    // Convert from wei to FLOW (18 decimals)
    const flowValue = parseFloat(weiValue) / Math.pow(10, 18);
    return flowValue;
  } catch {
    return 0;
  }
};

const fetchFlowEVMTransactions = async (userAddress: string) => {
  try {
    console.log(`🔍 Fetching REAL Flow EVM transactions for ${userAddress}`);
    console.log(`🎯 Looking for contract: ${EXAM_STAKING_ADDRESS}`);
    
    const apiUrl = `${FLOW_EVM_TESTNET_API}?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc`;
    console.log(`📡 API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Raw API Response:`, data);
    
    if (data.status === "1" && data.result) {
      console.log(`✅ Found ${data.result.length} total transactions`);
      
      // Filter for contract-related transactions
      const contractTxs = data.result.filter((tx: BlockscoutTransaction) => 
        tx.to?.toLowerCase() === EXAM_STAKING_ADDRESS?.toLowerCase() || 
        tx.from?.toLowerCase() === EXAM_STAKING_ADDRESS?.toLowerCase()
      );
      
      console.log(`🎯 Found ${contractTxs.length} contract transactions:`, contractTxs);
      return contractTxs;
    } else {
      console.log(`⚠️ API returned no transactions or error:`, data);
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching Flow EVM transactions:", error);
    throw error;
  }
};

interface BlockscoutTransaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  input: string;
  gas: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
}

const analyzeTransactions = (transactions: BlockscoutTransaction[]): AnalyticsMetrics => {
  let totalStaked = 0;
  let totalEarnings = 0;
  let stakingTransactions = 0;
  let claimTransactions = 0;
  const examResults: ExamResult[] = [];
  const winRateHistory: WinRateDataPoint[] = [];

  console.log(`📊 Analyzing ${transactions.length} transactions...`);

  if (transactions.length === 0) {
    console.log(`📊 No transactions found - returning zero analytics`);
    return {
      totalStaked: "0.0000",
      totalStakesWon: 0,
      totalStakesLost: 0,
      winRate: 0,
      totalEarnings: "0.0000",
      totalEarningsValue: 0,
      classesJoined: 0,
      examResults,
      winRateHistory
    };
  }

  transactions.forEach((tx, index) => {
    console.log(`🔍 Analyzing transaction ${index + 1}:`, {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      input: tx.input?.slice(0, 10),
      timestamp: tx.timeStamp
    });

    const value = parseFlowValue(tx.value);
    
    // Outgoing transactions to contract (stakes)
    if (tx.to?.toLowerCase() === EXAM_STAKING_ADDRESS?.toLowerCase()) {
      // Any transaction to the contract with value is likely a stake
      if (value > 0) {
        totalStaked += value;
        stakingTransactions++;
        console.log(`📈 STAKE detected: ${value} FLOW (Hash: ${tx.hash})`);
      }
    }
    
    // Incoming transactions from contract (claims/rewards)
    if (tx.from?.toLowerCase() === EXAM_STAKING_ADDRESS?.toLowerCase()) {
      if (value > 0) {
        totalEarnings += value;
        claimTransactions++;
        console.log(`💰 CLAIM detected: ${value} FLOW (Hash: ${tx.hash})`);
      }
    }
  });

  // Generate win rate history based on actual transaction dates
  const stakeDates = transactions
    .filter(tx => tx.to?.toLowerCase() === EXAM_STAKING_ADDRESS?.toLowerCase() && parseFlowValue(tx.value) > 0)
    .map(tx => new Date(parseInt(tx.timeStamp) * 1000));
  
  stakeDates.forEach((date, index) => {
    const claimsUpToDate = claimTransactions; // Simplified for now
    const stakesUpToDate = index + 1;
    
    winRateHistory.push({
      date: date.toISOString().split('T')[0],
      winRate: stakesUpToDate > 0 ? (claimsUpToDate / stakesUpToDate) * 100 : 0,
      period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      stakesWon: claimsUpToDate,
      stakesTotal: stakesUpToDate,
    });
  });

  const netEarnings = totalEarnings - totalStaked;
  const winRate = stakingTransactions > 0 ? (claimTransactions / stakingTransactions) * 100 : 0;

  console.log(`📊 REAL Analytics Summary:
    - Total Staked: ${totalStaked} FLOW (${stakingTransactions} stake transactions)
    - Total Claimed: ${totalEarnings} FLOW (${claimTransactions} claim transactions)
    - Net Earnings: ${netEarnings} FLOW
    - Win Rate: ${winRate}%
    - Stakes Won: ${claimTransactions}
    - Stakes Lost: ${Math.max(0, stakingTransactions - claimTransactions)}`);

  return {
    totalStaked: totalStaked.toFixed(4),
    totalStakesWon: claimTransactions,
    totalStakesLost: Math.max(0, stakingTransactions - claimTransactions),
    winRate: Math.round(winRate * 100) / 100,
    totalEarnings: netEarnings.toFixed(4),
    totalEarningsValue: netEarnings,
    classesJoined: 0, // This would need backend integration
    examResults,
    winRateHistory
  };
};

export const useAnalytics = (userAddress: string | null, chainId?: string, refreshTrigger?: number) => {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(getMockAnalytics());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`🔧 useAnalytics called with:`, { userAddress, chainId, refreshTrigger });
    
    if (!userAddress) {
      console.log(`⚠️ No user address provided, using mock analytics`);
      setAnalytics(getMockAnalytics());
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`🚀 Starting analytics fetch for ${userAddress} on chain ${chainId || '545'}`);
        
        const transactions = await fetchFlowEVMTransactions(userAddress);
        const analytics = analyzeTransactions(transactions);
        
        console.log("📊 Analytics calculated:", analytics);
        setAnalytics(analytics);
      } catch (err) {
        console.error("❌ Analytics fetch failed:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch analytics");
        // Fallback to mock data on error
        console.log("🔄 Falling back to mock analytics");
        setAnalytics(getMockAnalytics());
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userAddress, chainId, refreshTrigger]);

  console.log(`📋 useAnalytics returning:`, { analytics, loading, error });

  return { 
    analytics, 
    loading, 
    error,
    // Also provide the expected interface for StudentAnalytics component
    metrics: analytics,
    isLoading: loading
  };
};
