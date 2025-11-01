import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { CircleLoader } from "../ui/circle-loader";
import { Settings, Zap, Clock, Wallet, TrendingUp } from "lucide-react";

const EXAM_STAKING_ADDRESS = import.meta.env.VITE_EXAM_STAKING_ADDRESS || "0x13E8AB911feE19C12D4695bCF5DB8c7e629E973e";

const EXAM_STAKING_ABI = [
  "function enableAutoCompound(uint256 intervalDays, uint256 minAmount) external",
  "function disableAutoCompound() external",
  "function getAutoCompoundSettings(address user) external view returns (bool enabled, uint256 intervalDays, uint256 lastCompoundTime, uint256 minAmountToCompound)",
  "function getPendingRewards(address user) external view returns (uint256 total)",
  "function canAutoCompound(address user) external view returns (bool)",
  "function pendingRewards(address) external view returns (uint256)"
];

interface AutoCompoundSettings {
  enabled: boolean;
  intervalDays: number;
  lastCompoundTime: number;
  minAmountToCompound: string;
}

export function AutoCompoundToggle() {
  const [address, setAddress] = useState<string>("");
  const [intervalDays, setIntervalDays] = useState<number>(7);
  const [minAmount, setMinAmount] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [settings, setSettings] = useState<AutoCompoundSettings | null>(null);
  const [pendingRewards, setPendingRewards] = useState<string>("0");
  const [compoundedBalance, setCompoundedBalance] = useState<string>("0");
  const [canCompound, setCanCompound] = useState<boolean>(false);

  // Connect wallet and load data
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          await loadData(accounts[0], provider);
        }

        // Listen for account changes
        window.ethereum.on("accountsChanged", async (newAccounts: string[]) => {
          if (newAccounts.length > 0) {
            setAddress(newAccounts[0]);
            await loadData(newAccounts[0], provider);
          } else {
            setAddress("");
            setSettings(null);
          }
        });
      } catch (error) {
        console.error("Error initializing:", error);
      }
    };

    init();
  }, []);

  const loadData = async (userAddress: string, provider?: ethers.BrowserProvider) => {
    if (!userAddress) return;
    
    setIsLoading(true);
    try {
      const ethersProvider = provider || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS, EXAM_STAKING_ABI, ethersProvider);

      // Get settings
      const [enabled, days, lastTime, minAmt] = await contract.getAutoCompoundSettings(userAddress);
      setSettings({
        enabled,
        intervalDays: Number(days),
        lastCompoundTime: Number(lastTime),
        minAmountToCompound: ethers.formatEther(minAmt)
      });
      setIntervalDays(Number(days));
      setMinAmount(ethers.formatEther(minAmt));

      // Get pending rewards
      const pending = await contract.getPendingRewards(userAddress);
      setPendingRewards(ethers.formatEther(pending));

      // Get compounded balance
      const compounded = await contract.pendingRewards(userAddress);
      setCompoundedBalance(ethers.formatEther(compounded));

      // Check if can compound
      const eligible = await contract.canAutoCompound(userAddress);
      setCanCompound(eligible);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!address || !window.ethereum) {
      console.error("Please connect your wallet first");
      return;
    }
    
    setIsProcessing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS, EXAM_STAKING_ABI, signer);

      const minAmountWei = ethers.parseEther(minAmount);
      
      const tx = await contract.enableAutoCompound(intervalDays, minAmountWei);
      console.log("Enabling auto-compound...");
      
      await tx.wait();
      console.log("Auto-compound enabled successfully!");
      
      await loadData(address);
    } catch (error) {
      console.error("Error enabling auto-compound:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to enable auto-compound";
      console.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable = async () => {
    if (!address || !window.ethereum) {
      console.error("Please connect your wallet first");
      return;
    }
    
    setIsProcessing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXAM_STAKING_ADDRESS, EXAM_STAKING_ABI, signer);

      const tx = await contract.disableAutoCompound();
      console.log("Disabling auto-compound...");
      
      await tx.wait();
      console.log("Auto-compound disabled successfully!");
      
      await loadData(address);
    } catch (error) {
      console.error("Error disabling auto-compound:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to disable auto-compound";
      console.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimeUntilNext = () => {
    if (!settings || !settings.lastCompoundTime || !settings.intervalDays) return "N/A";
    
    const intervalMs = settings.intervalDays * 24 * 60 * 60 * 1000;
    const nextCompoundTime = settings.lastCompoundTime * 1000 + intervalMs;
    const now = Date.now();
    
    if (nextCompoundTime <= now) return "Ready Now!";
    
    const diff = nextCompoundTime - now;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (!address) {
    return (
      <div className="border-4 border-black p-6 bg-white shadow-[8px_8px_0px_#000]">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Please connect your wallet to use Auto-Compound</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-4 border-black p-6 bg-white shadow-[8px_8px_0px_#000]">
        <div className="flex items-center justify-center py-8">
          <CircleLoader size="lg" />
        </div>
      </div>
    );
  }

  const isEnabled = settings?.enabled || false;

  return (
    <div className="border-4 border-black p-6 bg-white shadow-[8px_8px_0px_#000]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 border-2 border-black">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Auto-Compound Rewards</h3>
            <p className="text-sm text-gray-600">Powered by Flow Forte Actions</p>
          </div>
        </div>
        <div className={`px-4 py-2 border-2 border-black font-bold ${
          isEnabled ? 'bg-green-400' : 'bg-gray-200'
        }`}>
          {isEnabled ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>

      {/* Stats Grid (when enabled) */}
      {isEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border-2 border-black p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-700">NEXT COMPOUND</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{formatTimeUntilNext()}</p>
          </div>
          
          <div className="border-2 border-black p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-gray-700">PENDING REWARDS</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {parseFloat(pendingRewards).toFixed(4)} FLOW
            </p>
          </div>
          
          <div className="border-2 border-black p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-gray-700">COMPOUNDED</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {parseFloat(compoundedBalance).toFixed(4)} FLOW
            </p>
          </div>
        </div>
      )}

      {/* Current Settings (when enabled) */}
      {isEnabled && settings && (
        <div className="bg-green-50 border-2 border-green-500 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-green-700" />
            <p className="font-bold text-green-800">Current Settings</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
            <p>• Interval: <span className="font-bold">Every {settings.intervalDays} days</span></p>
            <p>• Minimum: <span className="font-bold">{settings.minAmountToCompound} FLOW</span></p>
          </div>
          {canCompound && (
            <div className="mt-2 text-sm font-bold text-green-800">
              ✅ Ready to compound! Next execution will process automatically.
            </div>
          )}
        </div>
      )}

      {/* Configuration Form (when disabled) */}
      {!isEnabled && (
        <div className="space-y-4 mb-6">
          <div>
            <Label className="text-sm font-bold text-gray-700">Compound Interval (days)</Label>
            <Input
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
              min={1}
              max={30}
              className="mt-1 border-2 border-black"
            />
            <p className="text-xs text-gray-500 mt-1">How often to auto-compound (1-30 days)</p>
          </div>
          
          <div>
            <Label className="text-sm font-bold text-gray-700">Minimum Amount (FLOW)</Label>
            <Input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              min="0.1"
              step="0.1"
              className="mt-1 border-2 border-black"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum rewards to trigger auto-compound</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded">
            <p className="text-sm text-blue-800">
              <span className="font-bold">How it works:</span> When enabled, Flow's Forte Actions 
              will automatically claim and restake your rewards every {intervalDays} days if you 
              have at least {minAmount} FLOW in pending rewards.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isEnabled ? (
          <Button
            onClick={handleEnable}
            disabled={isProcessing}
            className="flex-1 border-2 border-black shadow-[4px_4px_0px_#000] bg-purple-500 hover:bg-purple-600 text-white font-bold"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <CircleLoader size="sm" />
                Enabling...
              </span>
            ) : (
              "Enable Auto-Compound"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDisable}
            disabled={isProcessing}
            className="flex-1 border-2 border-black shadow-[4px_4px_0px_#000] bg-red-500 hover:bg-red-600 text-white font-bold"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <CircleLoader size="sm" />
                Disabling...
              </span>
            ) : (
              "Disable Auto-Compound"
            )}
          </Button>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-4 pt-4 border-t-2 border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Powered by <span className="font-bold text-purple-600">Flow Forte Scheduled Transactions</span> 
          {" "}• Trustless, decentralized automation
        </p>
      </div>
    </div>
  );
}

export default AutoCompoundToggle;

