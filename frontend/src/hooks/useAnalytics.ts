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

// Temporarily disabled analytics - returning mock data for Flow EVM migration
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

export const useAnalytics = (userAddress: string | null) => {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(getMockAnalytics());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setAnalytics(getMockAnalytics());
      return;
    }

    // Temporarily disabled for Flow EVM migration
    console.log("Analytics temporarily disabled for Flow EVM migration, showing mock data for:", userAddress);
    setAnalytics(getMockAnalytics());
    setLoading(false);
    setError(null);
  }, [userAddress]);

  return { analytics, loading, error };
};
