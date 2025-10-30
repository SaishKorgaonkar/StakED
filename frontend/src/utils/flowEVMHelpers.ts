// Flow EVM connection helper for StakED migration
// Import and use these functions in your React components

import { web3Utils } from '../lib/web3Utils';

export const connectToFlowEVM = async (): Promise<string> => {
  try {
    // Connect wallet
    const address = await web3Utils.connectWallet();
    console.log('Connected wallet:', address);
    
    // Check/switch to Flow EVM network
    await web3Utils.checkNetwork();
    console.log('Connected to Flow EVM Testnet');
    
    return address;
  } catch (error) {
    console.error('Flow EVM connection error:', error);
    throw error;
  }
};

// Check if user has sufficient FLOW balance for staking
export const checkFlowBalance = async (address: string, requiredAmount: string): Promise<boolean> => {
  try {
    const balance = await web3Utils.getFlowBalance(address);
    const balanceNum = parseFloat(balance);
    const requiredNum = parseFloat(requiredAmount);
    
    return balanceNum >= requiredNum;
  } catch (error) {
    console.error('Balance check failed:', error);
    return false;
  }
};

// Approve and stake FLOW tokens in one flow
export const stakeWithFlow = async (
  examId: string, 
  candidate: string, 
  amount: string, 
  predictedScore: number
): Promise<void> => {
  try {
    // First approve FLOW tokens
    console.log('Approving FLOW tokens...');
    const approveTx = await web3Utils.approveFlow(amount);
    await approveTx.wait();
    
    // Then stake
    console.log('Staking on exam...');
    const stakeTx = await web3Utils.stakeOnExam(examId, candidate, amount, predictedScore);
    await stakeTx.wait();
    
    console.log('Staking successful!');
  } catch (error) {
    console.error('Staking failed:', error);
    throw error;
  }
};

// Add Flow EVM network to MetaMask
export const addFlowEVMToMetaMask = async (): Promise<void> => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x221', // 545 in hex
        chainName: 'Flow EVM Testnet',
        nativeCurrency: {
          name: 'FLOW',
          symbol: 'FLOW',
          decimals: 18,
        },
        rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
        blockExplorerUrls: ['https://evm-testnet.flowscan.org'],
      }],
    });
  } catch (error) {
    console.error('Failed to add Flow EVM network:', error);
    throw error;
  }
};

// Switch to Flow EVM network
export const switchToFlowEVM = async (): Promise<void> => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x221' }], // 545 in hex
    });
  } catch (error: any) {
    // If network not added, add it first
    if (error.code === 4902) {
      await addFlowEVMToMetaMask();
    } else {
      throw error;
    }
  }
};

/* 
Example usage in React components:

// Connect wallet button
const handleConnect = async () => {
  try {
    const address = await connectToFlowEVM();
    setWalletAddress(address);
  } catch (error) {
    console.error('Connection failed:', error);
  }
};

// Stake with validation
const handleStake = async () => {
  try {
    const hasBalance = await checkFlowBalance(walletAddress, stakeAmount);
    if (!hasBalance) {
      alert('Insufficient FLOW balance');
      return;
    }
    
    await stakeWithFlow(examId, candidateAddress, stakeAmount, predictedScore);
    alert('Stake successful!');
  } catch (error) {
    alert('Staking failed: ' + error.message);
  }
};
*/