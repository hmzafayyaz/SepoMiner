import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ABI from "./abi/ProofOfWork.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
console.log("🛠️ CONTRACT_ADDRESS from .env:", CONTRACT_ADDRESS);

export default function App() {
  const [darkMode, setDarkMode]       = useState(false);
  const [connected, setConnected]     = useState(false);
  const [account, setAccount]         = useState("");
  const [contract, setContract]       = useState(null);
  const [owner, setOwner]             = useState("");
  const [difficulty, setDifficulty]   = useState("");
  const [lastHash, setLastHash]       = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [contractBalance, setContractBalance] = useState("");
  const [nonce, setNonce]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState("");
  const [cooldown, setCooldown]       = useState(0);
  const [history, setHistory]         = useState([]);
  const [leaderboard, setLeaderboard] = useState({});
  const [newDifficulty, setNewDifficulty] = useState("");
  const [newReward, setNewReward]     = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    const pow      = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const address = await signer.getAddress();
    setAccount(address);
    setContract(pow);
    setConnected(true);

    // load on-chain state
    const [contractOwner, d, lHash, reward, rawBalance] = await Promise.all([
      pow.owner(),
      pow.difficulty(),
      pow.lastHash(),
      pow.rewardAmount(),
      provider.getBalance(CONTRACT_ADDRESS),
    ]);
    setOwner(contractOwner);
    setDifficulty(d.toString());
    setLastHash(lHash);
    setRewardAmount(ethers.formatEther(reward) + " ETH");
    setContractBalance(ethers.formatEther(rawBalance) + " ETH");

    // load past events
    const filter = pow.filters.WorkSubmitted();
    const past   = await pow.queryFilter(filter, 0, "latest");
    const pastHist = past.map(e => ({
      miner:  e.args.miner,
      nonce:  e.args.nonce.toString(),
      hash:   e.args.hash,
      reward: ethers.formatEther(e.args.reward) + " ETH",
    }));
    const pastLB = pastHist.reduce((lb, e) => ({
      ...lb,
      [e.miner]: (lb[e.miner]||0)+1
    }), {});
    setHistory(pastHist.reverse());
    setLeaderboard(pastLB);

    // live listener
    pow.on("WorkSubmitted", (miner, n, hash, reward) => {
      const entry = {
        miner,
        nonce: n.toString(),
        hash,
        reward: ethers.formatEther(reward) + " ETH"
      };
      setHistory(h => [entry, ...h]);
      setLeaderboard(lb => ({ ...lb, [miner]: (lb[miner]||0)+1 }));
      // refresh contract balance
      provider.getBalance(CONTRACT_ADDRESS)
        .then(b => setContractBalance(ethers.formatEther(b) + " ETH"));
    });
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAccount("");
    setContract(null);
    setOwner("");
    setDifficulty("");
    setLastHash("");
    setRewardAmount("");
    setContractBalance("");
    setNonce("");
    setResult("");
    // history & leaderboard persist
  };

  const getEffectiveDifficulty = () => BigInt(difficulty || "1");

  const autoFindNonce = async () => {
    if (!contract) return alert("⚠️ Connect wallet first.");
    if (account.toLowerCase() !== owner.toLowerCase()) {
      return alert("🔒 Only owner may auto-find.");
    }
    let currentHash = lastHash;
    if (!currentHash || currentHash === "0x") {
      currentHash = await contract.lastHash();
      setLastHash(currentHash);
    }
    setResult("🔍 Searching for valid nonce…");
    const target = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") /
                   getEffectiveDifficulty();
    let n = Math.floor(Math.random() * 1_000_000);
    while (true) {
      const h = ethers.keccak256(
        ethers.solidityPacked(["bytes32","address","uint256"], [currentHash, account, n])
      );
      if (BigInt(h) < target) break;
      n++;
      if (n % 100000 === 0) await new Promise(r=>setTimeout(r,0));
    }
    setNonce(n.toString());
    setResult(`✅ Found nonce ${n}.`);
  };

