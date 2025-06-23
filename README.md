# SepoMiner

An educational Proof-of-Work decentralized application (DApp) deployed on the Sepolia Ethereum testnet. Users connect with MetaMask, guess a cryptographic nonce under a configurable difficulty target, and earn small ETH rewards when successful.

Built with:

* **Solidity** (OpenZeppelin) for the smart contract
* **Hardhat** for compilation, testing, and deployment
* **Ethers.js** for blockchain interactions
* **React + Vite** for the frontend UI

---

## 🚀 Features

* 🔌 **MetaMask Integration**: Connect and disconnect your wallet
* ⛏️ **Nonce Submission**: Enter or auto-find a valid nonce
* 🎉 **On-chain Rewards**: Earn 0.0005 Sepolia ETH per valid nonce
* 📜 **Mining History**: View past successful submissions
* 🏆 **Leaderboard**: Ranks miners by successful submissions
* 🔧 **Admin Controls**: Owner-only difficulty & reward tuning, emergency withdrawal
* 🌗 **Dark/Light Mode**

---

## 📋 Prerequisites

* [Node.js](https://nodejs.org/) ≥ v16
* [Yarn](https://yarnpkg.com/) or npm
* [MetaMask](https://metamask.io/) browser extension set to **Sepolia Test Network**
* A Sepolia-funded account (for contract funding & rewards)

---

## ⚙️ Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/SepoMiner.git
   cd SepoMiner
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**

   Create a file at `sepo-miner-ui/.env` (frontend) and at project root `/.env` (Hardhat) with:

   ```env
   # Hardhat (.env at project root)
   PRIVATE_KEY=your_deployer_private_key
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

   # Frontend (sepo-miner-ui/.env)
   VITE_CONTRACT_ADDRESS=deployed_contract_address
   VITE_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
   ```

   > 🔒 **Never** commit your private key to source control.

4. **Compile & Deploy Smart Contract**

   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network sepolia
   ```

   Copy the deployed address and paste it into `sepo-miner-ui/.env` as `VITE_CONTRACT_ADDRESS`.

5. **Fund the Contract**
   Send at least 0.05 ETH (Sepolia testnet) to the deployed contract address to cover mining rewards.

6. **Start the Frontend**

   ```bash
   cd sepo-miner-ui
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:5173](http://localhost:5173) and connect your MetaMask wallet.

---

## 🔍 Usage

1. **Connect Wallet**: Click “Connect Wallet” and approve in MetaMask.
2. **View Stats**: See your account, contract owner, difficulty, last hash, contract balance, and reward amount.
3. **Mine**:

   * Enter a numeric **nonce** you believe produces a valid hash.
   * (Admin only) Click “🔍 Auto-Find” to scan for a valid nonce automatically.
   * Click **Submit**.
   * On success, you receive 0.0005 ETH; on failure, you are prompted to try again.
4. **View History & Leaderboard**: Scroll down to see all past successful mining attempts and top miners.
5. **Admin Controls** (owner only):

   * **Set Difficulty**: Adjust the mining difficulty.
   * **Set Reward**: Change the ETH reward per mine.
   * **Emergency Withdraw**: (via contract) retrieve unspent funds.

---

## 🏗️ Architecture

```
User Wallet (MetaMask)
        ⬇
React Frontend ⟷ Ethers.js ⟷ Sepolia RPC
        ⬇                      ⬇
    Smart Contract (ProofOfWork.sol)
        ⬆
  WorkSubmitted Event
        ⬇
Leaderboard & Mining History
```

---

## 📄 License

MIT © [Hamza Fayyaz(https://github.com/hmzafayyaz)

---

## 📝 Acknowledgments

* OpenZeppelin
* Hardhat
* Ethers.js
* Vite & React
