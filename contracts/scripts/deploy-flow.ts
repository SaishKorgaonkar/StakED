import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Deploying StakED contracts to Flow EVM Testnet...");
  
  // Setup Flow EVM provider and wallet
  const provider = new ethers.JsonRpcProvider(
    process.env.FLOW_EVM_TESTNET_RPC_URL || "https://testnet.evm.nodes.onflow.org"
  );
  const wallet = new ethers.Wallet(process.env.FLOW_EVM_PRIVATE_KEY!, provider);
  
  console.log("Deploying with account:", await wallet.getAddress());
  console.log("Account balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "FLOW");

  // Get contract artifacts
  const StudentRegistryArtifact = await hre.artifacts.readArtifact("StudentRegistry");
  const VerifierRegistryArtifact = await hre.artifacts.readArtifact("VerifierRegistry");
  const ExamStakingArtifact = await hre.artifacts.readArtifact("ExamStaking");

  // Deploy StudentRegistry first
  console.log("\n📚 Deploying StudentRegistry...");
  const StudentRegistryFactory = new ethers.ContractFactory(
    StudentRegistryArtifact.abi,
    StudentRegistryArtifact.bytecode,
    wallet
  );
  const studentRegistry = await StudentRegistryFactory.deploy();
  await studentRegistry.waitForDeployment();
  console.log("StudentRegistry deployed to:", studentRegistry.target);

  // Deploy VerifierRegistry
  console.log("\n🔍 Deploying VerifierRegistry...");
  const VerifierRegistryFactory = new ethers.ContractFactory(
    VerifierRegistryArtifact.abi,
    VerifierRegistryArtifact.bytecode,
    wallet
  );
  const verifierRegistry = await VerifierRegistryFactory.deploy();
  await verifierRegistry.waitForDeployment();
  console.log("VerifierRegistry deployed to:", verifierRegistry.target);

  // Deploy ExamStaking with native FLOW
  console.log("\n🎯 Deploying ExamStaking with native FLOW...");
  const ExamStakingFactory = new ethers.ContractFactory(
    ExamStakingArtifact.abi,
    ExamStakingArtifact.bytecode,
    wallet
  );
  const examStaking = await ExamStakingFactory.deploy(
    verifierRegistry.target,
    studentRegistry.target
  );
  await examStaking.waitForDeployment();
  console.log("ExamStaking deployed to:", examStaking.target);

  // Verification info
  console.log("\n✅ Deployment Summary - Flow EVM Testnet:");
  console.log("=====================================");
  console.log("Network: Flow EVM Testnet (545)");
  console.log("Using: Native FLOW tokens");
  console.log("StudentRegistry:", studentRegistry.target);
  console.log("VerifierRegistry:", verifierRegistry.target);
  console.log("ExamStaking:", examStaking.target);
  console.log("\n🔧 Add these to your .env file:");
  console.log(`STUDENT_REGISTRY_ADDRESS=${studentRegistry.target}`);
  console.log(`VERIFIER_REGISTRY_ADDRESS=${verifierRegistry.target}`);
  console.log(`EXAM_STAKING_ADDRESS=${examStaking.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});