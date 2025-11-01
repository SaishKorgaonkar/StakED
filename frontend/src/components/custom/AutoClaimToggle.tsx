import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const EXAM_STAKING_ADDRESS = import.meta.env.VITE_EXAM_STAKING_ADDRESS;

const AUTO_CLAIM_ABI = [
  "function enableAutoClaim() external",
  "function disableAutoClaim() external",
  "function executeAutoClaim(bytes32[] calldata examIds) external",
  "function canAutoClaim(address user) external view returns (bool)",
  "function getAutoClaimSettings(address user) external view returns (bool enabled, uint256 lastClaimTime)",
  "function getPendingRewards(address user) external view returns (uint256)",
  "function getClaimableExams(address user) external view returns (bytes32[])",
  "event AutoClaimEnabled(address indexed user)",
  "event AutoClaimDisabled(address indexed user)",
  "event AutoClaimed(address indexed user, bytes32[] examIds, uint256 totalAmount, uint256 timestamp, string claimedVia)"
];

interface AutoClaimToggleProps {
  userAddress: string;
}

export function AutoClaimToggle({ userAddress }: AutoClaimToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState(0);
  const [pendingRewards, setPendingRewards] = useState('0');
  const [claimableExams, setClaimableExams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const loadAutoClaimData = useCallback(async () => {
    try {
      setLoadingData(true);
      
      if (!window.ethereum) {
        console.error('No ethereum provider found');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTO_CLAIM_ABI, provider);

      // Get auto-claim settings
      const [enabled, lastClaim] = await contract.getAutoClaimSettings(userAddress);
      setIsEnabled(enabled);
      setLastClaimTime(Number(lastClaim));

      // Get pending rewards
      const pending = await contract.getPendingRewards(userAddress);
      setPendingRewards(ethers.formatEther(pending));

      // Get claimable exams
      const exams = await contract.getClaimableExams(userAddress);
      setClaimableExams(exams);

      console.log('📊 Auto-claim data loaded:', { enabled, lastClaim: Number(lastClaim), pending: ethers.formatEther(pending), exams: exams.length });
    } catch (error) {
      console.error('Error loading auto-claim data:', error);
    } finally {
      setLoadingData(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress && EXAM_STAKING_ADDRESS) {
      loadAutoClaimData();
    }
  }, [userAddress, loadAutoClaimData]);

  const handleEnable = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTO_CLAIM_ABI, signer);

      console.log('🚀 Enabling auto-claim...');
      const tx = await contract.enableAutoClaim();
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-claim enabled!');
      
      // Reload data
      await loadAutoClaimData();
    } catch (error) {
      console.error('Error enabling auto-claim:', error);
      alert('Failed to enable auto-claim. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTO_CLAIM_ABI, signer);

      console.log('🚀 Disabling auto-claim...');
      const tx = await contract.disableAutoClaim();
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-claim disabled!');
      
      // Reload data
      await loadAutoClaimData();
    } catch (error) {
      console.error('Error disabling auto-claim:', error);
      alert('Failed to disable auto-claim. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteClaim = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      if (claimableExams.length === 0) {
        alert('No exams to claim from');
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS!, AUTO_CLAIM_ABI, signer);

      console.log('💰 Executing auto-claim for', claimableExams.length, 'exams...');
      const tx = await contract.executeAutoClaim(claimableExams);
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Auto-claim executed!');
      
      alert(`Successfully claimed ${pendingRewards} FLOW via Flow Forte!`);
      
      // Reload data
      await loadAutoClaimData();
    } catch (error) {
      console.error('Error executing auto-claim:', error);
      alert('Failed to execute auto-claim. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-4 border-black p-6 shadow-[8px_8px_0px_#000]">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-4 border-black p-6 shadow-[8px_8px_0px_#000]">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500 border-2 border-black">
            <span className="text-2xl">⚡</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-gray-800 uppercase tracking-wide">
                Flow Forte Auto-Claim
              </h2>
              {isEnabled ? (
                <span className="px-3 py-1 text-xs font-bold bg-green-500 text-white border-2 border-black shadow-[2px_2px_0px_#000]">
                  ACTIVE
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-bold bg-gray-300 text-gray-800 border-2 border-black shadow-[2px_2px_0px_#000]">
                  INACTIVE
                </span>
              )}
            </div>
            <p className="font-mono text-gray-600 text-sm mt-1">
              Automatically claim your winnings using Flow's scheduled transactions
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Pending Rewards
            </div>
            <div className="text-2xl font-black text-purple-600">
              {parseFloat(pendingRewards).toFixed(4)} FLOW
            </div>
          </div>

          <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
              Claimable Exams
            </div>
            <div className="text-2xl font-black text-blue-600">
              {claimableExams.length}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-100 border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 mb-1 uppercase tracking-wide text-sm">
                How Auto-Claim Works
              </h4>
              <p className="text-sm text-gray-700 font-mono">
                When enabled, Flow Forte will automatically claim your winnings whenever exams are graded. 
                No manual claiming needed - rewards are sent directly to your wallet!
              </p>
              {lastClaimTime > 0 && (
                <p className="text-xs text-gray-600 font-mono mt-2 font-bold">
                  Last auto-claim: {new Date(lastClaimTime * 1000).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {!isEnabled ? (
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Enabling...
                </span>
              ) : (
                <>⚡ Enable Auto-Claim</>
              )}
            </button>
          ) : (
            <button
              onClick={handleDisable}
              disabled={loading}
              className="flex-1 bg-white hover:bg-gray-100 text-red-600 font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                  Disabling...
                </span>
              ) : (
                <>🛑 Disable Auto-Claim</>
              )}
            </button>
          )}
        </div>

        {/* Forte Badge */}
        <div className="flex items-center justify-center pt-2 border-t-2 border-black border-dashed">
          <div className="text-xs font-mono text-gray-600 flex items-center gap-2">
            Powered by
            <span className="font-extrabold text-purple-600 uppercase tracking-wider">Flow Forte Actions</span>
            ⚡
          </div>
        </div>
      </div>
    </div>
  );
}
