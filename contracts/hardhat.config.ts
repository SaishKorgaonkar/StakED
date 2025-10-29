import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
networks: {
  hardhat: {
    type: "edr-simulated", 
    chainType: "l1",
  },
  localhost: {
    type: "http",          
    chainType: "l1",
    url: "http://127.0.0.1:8545",
  },
  sepolia: {
    type: "http",           
    chainType: "l1",
    url: process.env.SEPOLIA_RPC_URL || "",
    accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
  },
  // Flow EVM Testnet - production configuration for StakED migration
  flowTestnet: {
    type: "http",
    chainType: "l1", 
    url: process.env.FLOW_EVM_TESTNET_RPC_URL || "https://testnet.evm.nodes.onflow.org",
    chainId: 545, // Flow EVM Testnet chain ID
    accounts: process.env.FLOW_EVM_PRIVATE_KEY ? [process.env.FLOW_EVM_PRIVATE_KEY] : [],
    gas: 2100000,
    gasPrice: 8000000000, // 8 gwei - optimal for Flow EVM
  },
},

};

export default config;
