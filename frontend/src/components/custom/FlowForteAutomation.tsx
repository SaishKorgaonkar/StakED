import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EXAM_STAKING_ADDRESS = import.meta.env.VITE_EXAM_STAKING_ADDRESS;

const AUTOMATION_ABI = [
  // Auto-Compound
  "function enableAutoCompound(uint256 intervalDays, uint256 minAmount) external",
  "function disableAutoCompound() external",
  "function canAutoCompound(address user) external view returns (bool)",
  "function getAutoCompoundSettings(address user) external view returns (bool enabled, uint256 intervalDays, uint256 lastCompoundTime, uint256 minAmountToCompound)",
  
  // Auto-Claim
  "function enableAutoClaim() external",
  "function disableAutoClaim() external",
  "function canAutoClaim(address user) external view returns (bool)",
  "function getAutoClaimSettings(address user) external view returns (bool enabled, uint256 lastClaimTime)",
  
  // Shared
  "function getPendingRewards(address user) external view returns (uint256)",
  "function getClaimableExams(address user) external view returns (bytes32[])",
  
  "event AutoCompoundEnabled(address indexed user, uint256 intervalDays, uint256 minAmount)",
  "event AutoCompoundDisabled(address indexed user)",
  "event AutoClaimEnabled(address indexed user)",
  "event AutoClaimDisabled(address indexed user)",
  "event AutoClaimed(address indexed user, bytes32[] examIds, uint256 totalAmount, uint256 timestamp, string claimedVia)"
];

interface FlowForteAutomationProps {
  userAddress: string;
}

