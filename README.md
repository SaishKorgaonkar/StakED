# PeerBet: Decentralized Predictive Staking on Flow 🚀

> **The next-generation motivation layer for academic success, powered by the Flow EVM and Forte.**

## 💡 The Problem & The Solution

In traditional learning environments, peer pressure and accountability are often unstructured and unrewarded. **PeerBet** transforms this by creating a **decentralized prediction market** around academic outcomes (like exam scores, project completion, or performance milestones).

**PeerBet** allows students and peers to stake **WFLOW** on the results of their classmates (or themselves) in a specific academic event set by an authorized Verifier (e.g., a teacher/instructor).

When the Verifier sets the final score on the Flow EVM, the stakes are automatically settled, and rewards are distributed to the correct prediction pools. This creates a powerful, financial incentive for accountability and a dynamic, engaging prediction layer on top of education.

---

## 🔥 Flow Forte Hacks Track Achievements

PeerBet was built specifically to leverage the power of the Flow network and its ecosystem, directly addressing the core hackathon tracks:

| Track | Achievement | Evidence |
| :--- | :--- | :--- |
| **Killer App** | A novel use case of DeFi principles (Prediction Markets) applied to the massive education sector, solving real-world accountability and motivation problems. | *Unique dApp logic demonstrated by `ExamStaking.sol` and `StakEDManager.sol`.* |
| **Forte Actions / Flow EVM** | Core smart contract logic is deployed and operates on the **Flow EVM**, utilizing **WFLOW** as the staking token. Verifiers use a dedicated dashboard to trigger on-chain actions to create and grade exams. | *Integration with Flow EVM via web3 utilities and explicit deployment scripts for Flow.* |
| **Existing Code Integration** | A seamless, full-stack architecture combines a modern frontend, a powerful backend API, and a robust on-chain contract system. The system uses a MongoDB backend to efficiently cache and query read-only blockchain data. | *The project utilizes React/Vite/Shadcn-UI for the frontend, a Node/Express/Mongoose backend and a Hardhat/Solidity smart contract layer.* |
| **Dune Analytics** | The architecture includes dedicated API endpoints to serve data aggregated for Dune Analytics dashboards, enabling real-time performance tracking for exams, staking volume, and user win rates. | *Presence of `analyticsRoutes.js` and controllers for fetching analytics data demonstrate the intent for a Dune integration.* |

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