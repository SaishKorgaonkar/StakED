import { ethers } from "ethers";

export const CONTRACT_ADDRESSES = {
  // Flow EVM Contract Addresses (Updated with native FLOW) - Using proper checksum
  EXAM_STAKING_ADDRESS: import.meta.env.VITE_EXAM_STAKING_ADDRESS || "0xEBE5a5Db823873CC209aF9FF717A0203e02F907F",
  STUDENT_REGISTRY_ADDRESS: import.meta.env.VITE_STUDENT_REGISTRY_ADDRESS || "0xA8821F82012E467A8dD2362FE26F0d4A2F4B5D46",
  VERIFIER_REGISTRY_ADDRESS: import.meta.env.VITE_VERIFIER_REGISTRY_ADDRESS || "0x63611Dd7ddFFFeD346EBE23af118F941Be8E2142",
  
  // Legacy addresses (deprecated)
  PYUSD_ADDRESS: import.meta.env.VITE_PYUSD_ADDRESS || "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // Legacy
};

// Alias for backwards compatibility
export const CONTRACTS = CONTRACT_ADDRESSES;

export const ABIS = {
  // Native FLOW - no token contract needed
  
  EXAM_STAKING: [
    "function stake(bytes32 examId, address candidate, uint256 predictedScore) external payable", // Updated for native FLOW
    "function claim(bytes32 examId) external",
    "function refund(bytes32 examId, address candidate) external",
    "function createExam(bytes32 examId, address verifier, address[] candidates, uint64 stakeDeadline, uint16 feeBps) external",
    "function setStudentScores(bytes32 examId, address[] students, uint256[] scores) external",
    "function distributeRewards(bytes32 examId) external",
    "function getExam(bytes32 examId) external view returns (address verifier, uint64 stakeDeadline, bool finalized, bool canceled, uint16 feeBps, uint256 totalStake, uint256 protocolFee, address[] memory candidates)",
    "function stakeOf(bytes32 examId, address staker, address candidate) external view returns (uint256)",
    "function totalOn(bytes32 examId, address candidate) external view returns (uint256)",
    "function getStudentScore(bytes32 examId, address student) external view returns (uint256)",
    "function getPredictedScore(bytes32 examId, address student) external view returns (uint256)",
    "function isStakingOpen(bytes32 examId) external view returns (bool)",
    "function isWinner(bytes32 examId, address candidate) external view returns (bool)",
    "function hasClaimed(bytes32 examId, address staker) external view returns (bool)"
  ],
  
  STUDENT_REGISTRY: [
    "function registerStudent(address student) external",
    "function isRegistered(address student) external view returns (bool)"
  ],

  // Legacy ABIs (for migration reference)
  FLOW_TOKEN: [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ],
  
  PYUSD: [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ]
};

// Utility functions
export class Web3Utils {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  private getExamStakingContract(signer?: ethers.JsonRpcSigner): ethers.Contract {
    const contractAddress = ethers.getAddress(CONTRACTS.EXAM_STAKING_ADDRESS);
    return new ethers.Contract(contractAddress, ABIS.EXAM_STAKING, signer || this.provider);
  }

  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send("eth_requestAccounts", []);
    this.signer = await this.provider.getSigner();
    
