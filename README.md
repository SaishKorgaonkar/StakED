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

## ✨ Core Features

### For Students
* **Peer-to-Peer Staking**: Stake FLOW tokens on classmates' exam performance with customizable amounts
* **Comprehensive Analytics**: Real-time dashboard showing staking history, win rate, total earnings, and performance trends
* **Transparent Payouts**: Automated, trustless reward distribution via smart contracts
* **Social Engagement**: Leaderboards and classmate analytics to foster healthy competition

### For Verifiers (Instructors)
* **Class Management**: Create and manage multiple classes with registered students
* **Exam Creation**: Deploy exam contracts with configurable parameters and candidate lists
* **On-Chain Grading**: Submit final scores directly to the blockchain with automatic stake settlement
* **Audit Trail**: Immutable record of all grades and stake distributions

### Technical Highlights
* **Web3Auth Integration**: Passwordless, keyless wallet authentication for seamless onboarding
* **Blockscout Integration**: Real transaction data from Flow EVM explorer for accurate analytics
* **Gas Optimization**: Efficient contract design minimizing transaction costs
* **Security**: Role-based access control, reentrancy guards, and comprehensive input validation

---

## 🛠️ Technical Architecture

### Smart Contracts (Flow EVM Testnet)
* **Language**: Solidity ^0.8.28
* **Framework**: Hardhat
* **Network**: Flow EVM Testnet (Chain ID: 545)
* **Key Contracts**:
  - `ExamStaking.sol`: Core staking and reward distribution logic
  - `StudentRegistry.sol`: Student registration and verification
  - `VerifierRegistry.sol`: Instructor authorization and management

### Backend API
* **Runtime**: Node.js 18+
* **Framework**: Express.js
* **Database**: MongoDB with Mongoose ODM
* **Web3**: Ethers.js v6 for blockchain interaction
* **Caching**: MongoDB-based caching for Blockscout data

### Frontend Application
* **Framework**: React 18 + TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS + Shadcn UI components
* **Web3**: Web3Auth, Wagmi, Ethers.js
* **State Management**: React hooks with context API

### Infrastructure
* **RPC**: Flow EVM Testnet (`https://testnet.evm.nodes.onflow.org`)
* **Explorer**: Flowscan Blockscout (`https://evm-testnet.flowscan.io`)
* **Token**: Native FLOW token for all staking operations

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB instance (local or cloud)
- Flow EVM testnet FLOW tokens ([Get from faucet](https://testnet-faucet.onflow.org/))

### 1. Smart Contract Deployment

```bash
cd contracts
npm install
npx hardhat compile

# Deploy to Flow EVM Testnet
npx hardhat run scripts/deploy-flow.ts --network flowTestnet
```

**Note**: Save the deployed contract addresses for backend/frontend configuration.

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and deployed contract addresses

npm start
# Server runs on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with backend URL and contract addresses

npm run dev
# App runs on http://localhost:5173
```

---

## 📊 System Flow

1. **Verifier Registration**: Instructor registers and gets authorized on-chain
2. **Class Creation**: Verifier creates a class and adds students
3. **Exam Setup**: Verifier deploys exam contract with candidate list and parameters
4. **Staking Phase**: Students stake FLOW on predicted outcomes for candidates
5. **Grading**: Verifier submits final scores on-chain
6. **Settlement**: Smart contract automatically distributes rewards to winners
7. **Claiming**: Winners claim their rewards to their wallets

---

## 🔐 Security Considerations

- **Role-Based Access**: Only authorized verifiers can grade exams
- **Reentrancy Protection**: All withdrawal functions use checks-effects-interactions pattern
- **Input Validation**: Comprehensive validation on all user inputs and blockchain interactions
- **Transparent Logic**: All staking and distribution logic is publicly auditable on-chain

---

## 🎓 Use Cases

- **Academic Institutions**: Gamify classroom engagement and accountability
- **Online Learning Platforms**: Add peer prediction markets to course completion
- **Corporate Training**: Incentivize professional development programs
- **Study Groups**: Create peer accountability mechanisms with financial stakes

---

## 🛣️ Roadmap

- [ ] Multi-chain deployment (Flow mainnet, other EVMs)
- [ ] Advanced prediction types (grade ranges, percentile predictions)
- [ ] Social features (comments, stake explanations)
- [ ] Mobile application (React Native)
- [ ] Integration with learning management systems (LMS)

---

## 👥 Team

Built with ❤️ for the Flow Hackathon

---

## 📄 License

This project is licensed under the MIT License.

---

## 🔗 Links

- **Flow EVM Documentation**: [https://developers.flow.com/evm/](https://developers.flow.com/evm/)
- **Deployed Contracts**: [See FLOW_EVM_DEPLOYMENT.md](./FLOW_EVM_DEPLOYMENT.md)
- **Original Staked Project**: [Our production PyUSD implementation]

---

*PeerBet: Where education meets prediction markets on Flow EVM*