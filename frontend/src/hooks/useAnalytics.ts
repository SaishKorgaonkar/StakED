import { useEffect, useState } from "react";

interface ExamResult {
  exam: string;
  netReward: number;
  status?: string;
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
  stakesPending?: number;
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

// Function signatures for decoding
const STAKE_SIGNATURE = "0x7b3b3ae8"; // stake(bytes32,address,uint256)
const CLAIM_SIGNATURE = "0x379607f5"; // claim(bytes32)
const REFUND_SIGNATURE = "0x7249fbb6"; // refund(bytes32,address)

console.log(`🔧 Analytics config loaded:`, {
  FLOW_EVM_TESTNET_API,
  EXAM_STAKING_ADDRESS
});

const getMockAnalytics = (): AnalyticsMetrics => ({
  totalStaked: "0.0",
  totalStakesWon: 0,
  totalStakesLost: 0,
  stakesPending: 0,
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
        tx.to?.toLowerCase() === EXAM_STAKING_ADDRESS?.toLowerCase()
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

const analyzeTransactions = (transactions: BlockscoutTransaction[], userAddress: string): AnalyticsMetrics => {
  let totalStaked = 0;
  let totalWinnings = 0; // Money received from claims (wins)
  let totalLosses = 0; // Money lost (stakes that got refunded or not claimed)
  let stakingTransactions = 0;
  let claimTransactions = 0;
  let refundTransactions = 0;
  const examResults: ExamResult[] = [];
  const winRateHistory: WinRateDataPoint[] = [];

  console.log(`📊 Analyzing ${transactions.length} transactions for ${userAddress}...`);

  if (transactions.length === 0) {
    console.log(`📊 No transactions found - returning zero analytics`);
    return {
      totalStaked: "0.0000",
      totalStakesWon: 0,
      totalStakesLost: 0,
      stakesPending: 0,
      winRate: 0,
      totalEarnings: "0.0000",
      totalEarningsValue: 0,
      classesJoined: 0,
      examResults,
      winRateHistory
    };
  }

  // Track stake amounts per exam for accurate loss calculation
  const stakesByExam = new Map<string, number>();
  const claimedExams = new Set<string>();
  const refundedExams = new Set<string>();

  transactions.forEach((tx, index) => {
    const functionSig = tx.input?.slice(0, 10);
    const value = parseFlowValue(tx.value);
    
    console.log(`🔍 Analyzing transaction ${index + 1}:`, {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: value,
      functionSig,
      timestamp: tx.timeStamp
    });

    // STAKE: User sends FLOW to contract
    if (functionSig === STAKE_SIGNATURE && value > 0) {
      totalStaked += value;
      stakingTransactions++;
      
      // Extract examId from transaction input (first parameter after function sig)
      try {
        const examId = tx.input.slice(10, 74); // bytes32 examId
        stakesByExam.set(examId, (stakesByExam.get(examId) || 0) + value);
        console.log(`📈 STAKE detected: ${value} FLOW (ExamId: ${examId})`);
      } catch {
        console.log(`📈 STAKE detected: ${value} FLOW (couldn't extract examId)`);
      }
    }
    
    // CLAIM: User successfully claims rewards (WIN!)
    else if (functionSig === CLAIM_SIGNATURE) {
      claimTransactions++;
      
      try {
        const examId = tx.input.slice(10, 74); // bytes32 examId
        claimedExams.add(examId);
        
        // The actual payout comes from internal transaction, but we can estimate
        // For now, mark this exam as claimed (won)
        console.log(`✅ CLAIM detected for ExamId: ${examId}`);
      } catch {
        console.log(`✅ CLAIM detected (couldn't extract examId)`);
      }
    }
    
    // REFUND: User gets stake back (LOSS - no profit)
    else if (functionSig === REFUND_SIGNATURE) {
      refundTransactions++;
      
      try {
        const examId = tx.input.slice(10, 74); // bytes32 examId
        refundedExams.add(examId);
        console.log(`❌ REFUND detected for ExamId: ${examId}`);
      } catch {
        console.log(`❌ REFUND detected (couldn't extract examId)`);
      }
    }
  });

  // Now fetch internal transactions to get actual claim amounts
  // For simplicity, we'll estimate: 
  // - Claims = wins (assume 2x return on average for demo)
  // - Refunds = losses (stake lost)
  // - Unclaimed stakes = pending losses
  
  // Calculate win/loss amounts
  claimedExams.forEach(examId => {
    const stakeAmount = stakesByExam.get(examId) || 0;
    // Estimate winnings as stake amount (conservative - actual rewards vary)
    // In reality, you'd need to fetch internal transactions or contract events
    totalWinnings += stakeAmount; // This is just the stake back, actual winnings would be higher
  });

  refundedExams.forEach(examId => {
    const stakeAmount = stakesByExam.get(examId) || 0;
    totalLosses += stakeAmount;
  });

  // Calculate net earnings: (stakes back from claims) - (stakes lost to refunds/unclaimed)
  // For accurate calculation, winnings from claims should be > original stake
  // But without internal tx data, we use: claims are wins, refunds/unclaimed are losses
  const netEarnings = totalWinnings - totalLosses;
  const totalStakesLost = refundTransactions + (stakingTransactions - claimTransactions - refundTransactions);
  const winRate = stakingTransactions > 0 ? (claimTransactions / stakingTransactions) * 100 : 0;

  // Generate win rate history
  const sortedTxs = [...transactions].sort((a, b) => 
    parseInt(a.timeStamp) - parseInt(b.timeStamp)
  );

  let cumulativeWins = 0;
  let cumulativeTotal = 0;

  sortedTxs.forEach((tx) => {
    const functionSig = tx.input?.slice(0, 10);
    
    if (functionSig === STAKE_SIGNATURE) {
      cumulativeTotal++;
      
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      winRateHistory.push({
        date: date.toISOString().split('T')[0],
        winRate: cumulativeTotal > 0 ? (cumulativeWins / cumulativeTotal) * 100 : 0,
        period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        stakesWon: cumulativeWins,
        stakesTotal: cumulativeTotal,
      });
    } else if (functionSig === CLAIM_SIGNATURE) {
      cumulativeWins++;
    }
  });

  console.log(`📊 ANALYTICS SUMMARY:
    - Total Staked: ${totalStaked} FLOW (${stakingTransactions} stakes)
    - Claims (Wins): ${claimTransactions}
    - Refunds (Losses): ${refundTransactions}
    - Net Earnings: ${netEarnings} FLOW
    - Win Rate: ${winRate.toFixed(2)}%`);

  return {
    totalStaked: totalStaked.toFixed(4),
    totalStakesWon: claimTransactions,
    totalStakesLost: totalStakesLost,
    stakesPending: Math.max(0, stakingTransactions - claimTransactions - refundTransactions),
    winRate: Math.round(winRate * 100) / 100,
    totalEarnings: netEarnings.toFixed(4),
    totalEarningsValue: netEarnings,
    classesJoined: 0,
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
        console.log(`🚀 Starting analytics fetch for ${userAddress}`);
        
        const transactions = await fetchFlowEVMTransactions(userAddress);
        const analyticsData = analyzeTransactions(transactions, userAddress);
        
        console.log("📊 Analytics calculated:", analyticsData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error("❌ Analytics fetch failed:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch analytics");
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
    metrics: analytics,
    isLoading: loading
  };
};
