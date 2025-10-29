import { useState } from "react";
import { ethers } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, DollarSign, AlertCircle } from "lucide-react";
import { useNotification } from "../../hooks/useNotification";

interface StakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetType: "exam" | "student";
  targetId: string;
  targetName: string;
  examId?: string;
}

const FLOW_TOKEN_ADDRESS = "0x0000000000000000000000010000000000000000"; // Native FLOW token
const EXAM_STAKING_ADDRESS = "0x45E8E7F39cf0Dc903B7471C80e8AC61dab283B9A"; // Updated for Flow EVM

const FLOW_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const EXAM_STAKING_ABI = [
  "function stake(bytes32 examId, address candidate, uint256 amount, uint256 predictedScore) external",
  "function getExam(bytes32 examId) external view returns (address verifier, uint64 stakeDeadline, bool finalized, bool canceled, uint16 feeBps, uint256 totalStake, uint256 protocolFee, address[] memory candidates)"
];

export default function StakeDialog({
  isOpen,
  onClose,
  onSuccess,
  targetType,
  targetId,
  targetName,
  examId
}: StakeDialogProps) {
  const { notify } = useNotification();
  const [amount, setAmount] = useState("");
  const [predictedScore, setPredictedScore] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [flowBalance, setFlowBalance] = useState("0");

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        console.error("MetaMask not installed");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setUserAddress(address);
      setWalletConnected(true);

      // Get FLOW balance using native balance (not ERC20 contract)
      const balance = await provider.getBalance(address);
      setFlowBalance(ethers.formatUnits(balance, 18)); // FLOW has 18 decimals
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
    }
  };

  const approveAndStake = async () => {
    if (!walletConnected || !amount || parseFloat(amount) <= 0) {
      console.error("Invalid stake amount");
      return;
    }
    
    if (!predictedScore || parseFloat(predictedScore) < 0 || parseFloat(predictedScore) > 100) {
      console.error("Invalid predicted score");
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const stakeAmount = ethers.parseUnits(amount, 18); // FLOW has 18 decimals
      
      // For native FLOW, check balance directly from provider
      const balance = await provider.getBalance(userAddress);
      
      if (balance < stakeAmount) {
        console.error("Insufficient FLOW balance");
        return;
      }

      // Native FLOW doesn't need approval, send with transaction
      const stakingContract = new ethers.Contract(EXAM_STAKING_ADDRESS, EXAM_STAKING_ABI, signer);
      const stakeTx = await stakingContract.stake(
        targetId, 
        targetId, 
        stakeAmount, 
        ethers.parseUnits(predictedScore, 0),
        { value: stakeAmount } // Send FLOW as native value
      );
        notify({
          txHash: approveTxReceipt.hash
        });
      }

      const examStakingContract = new ethers.Contract(EXAM_STAKING_ADDRESS, EXAM_STAKING_ABI, signer);
      
      const predictedScoreInt = Math.floor(parseFloat(predictedScore));
      
      let stakeTx;
      if (targetType === "exam") {
        const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes("two-student-final"));
        stakeTx = await examStakingContract.stake(examIdBytes, userAddress, stakeAmount, predictedScoreInt);
      } else {
        const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId || "two-student-final"));
        stakeTx = await examStakingContract.stake(examIdBytes, targetId, stakeAmount, predictedScoreInt);
      }

      const stakeTxReceipt = await stakeTx.wait();
      console.log("Transaction confirmed, receipt:", stakeTxReceipt);
      
      notify({
        txHash: stakeTxReceipt.hash,
        comment: `Staked ${amount} PYUSD on ${predictedScore}%`
      });
      console.log("Notification triggered for hash:", stakeTxReceipt.hash);
      
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("Staking failed:", error);
      // For failed transactions, we still want to show the transaction in the explorer
      if (error.transaction?.hash) {
        console.log("Showing notification for failed transaction:", error.transaction.hash);
        notify({
          txHash: error.transaction.hash
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setPredictedScore("");
    setIsLoading(false);
    setWalletConnected(false);
    setUserAddress("");
    setFlowBalance("0");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-center uppercase flex items-center justify-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Stake FLOW
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Place your FLOW tokens stake and predict the outcome
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-md">
            <p className="text-sm font-semibold text-blue-800">
              {targetType === "exam" 
                ? `Staking on exam: ${targetName}`
                : `Staking on student: ${targetName}`
              }
            </p>
          </div>

          {!walletConnected ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Wallet className="w-5 h-5" />
                <p className="font-semibold">Connect your wallet to continue</p>
              </div>
              <Button
                onClick={connectWallet}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
              >
                Connect MetaMask
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border-2 border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-800 mb-1">
                  <Wallet className="w-4 h-4" />
                  <p className="text-sm font-bold">Wallet Connected</p>
                </div>
                <p className="text-xs font-mono text-green-700">
                  {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </p>
                <p className="text-sm font-semibold text-green-800 mt-1">
                  FLOW Balance: {parseFloat(flowBalance).toFixed(2)}
                </p>
              </div>

              <div>
                <Label className="uppercase text-xs font-bold text-gray-800 mb-2 block">
                  Stake Amount (PYUSD)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  placeholder="Enter whole PYUSD amount (no decimals)"
                  className="bg-white border-2 border-black px-3 py-3 text-base font-semibold"
                />
              </div>

              <div>
                <Label className="uppercase text-xs font-bold text-gray-800 mb-2 block">
                  Predicted Score (%)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={predictedScore}
                  onChange={(e) => setPredictedScore(e.target.value)}
                  placeholder="Enter your predicted score (0-100)"
                  className="bg-white border-2 border-black px-3 py-3 text-base font-semibold"
                />
                <p className="text-xs text-gray-600 mt-1">
                  💡 You win if your actual score ≥ predicted score!
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-orange-50 border-2 border-orange-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-800">
                  <p className="font-semibold mb-1">New Logic - Prediction Based:</p>
                  <p>✅ Win: Actual score ≥ Predicted score</p>
                  <p>❌ Lose: Actual score &lt; Predicted score</p>
                  <p className="mt-1 font-medium">Winners share losers' stakes proportionally!</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleClose}
                  className="flex-1 border-2 border-gray-400 bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={approveAndStake}
                  disabled={isLoading || !amount || parseFloat(amount) <= 0 || !predictedScore}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  {isLoading ? "Processing..." : `Stake ${amount || "0"} PYUSD`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}