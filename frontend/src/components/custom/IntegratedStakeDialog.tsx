import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/lib/web3Utils";

interface IntegratedStakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId: string;
  candidateAddress: string;
  candidateName: string;
}

const IntegratedStakeDialog: React.FC<IntegratedStakeDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  examId,
  candidateAddress,
  candidateName
}) => {
  const [amount, setAmount] = useState("");
  const [predictedMarks, setPredictedMarks] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<"connect" | "stake" | "confirm">("connect");

  const checkWalletConnection = useCallback(async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
          setStep("stake");

          await getFlowBalance(address, provider);
        }
      }
    } catch (error) {
      console.error("Wallet connection check failed:", error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkWalletConnection();
    }

    // Listen for network changes
    const handleChainChanged = async (chainId: string) => {
      console.log("Network changed to:", parseInt(chainId, 16));
      
      // If user switched to Flow EVM Testnet, update balance
      if (parseInt(chainId, 16) === 545 && walletAddress) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await getFlowBalance(walletAddress, provider);
          console.log("✅ Network switched to Flow EVM Testnet - balance updated!");
        } catch (error) {
          console.error("Failed to update balance after network change:", error);
        }
      } else if (parseInt(chainId, 16) !== 545) {
        // Not on Flow EVM Testnet
        setBalance("0");
        console.log("⚠️ Not on Flow EVM Testnet - balance set to 0");
      }
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isOpen, walletAddress, checkWalletConnection]);

  const addFlowEVMNetwork = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed!");
        return;
      }

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x221', // 545 in hex
          chainName: 'Flow EVM Testnet',
          nativeCurrency: {
            name: 'FLOW',
            symbol: 'FLOW',
            decimals: 18
          },
          rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
          blockExplorerUrls: ['https://evm-testnet.flowscan.io']
        }]
      });

      console.log("✅ Flow EVM Testnet network added to MetaMask!");
      // After adding, try to check wallet connection again
      await checkWalletConnection();
    } catch (error) {
      console.error("❌ Failed to add Flow EVM Testnet:", error);
    }
  };
  const getFlowBalance = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      // Check if we're on the correct network first
      const network = await provider.getNetwork();
      console.log("Current network:", network.chainId.toString(), network.name);
      
      if (network.chainId !== 545n) {
        console.warn("❌ Wrong network! Expected Flow EVM Testnet (545), got:", network.chainId.toString());
        console.log("🔧 Please manually switch to Flow EVM Testnet in MetaMask:");
        console.log("   - Network Name: Flow EVM Testnet");
        console.log("   - RPC URL: https://testnet.evm.nodes.onflow.org");
        console.log("   - Chain ID: 545");
        console.log("   - Currency Symbol: FLOW");
        setBalance("0");
        return;
      }

      console.log("✅ Correct network detected! Fetching native FLOW balance...");
      
      // Use native FLOW balance instead of ERC20
      const balanceWei = await provider.getBalance(address);
      const balanceFormatted = ethers.formatEther(balanceWei); // FLOW has 18 decimals
      console.log("✅ Native FLOW balance fetched:", balanceFormatted, "FLOW");
      setBalance(balanceFormatted);
    } catch (error) {
      console.error("❌ Failed to get FLOW balance:", error);
      setBalance("0");
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Check network before proceeding
      const network = await provider.getNetwork();
      console.log("Wallet connected to network:", network.chainId.toString());
      
      // Notify user if not on correct network
      if (network.chainId !== 545n) {
        console.log("⚠️ Wrong network detected. Please manually switch to Flow EVM Testnet (Chain ID: 545) in MetaMask");
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWalletAddress(address);
      setStep("stake");

      // Only get balance if we're on the correct network
      if (network.chainId === 545n) {
        await getFlowBalance(address, provider);
      } else {
        setBalance("0");
        console.log("Not on Flow EVM Testnet - balance set to 0");
      }

      // No transaction hash for wallet connection - we'll skip notification here
    } catch (error: unknown) {
      console.error("Wallet connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

  const handleConfirmStake = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      const EXAM_ABI = [
        "function stake(bytes32 examId, address candidate, uint256 predictedScore) external payable"
      ];

      const response = await fetch(`${API_BASE}/exams/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          examId,
          candidateAddress: candidateAddress || walletAddress,
          amount: parseFloat(amount),
          predictedMarks: parseFloat(predictedMarks)
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

      const examContract = new ethers.Contract(data.blockchain.contractAddress, EXAM_ABI, signer);
      const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(data.blockchain.examId));
      const stakeAmountWei = ethers.parseEther(amount); // Use 18 decimals for native FLOW
      const predictedScoreInt = Math.floor(parseFloat(predictedMarks));

      // Call stake function with native FLOW (send value with transaction)
      const stakeTx = await examContract.stake(
        examIdBytes, 
        candidateAddress || walletAddress, 
        predictedScoreInt,
        { value: stakeAmountWei } // Send FLOW with the transaction
      );
      
      console.log("✅ Staking transaction sent:", stakeTx.hash);

      const receipt = await stakeTx.wait();
      console.log("✅ Staking transaction confirmed:", receipt.hash);

      await getFlowBalance(walletAddress, provider);

      onSuccess();
      onClose();

    } catch (error: unknown) {
      console.error("Staking error:", error);
      setStep("stake");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      console.error("Invalid stake amount");
      return;
    }

    if (!predictedMarks || parseFloat(predictedMarks) < 40 || parseFloat(predictedMarks) > 100) {
      console.error("Invalid predicted marks - minimum 40%");
      return;
    }

    const stakeAmount = parseFloat(amount);
    if (stakeAmount > parseFloat(balance)) {
      console.error("Insufficient FLOW balance");
      return;
    }

    setLoading(true);
    
    try {
      console.log("🔍 DEBUG: About to send stake request:");
      console.log("  - examId:", examId);
      console.log("  - candidateAddress:", candidateAddress || walletAddress);
      console.log("  - amount:", amount);
      console.log("  - predictedMarks (raw):", predictedMarks);
      console.log("  - predictedMarks (parsed):", parseFloat(predictedMarks));

      // Start the stake process
      const response = await fetch(`${API_BASE}/exams/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          examId,
          candidateAddress: candidateAddress || walletAddress,
          amount: stakeAmount,
          predictedMarks: parseFloat(predictedMarks)
        })
      });

      const data = await response.json();

      if (!data.success) {
        console.error("API error:", data.message);
        return;
      }

      setStep("confirm");

      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      const EXAM_STAKING_ADDRESS = CONTRACT_ADDRESSES.EXAM_STAKING_ADDRESS;

      // Native FLOW - no approval needed, just send value with transaction
      const EXAM_ABI = [
        "function stake(bytes32 examId, address candidate, uint256 predictedScore) external payable"
      ];

      const examContract = new ethers.Contract(EXAM_STAKING_ADDRESS, EXAM_ABI, signer);
      const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(data.blockchain.examId));
      const predictedScoreInt = Math.floor(parseFloat(predictedMarks));
      const stakeAmountWei = ethers.parseEther(stakeAmount.toString()); // FLOW has 18 decimals

      // Send native FLOW with the transaction
      const stakeTx = await examContract.stake(
        examIdBytes, 
        candidateAddress || walletAddress, 
        predictedScoreInt,
        { value: stakeAmountWei } // Send FLOW as native currency
      );
      
      console.log("✅ Staking transaction sent:", stakeTx.hash);

      const stakeTxReceipt = await stakeTx.wait();
      console.log("✅ Staking transaction confirmed:", stakeTxReceipt.hash);

      // Update balance after successful stake
      await getFlowBalance(walletAddress, provider);

      onSuccess();
      onClose();

    } catch (error: unknown) {
      console.error("Staking error:", error);
      setStep("stake");
      setStep("stake");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setPredictedMarks("");
    setStep("connect");
    setWalletAddress("");
    onClose();
  };

  const renderContent = () => {
    switch (step) {
      case "connect":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Wallet className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-4">
                Connect your MetaMask wallet to stake FLOW
              </p>
              <Button
                onClick={connectWallet}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Connecting..." : "Connect MetaMask"}
              </Button>
            </div>
          </div>
        );

      case "stake":
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Stake on {candidateName}</h3>
              <p className="text-gray-600">
                Address: {candidateAddress.slice(0, 10)}...{candidateAddress.slice(-8)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Your FLOW Balance:</span>
                <span className="font-semibold">{parseFloat(balance).toFixed(4)} FLOW</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connected Wallet:</span>
                <span className="text-xs font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              {parseFloat(balance) === 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Wrong Network Detected</p>
                  <p className="text-xs text-yellow-700 mb-2">
                    Please switch to Flow EVM Testnet to see your FLOW balance and stake tokens.
                  </p>
                  <Button
                    onClick={addFlowEVMNetwork}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1"
                  >
                    Add Flow EVM Testnet to MetaMask
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Stake Amount (FLOW)
                <img src="/images/flow-logo.png" alt="FLOW" className="w-4 h-4 inline ml-1" /></Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount (whole numbers only)"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  className="pl-10"
                  min="1"
                  step="1"
                />
              </div>
              <p className="text-xs text-gray-500">
                Only whole numbers allowed (no decimals)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="predictedMarks">Predicted Marks (%)</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400 text-sm">%</span>
                <Input
                  id="predictedMarks"
                  type="number"
                  placeholder="Enter predicted marks (minimum 40%)"
                  value={predictedMarks}
                  onChange={(e) => setPredictedMarks(e.target.value)}
                  className={`pl-8 ${predictedMarks && parseFloat(predictedMarks) < 40 ? 'border-red-500 focus:border-red-500' : ''}`}
                  min="40"
                  max="100"
                  step="0.1"
                />
              </div>
              <p className="text-xs text-gray-500">
                Minimum predicted marks: 40%. More accurate predictions may earn bonus rewards!
              </p>
              {predictedMarks && parseFloat(predictedMarks) < 40 && (
                <p className="text-xs text-red-500">
                  Predicted marks must be at least 40%
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleClose} className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                Cancel
              </Button>
              <Button
                onClick={handleStake}
                disabled={loading || !amount || parseFloat(amount) <= 0 || !predictedMarks || parseFloat(predictedMarks) < 40 || parseFloat(predictedMarks) > 100}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Processing..." : "Stake FLOW"}
              </Button>
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <img src="/images/flow-logo.png" alt="FLOW" className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold">Confirm Stake</h3>
            <p className="text-gray-600">
              Confirm the staking transaction in your wallet
            </p>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <p className="font-semibold">{amount} FLOW → {candidateName}</p>
              <p className="text-sm text-gray-600">Predicted Score: {predictedMarks}%</p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleConfirmStake}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? "Processing..." : "Confirm Stake"}
              </Button>
              <Button
                onClick={() => setStep("stake")}
                className="w-full border border-gray-300 bg-white hover:bg-gray-50"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stake FLOW</DialogTitle>
          <DialogDescription>
            Stake your FLOW tokens for this exam to participate in the prediction market.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default IntegratedStakeDialog;