const handleSubmit = async () => {
  if (!contract) {
    setResult("❗ Connect wallet");
    return;
  }
  if (!nonce) {
    setResult("❗ Enter a nonce");
    return;
  }
  if (cooldown > 0) {
    setResult(`⏳ Wait ${cooldown}s before next submit`);
    return;
  }

  setLoading(true);
  setResult("⏳ Testing nonce…");

  try {
    // — STATIC CALL in ethers v6:
    await contract.submitWork.staticCall(nonce);

    // If that passed, send the real transaction:
    setResult("🔄 Nonce valid, submitting on-chain…");
    const tx = await contract.submitWork(nonce);
    await tx.wait();

    // Success!
    const newHash = await contract.lastHash();
    setLastHash(newHash);
    setResult(`🎉 Success! Nonce ${nonce} accepted`);
  } catch (err) {
    // Extract revert reason
    const reason =
      err.reason ||
      err.error?.message ||
      err.data?.message ||
      err.message ||
      "Transaction failed";

    if (reason.includes("invalid nonce")) {
      setResult("❌ Wrong nonce — try again");
    } else if (reason.includes("insufficient funds")) {
      setResult("❌ Contract has no funds for reward");
    } else {
      console.error("submitWork error:", err);
      setResult(`⚠️ ${reason}`);
    }
  } finally {
    setLoading(false);
    setNonce("");

    // start cooldown
    setCooldown(30);
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    setTimeout(() => setResult(""), 5000);
  }
};

  const handleUpdateDifficulty = async () => {
    if (!contract) return;
    if (!newDifficulty) return setResult("❗ Enter new difficulty");
    try {
      const tx = await contract.setDifficulty(newDifficulty);
      await tx.wait();
      setDifficulty(newDifficulty);
      setResult(`🔧 Difficulty set to ${newDifficulty}`);
    } catch {
      setResult("❌ Difficulty update failed");
    }
  };

  const handleUpdateReward = async () => {
    if (!contract) return;
    if (!newReward) return setResult("❗ Enter new reward");
    try {
      const tx = await contract.setRewardAmount(
        ethers.parseEther(newReward) // e.g. "0.0005"
      );
      await tx.wait();
      setRewardAmount(newReward + " ETH");
      setResult(`💰 Reward set to ${newReward} ETH`);
    } catch {
      setResult("❌ Reward update failed");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">⛏️ SepoMiner</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={()=>setDarkMode(!darkMode)}
              className="p-2 bg-gray-200 dark:bg-gray-800 rounded"
            >{darkMode?"🌞 Light":"🌙 Dark"}</button>
            {connected ? (
              <button
                onClick={disconnectWallet}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm"
              >🔌 Disconnect</button>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >🔌 Connect Wallet</button>
            )}
          </div>
        </header>

        {connected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><strong>Account:</strong> {account}</div>
              <div><strong>Owner:</strong> {owner}</div>
              <div><strong>Balance:</strong> {contractBalance}</div>
              <div><strong>Difficulty:</strong> {difficulty}</div>
              <div><strong>Last Hash:</strong> {lastHash}</div>
              <div><strong>Reward:</strong> {rewardAmount}</div>
            </div>

            <div className="flex space-x-2">
              <input
                type="number"
                value={nonce}
                onChange={e=>setNonce(e.target.value)}
                placeholder="Nonce"
                className="flex-1 p-2 border rounded dark:bg-gray-800"
              />
              {account.toLowerCase()===owner.toLowerCase() && (
                <button
                  onClick={autoFindNonce}
                  className="px-3 py-2 bg-purple-600 text-white rounded"
                >🔍 Auto-Find</button>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading||cooldown>0}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {loading
                  ? "⏳ Mining…"
                  : cooldown>0
                    ? `Wait ${cooldown}s`
                    : "Submit"}
              </button>
            </div>

            {result && (
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">{result}</div>
            )}

            {account.toLowerCase()===owner.toLowerCase() && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <div>
                  <h2 className="font-semibold">🔧 Admin</h2>
                  <div className="flex space-x-2 mt-2">
                    <input
                      type="number"
                      value={newDifficulty}
                      onChange={e=>setNewDifficulty(e.target.value)}
                      placeholder="New difficulty"
                      className="flex-1 p-2 border rounded dark:bg-gray-800"
                    />
                    <button
                      onClick={handleUpdateDifficulty}
                      className="px-4 py-2 bg-yellow-500 text-white rounded"
                    >Set Diff</button>
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold">💰 Reward</h2>
                  <div className="flex space-x-2 mt-2">
                    <input
                      type="text"
                      value={newReward}
                      onChange={e=>setNewReward(e.target.value)}
                      placeholder="ETH amount e.g. 0.0005"
                      className="flex-1 p-2 border rounded dark:bg-gray-800"
                    />
                    <button
                      onClick={handleUpdateReward}
                      className="px-4 py-2 bg-indigo-600 text-white rounded"
                    >Set Reward</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History & Leaderboard */}
        <section className="mt-8">
          <h2 className="font-semibold mb-2">📝 Mining History</h2>
          <ul className="space-y-1 max-h-64 overflow-auto">
            {history.map((h,i)=>(
              <li key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div><strong>Miner:</strong> {h.miner}</div>
                <div><strong>Nonce:</strong> {h.nonce}</div>
                <div><strong>Hash:</strong> {h.hash}</div>
                <div><strong>Reward:</strong> {h.reward}</div>
              </li>
            ))}
          </ul>

          <h2 className="font-semibold mt-6 mb-2">🏆 Leaderboard</h2>
          <ul className="space-y-1">
            {Object.entries(leaderboard)
              .sort((a,b)=>b[1]-a[1])
              .slice(0,10)
              .map(([miner,c],i)=>(
                <li key={miner} className="p-2 bg-gray-50 dark:bg-gray-800 rounded flex justify-between">
                  <span>{i+1}. {miner}</span><span>{c}</span>
                </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
