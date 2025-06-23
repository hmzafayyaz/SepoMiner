const hre = require("hardhat");

async function main() {
  // 1) Get the deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 2) Compile & grab the factory
  const ProofOfWork = await hre.ethers.getContractFactory("ProofOfWork");

  // 3) Choose your starting difficulty
  const difficulty = 1_000_000;

  // 4) Deploy and WAIT for the tx to be mined
  const pow = await ProofOfWork.deploy(difficulty);
  await pow.waitForDeployment();    // ← important in ethers v6

  // 5) Now grab the address
  const address = await pow.getAddress();
  console.log("✅ ProofOfWork deployed at:", address);

  // 6) Optionally write it to a file or prompt you to update .env
  //    e.g. fs.writeFileSync(".env", `VITE_CONTRACT_ADDRESS=${address}\n`, { flag: "a" });
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