export function FlowForteAutomation({ userAddress }: FlowForteAutomationProps) {
  // Auto-Compound State
  const [compoundEnabled, setCompoundEnabled] = useState(false);
  const [compoundInterval, setCompoundInterval] = useState('7');
  const [compoundMinAmount, setCompoundMinAmount] = useState('10');
  const [lastCompoundTime, setLastCompoundTime] = useState(0);

  // Auto-Claim State
  const [claimEnabled, setClaimEnabled] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState(0);

  // Shared State
  const [pendingRewards, setPendingRewards] = useState('0');
  const [claimableExams, setClaimableExams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('claim');

  const loadAutomationData = useCallback(async () => {
    try {
      setLoadingData(true);
      
      if (!window.ethereum) {
        console.error('No ethereum provider found');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTOMATION_ABI, provider);

      // Get auto-claim settings
      const [claimEn, lastClaim] = await contract.getAutoClaimSettings(userAddress);
      setClaimEnabled(claimEn);
      setLastClaimTime(Number(lastClaim));

      // Get auto-compound settings
      const [compoundEn, intervalDays, lastCompound, minAmount] = await contract.getAutoCompoundSettings(userAddress);
      setCompoundEnabled(compoundEn);
      setCompoundInterval(intervalDays.toString());
      setCompoundMinAmount(ethers.formatEther(minAmount));
      setLastCompoundTime(Number(lastCompound));

      // Get pending rewards
      const pending = await contract.getPendingRewards(userAddress);
      setPendingRewards(ethers.formatEther(pending));

      // Get claimable exams
      const exams = await contract.getClaimableExams(userAddress);
      setClaimableExams(exams);

      console.log('📊 Automation data loaded:', { 
        claimEnabled: claimEn, 
        compoundEnabled: compoundEn,
        pending: ethers.formatEther(pending), 
        exams: exams.length 
      });
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoadingData(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress && EXAM_STAKING_ADDRESS) {
      loadAutomationData();
    }
  }, [userAddress, loadAutomationData]);

  // Auto-Claim Handlers
  const handleEnableClaim = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTOMATION_ABI, signer);

      console.log('🚀 Enabling auto-claim...');
      const tx = await contract.enableAutoClaim();
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-claim enabled!');
      
      await loadAutomationData();
    } catch (error) {
      console.error('Error enabling auto-claim:', error);
      alert('Failed to enable auto-claim. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableClaim = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTOMATION_ABI, signer);

      console.log('🚀 Disabling auto-claim...');
      const tx = await contract.disableAutoClaim();
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-claim disabled!');
      
      await loadAutomationData();
    } catch (error) {
      console.error('Error disabling auto-claim:', error);
      alert('Failed to disable auto-claim. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-Compound Handlers
  const handleEnableCompound = async () => {
    try {
      setLoading(true);
      
      const intervalDays = parseInt(compoundInterval);
      const minAmount = ethers.parseEther(compoundMinAmount);

      if (intervalDays < 1 || intervalDays > 30) {
        alert('Interval must be between 1 and 30 days');
        return;
      }

      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTOMATION_ABI, signer);

      console.log('🚀 Enabling auto-compound...', { intervalDays, minAmount: minAmount.toString() });
      const tx = await contract.enableAutoCompound(intervalDays, minAmount);
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-compound enabled!');
      
      await loadAutomationData();
    } catch (error) {
      console.error('Error enabling auto-compound:', error);
      alert('Failed to enable auto-compound. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableCompound = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTOMATION_ABI, signer);

      console.log('🚀 Disabling auto-compound...');
      const tx = await contract.disableAutoCompound();
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-compound disabled!');
      
      await loadAutomationData();
    } catch (error) {
      console.error('Error disabling auto-compound:', error);
      alert('Failed to disable auto-compound. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              ⚡ Flow Forte Actions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Trustless, decentralized automation powered by Flow
            </p>
          </div>
        </div>

        {/* Stats Grid - Shared */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending Rewards</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {parseFloat(pendingRewards).toFixed(4)} FLOW
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Claimable Exams</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {claimableExams.length}
            </div>
          </div>
        </div>

        {/* Tabs for Auto-Claim and Auto-Compound */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="claim">Auto-Claim</TabsTrigger>
            <TabsTrigger value="compound">Auto-Compound</TabsTrigger>
          </TabsList>

          {/* Auto-Claim Tab */}
          <TabsContent value="claim" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white">Auto-Claim Winnings</h4>
              {claimEnabled ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 text-white">ACTIVE</span>
              ) : (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300">INACTIVE</span>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    How Auto-Claim Works
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    When enabled, Flow Forte will automatically claim your winnings whenever exams are graded. 
                    No manual claiming needed - rewards are sent directly to your wallet!
                  </p>
                  {lastClaimTime > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Last auto-claim: {new Date(lastClaimTime * 1000).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!claimEnabled ? (
                <Button
                  onClick={handleEnableClaim}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enabling...
                    </>
                  ) : (
                    <>⚡ Enable Auto-Claim</>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDisableClaim}
                  disabled={loading}
                  className="flex-1 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 bg-white dark:bg-gray-800"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                      Disabling...
                    </>
                  ) : (
                    <>🛑 Disable Auto-Claim</>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Auto-Compound Tab */}
          <TabsContent value="compound" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white">Auto-Compound Rewards</h4>
              {compoundEnabled ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 text-white">ACTIVE</span>
              ) : (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300">INACTIVE</span>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    How Auto-Compound Works
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    When enabled, Flow's Forte Actions will automatically claim and restake your rewards every {compoundInterval} days 
                    if you have at least {compoundMinAmount} FLOW in pending rewards.
                  </p>
                  {lastCompoundTime > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Last auto-compound: {new Date(lastCompoundTime * 1000).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!compoundEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Compound Interval (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={compoundInterval}
                    onChange={(e) => setCompoundInterval(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="1-30 days"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How often to auto-compound (1-30 days)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Amount (FLOW)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={compoundMinAmount}
                    onChange={(e) => setCompoundMinAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Minimum rewards to trigger auto-compound"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Minimum rewards to trigger auto-compound
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!compoundEnabled ? (
                <Button
                  onClick={handleEnableCompound}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enabling...
                    </>
                  ) : (
                    <>⚡ Enable Auto-Compound</>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDisableCompound}
                  disabled={loading}
                  className="flex-1 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 bg-white dark:bg-gray-800"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                      Disabling...
                    </>
                  ) : (
                    <>🛑 Disable Auto-Compound</>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Forte Badge */}
        <div className="flex items-center justify-center pt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Powered by
            <span className="font-semibold text-purple-600 dark:text-purple-400">Flow Forte Scheduled Transactions</span>
            ⚡
          </div>
        </div>
      </div>
    </Card>
  );
}
