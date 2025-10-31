# PeerBet: Decentralized Academic Prediction Markets on Flow EVM 🚀

> **Transforming academic accountability through decentralized prediction markets, powered by Flow EVM.**

## 💡 Problem Statement

Traditional educational environments lack structured peer accountability mechanisms and fail to leverage the motivational power of social and financial incentives. Students often struggle with self-motivation, and peers have no systematic way to support or engage with each other's academic goals.

## 🎯 Our Solution

**PeerBet** is a decentralized prediction market platform built on Flow EVM that gamifies academic achievement through peer-to-peer staking. Students can stake FLOW tokens on their classmates' exam performance, creating a transparent, trustless system where:

- **Verifiers** (instructors/teachers) create and grade exams on-chain
- **Students** stake on predicted outcomes for themselves or peers
- **Smart contracts** automatically settle stakes and distribute rewards based on actual results

This creates powerful financial and social incentives for academic excellence while maintaining full transparency and fairness through blockchain technology.

---

## 🏆 Flow Hackathon Submission

### Project Evolution

PeerBet builds upon **Staked**, our existing production application that successfully implemented prediction markets for academic outcomes using PyUSD on Ethereum. For this hackathon, we've strategically migrated and enhanced our proven platform to leverage Flow EVM's superior performance and ecosystem benefits.

### Why Flow EVM?

**Migration Benefits:**
- **Lower Transaction Costs**: Significantly reduced gas fees compared to Ethereum mainnet
- **Faster Finality**: Near-instant transaction confirmation for better UX
- **Native FLOW Integration**: Seamless use of FLOW tokens for staking mechanics
- **Growing Ecosystem**: Access to Flow's expanding DeFi and gaming communities
- **Developer Experience**: EVM compatibility allows us to leverage our existing Solidity expertise while gaining Flow's advantages

### Technical Achievements

| Category | Implementation | Impact |
|----------|----------------|---------|
| **Smart Contract Architecture** | Multi-contract system with `ExamStaking.sol`, `StudentRegistry.sol`, and `VerifierRegistry.sol` deployed on Flow EVM | Modular, upgradeable design enabling complex staking logic and role-based access control |
| **Flow EVM Integration** | Native FLOW token support, custom RPC configuration, and Flow-specific transaction handling | Full compatibility with Flow ecosystem while maintaining EVM standards |
| **Production-Ready Backend** | Node.js/Express API with MongoDB caching layer for efficient blockchain data querying | Sub-second response times for analytics and user dashboards |
| **Modern Frontend** | React + TypeScript with Web3Auth integration for seamless wallet connection | Intuitive UX with keyless authentication lowering barriers to entry |
| **Real-Time Analytics** | Blockscout API integration tracking staking volume, win rates, and earnings | Data-driven insights for users and platform metrics |

---

## ✨ Key Features

* **Peer-to-Peer Staking:** Students can stake a desired amount on a classmate's performance (e.g., predicting a score of 90/100) for any registered exam.
* **Verifier System:** Designated Verifiers (e.g., teachers) can register classes and create exams.
* **Decentralized Grading & Payout:** The Verifier submits the final score on-chain, and the smart contract automatically settles all peer stakes and distributes rewards to the winners.
* **Student Analytics:** Detailed dashboard showing staking history, win rate, and total earned rewards to gamify the learning process.
* **Secure Authentication:** Utilizes Web3Auth for seamless, keyless wallet connection to the Flow network.

---

## 🛠️ Tech Stack

### Smart Contracts (Flow EVM)
* **Language:** Solidity
* **Framework:** Hardhat
* **Chain:** **Flow EVM** Testnet
* **Key Contracts:** `ExamStaking.sol`, `StakEDManager.sol`, `VerifierRegistry.sol`

### Backend (Data & API)
* **Framework:** Node.js (Express)
* **Database:** MongoDB (Mongoose)
* **Web3:** Ethers.js (for transaction monitoring)

### Frontend (User Interface)
* **Framework:** React + Vite
* **Styling:** Tailwind CSS + Shadcn UI
* **Web3 Integration:** Wagmi, Web3Modal, Ethers.js

---

## 🏃 Getting Started (Local Setup)

To run **PeerBet** locally, please follow the setup steps in the respective directories.

### 1. Smart Contracts

1.  Navigate to the `contracts/` directory.
2.  Install dependencies: `npm install`
3.  Compile contracts: `npx hardhat compile`
4.  Deploy to Flow EVM (ensure your environment is configured for a Flow EVM network):
    ```bash
    npx hardhat run scripts/deploy-flow.ts --network <FLOW_NETWORK>
    # Note: Refer to contracts/scripts/deploy-flow.ts for deployment specifics.
    ```

### 2. Backend

1.  Navigate to the `backend/` directory.
2.  Install dependencies: `npm install`
3.  Set up environment variables (e.g., `MONGO_URI`, contract addresses, `FLOW_EVM_RPC_URL`).
4.  Run the server: `npm start`

### 3. Frontend

1.  Navigate to the `frontend/` directory.
2.  Install dependencies: `npm install`
3.  Set up environment variables (e.g., `VITE_BACKEND_URL`, contract ABIs/Addresses).
4.  Run the development server: `npm run dev`