# StakED: Decentralized Predictive Staking for Education 🌍

**🔗 Live Project:** [stak-ed.vercel.app](https://stak-ed.vercel.app/)

**▶️ Demo Video:** [StakED](https://drive.google.com/file/d/1l5fFu38E3DlQPauopqyF68TBT52AXokl/view?usp=drive_link)

> **Leveraging Decentralized Intelligence and Blockchain to unlock peer accountability and academic performance across Africa.**

***

## 💡 The Problem & The Solution

In many emerging education sectors, particularly across Africa, structured peer-to-peer accountability is a significant barrier to student success. Traditional learning environments often lack formalized and incentivized mechanisms for peer motivation and outcome tracking.

**StakED** directly addresses this by creating a **decentralized prediction market** around key academic outcomes (like exam scores, project completion, or performance milestones).

**StakED** allows students and peers to stake **Pyusd** on the results of their classmates (or themselves) in a specific academic event set by an authorized Verifier (e.g., a teacher/instructor).

When the Verifier sets the final score on the EVM, the stakes are automatically settled, and rewards are distributed to the correct prediction pools. This creates a powerful, transparent financial incentive for accountability, gamifying the learning process and driving student motivation across the continent.

***

## 🔥 Power Hacks 2025: AI & Blockchain Tracks

StakED is designed as a foundational layer for decentralized education, directly aligning with the Power Hacks 2025 theme of **AI-Driven Agents & Blockchain**.

| Track | Achievement | Evidence |
| :--- | :--- | :--- |
| **Decentralized Intelligence** | Applying Prediction Markets (a core DeFi principle and form of decentralized intelligence) to the massive African EdTech sector, directly addressing accountability and motivation challenges critical for developmental education. | *Core dApp logic demonstrated by `ExamStaking.sol` and `StakEDManager.sol` defines the predictive market structure.* |
| **Blockchain for Good (EdTech)** | Deploying transparent, immutable smart contract logic on a secure EVM network to foster trust and introduce financial literacy concepts using the **Pyusd** stablecoin as the reliable staking token. | *Deployed on **Sepolia Testnet**. Leverages standard web3 utilities and is verifiable via **Blockscout**.* |
| **Scalable Full-Stack Architecture** | StakED features a seamless, full-stack architecture, combining a modern React/Vite/Shadcn-UI frontend, a powerful Node/Express/Mongoose backend (used to efficiently cache and query read-only blockchain data), and a robust Hardhat/Solidity smart contract layer. | *The project utilizes React/Vite/Shadcn-UI for the frontend, a Node/Express/Mongoose backend and a Hardhat/Solidity smart contract layer.* |

***

## ✨ Key Features

* **Peer-to-Peer Staking:** Students can stake a desired amount of **Pyusd** on a classmate's performance (e.g., predicting a score of 90/100) for any registered exam.
* **Verifier System:** Designated Verifiers (e.g., teachers) can register classes and create exams.
* **Decentralized Grading & Payout:** The Verifier submits the final score on-chain, and the smart contract automatically settles all peer stakes and distributes rewards to the winners.
* **Student Analytics:** Detailed dashboard showing staking history, win rate, and total earned rewards to gamify the learning process.
* **Secure Authentication:** Utilizes Web3Auth for seamless, keyless wallet connection.

***

## 🛠️ Tech Stack

### Smart Contracts (EVM Compatible)
* **Language:** Solidity
* **Framework:** Hardhat
* **Chain:** **Sepolia Testnet**
* **Explorer:** **Blockscout**
* **Key Contracts:** `ExamStaking.sol`, `StakEDManager.sol`, `VerifierRegistry.sol`

### Backend (Data & API)
* **Framework:** Node.js (Express)
* **Database:** MongoDB (Mongoose)
* **Web3:** Ethers.js (for transaction monitoring)

### Frontend (User Interface)
* **Framework:** React + Vite
* **Styling:** Tailwind CSS + Shadcn UI
* **Web3 Integration:** Wagmi, Web3Modal, Ethers.js

***

## 🏃 Getting Started (Local Setup)

To run **StakED** locally, please follow the setup steps in the respective directories.

### 1. Smart Contracts

1.  Navigate to the `contracts/` directory.
2.  Install dependencies: `npm install`
3.  Compile contracts: `npx hardhat compile`
4.  Deploy to Sepolia Testnet (ensure your environment is configured for the Sepolia network):
    ```bash
    npx hardhat run scripts/deploy-flow.ts --network sepolia
    # Note: Refer to contracts/scripts/deploy-flow.ts for deployment specifics.
    ```

### 2. Backend

1.  Navigate to the `backend/` directory.
2.  Install dependencies: `npm install`
3.  Set up environment variables (e.g., `MONGO_URI`, contract addresses, `EVM_RPC_URL` pointing to Sepolia).
4.  Run the server: `npm start`

### 3. Frontend

1.  Navigate to the `frontend/` directory.
2.  Install dependencies: `npm install`
3.  Set up environment variables (e.g., `VITE_BACKEND_URL`, contract ABIs/Addresses).
4.  Run the development server: `npm run dev`