    return await this.signer.getAddress();
  }

  async checkNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    const network = await this.provider.getNetwork();
    console.log("[web3Utils] Current network:", network.chainId.toString());
    
    // Flow EVM Testnet chain ID: 545
    if (network.chainId !== 545n) {
      console.log("[web3Utils] ⚠️ Not on Flow EVM Testnet (545), currently on:", network.chainId.toString());
      // Don't automatically switch - let the IntegratedStakeDialog handle it
      // to avoid conflicts with manual switching
      console.log("[web3Utils] Skipping automatic switch - manual control enabled");
      return;
    } else {
      console.log("[web3Utils] ✅ Already on Flow EVM Testnet");
    }
  }

  async getFlowBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    // Native FLOW balance (like ETH)
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance); // FLOW has 18 decimals
  }

  async stakeOnExam(examId: string, candidateAddress: string, amount: string, predictedScore: number): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract(this.signer);
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    const amountWei = ethers.parseEther(amount); // FLOW has 18 decimals
    
    // Send native FLOW with the transaction
    return await contract.stake(examIdBytes, ethers.getAddress(candidateAddress), predictedScore, { value: amountWei });
  }

  async getExamInfo(examId: string): Promise<{
    verifier: string;
    stakeDeadline: number;
    finalized: boolean;
    canceled: boolean;
    feeBps: number;
    totalStake: string;
    protocolFee: string;
    candidates: string[];
  }> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract();
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    const [verifier, stakeDeadline, finalized, canceled, feeBps, totalStake, protocolFee, candidates] = 
      await contract.getExam(examIdBytes);
    
    return {
      verifier,
      stakeDeadline: Number(stakeDeadline),
      finalized,
      canceled,
      feeBps: Number(feeBps),
      totalStake: ethers.formatEther(totalStake), // FLOW has 18 decimals (native)
      protocolFee: ethers.formatEther(protocolFee), // FLOW has 18 decimals (native)
      candidates
    };
  }

  async getUserStake(examId: string, userAddress: string, candidateAddress: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract();
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    const stake = await contract.stakeOf(examIdBytes, ethers.getAddress(userAddress), ethers.getAddress(candidateAddress));
    return ethers.formatEther(stake); // FLOW has 18 decimals (native)
  }

  async getTotalStakeOnCandidate(examId: string, candidateAddress: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract();
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    const total = await contract.totalOn(examIdBytes, ethers.getAddress(candidateAddress));
    return ethers.formatEther(total); // FLOW has 18 decimals (native)
  }

  async claimRewards(examId: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract(this.signer);
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    return await contract.claim(examIdBytes);
  }

  async refundStake(examId: string, candidateAddress: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract(this.signer);
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    return await contract.refund(examIdBytes, ethers.getAddress(candidateAddress));
  }

  // Verifier functions
  async setStudentScores(examId: string, students: string[], scores: number[]): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract(this.signer);
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    // Ensure all student addresses have proper checksum
    const checksummedStudents = students.map(addr => ethers.getAddress(addr));
    return await contract.setStudentScores(examIdBytes, checksummedStudents, scores);
  }

  async getPredictedScore(examId: string, studentAddress: string): Promise<number> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract();
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    const predicted = await contract.getPredictedScore(examIdBytes, ethers.getAddress(studentAddress));
    return Number(predicted);
  }

  async distributeRewards(examId: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract(this.signer);
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    return await contract.distributeRewards(examIdBytes);
  }

  async createExam(examId: string, verifier: string, candidates: string[], stakeDeadline: number, feeBps: number): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const contract = this.getExamStakingContract(this.signer);
    const examIdBytes = ethers.keccak256(ethers.toUtf8Bytes(examId));
    
    // Ensure all addresses have proper checksum
    const checksummedCandidates = candidates.map(addr => ethers.getAddress(addr));
    return await contract.createExam(examIdBytes, ethers.getAddress(verifier), checksummedCandidates, stakeDeadline, feeBps);
  }
}

export const web3Utils = new Web3Utils();

export const getExamIdBytes = (examId: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(examId));
};

// Flow token formatting (18 decimals)
export const formatFlow = (amount: string, decimals: number = 4): string => {
  const num = parseFloat(amount);
  return num.toFixed(decimals);
};

// Legacy PYUSD formatting (6 decimals) - keeping for migration reference
export const formatPyusd = (amount: string, decimals: number = 2): string => {
  const num = parseFloat(amount);
  return num.toFixed(decimals);
};

// Network configuration for Flow EVM
export const FLOW_EVM_NETWORK = {
  chainId: "0x221", // 545 in hex
  chainName: "Flow EVM Testnet",
  nativeCurrency: {
    name: "FLOW",
    symbol: "FLOW",
    decimals: 18,
  },
  rpcUrls: ["https://testnet.evm.nodes.onflow.org"],
  blockExplorerUrls: ["https://evm-testnet.flowscan.io"],
};