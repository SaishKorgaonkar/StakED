import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  // Use Flow EVM testnet RPC & key if provided, otherwise fall back to Sepolia (legacy)
  const providerUrl = process.env.FLOW_EVM_TESTNET_RPC_URL || process.env.SEPOLIA_RPC_URL!;
  const privateKey = process.env.FLOW_EVM_PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY!;
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("🚀 Deploying ExamStakingFixed Contract (Multistaking Bug Fix)");
  console.log("===========================================================");
  console.log("Deployer:", await wallet.getAddress());
  console.log("💰 Balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");

  // Contract addresses for dependencies
  // Use FLOW token address for Flow EVM migration (can be set via FLOW_TOKEN_ADDRESS env var)
  const FLOW_TOKEN_ADDRESS = process.env.FLOW_TOKEN_ADDRESS || "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  const VERIFIER_REGISTRY = "0xb079ca589DAd234cBF3A9Ae8e82E4132c0E20CF7";
  const STUDENT_REGISTRY = "0x0fd1373be62e1E197268aaFd505201db41d102Bd";

  try {
    // Load artifact and create contract factory
    const ExamStakingFixedArtifact = await hre.artifacts.readArtifact("ExamStakingFixed");
    const ExamStakingFixed = new ethers.ContractFactory(
      ExamStakingFixedArtifact.abi,
      ExamStakingFixedArtifact.bytecode,
      wallet
    );
    
    console.log("\n📋 Constructor Parameters:");
  console.log("  FLOW token:", FLOW_TOKEN_ADDRESS);
    console.log("  Verifier Registry:", VERIFIER_REGISTRY);
    console.log("  Student Registry:", STUDENT_REGISTRY);

    console.log("\n⏳ Deploying ExamStakingFixed contract...");
    const examStakingFixed = await ExamStakingFixed.deploy(
      FLOW_TOKEN_ADDRESS,
      VERIFIER_REGISTRY,
      STUDENT_REGISTRY
    );

    console.log("🔗 Deployment transaction:", examStakingFixed.deploymentTransaction()?.hash);
    console.log("⏳ Waiting for deployment confirmation...");

    await examStakingFixed.waitForDeployment();
    
    const contractAddress = await examStakingFixed.getAddress();
    
    console.log("\n✅ ExamStakingFixed Contract Deployed Successfully!");
    console.log("📋 Contract Address:", contractAddress);
    
    console.log("\n🔧 Key Fixes in This Version:");
    console.log("  ✅ Fixed multistaking prize distribution logic");
    console.log("  ✅ Users can claim if they are winners OR have stakes on winners");
    console.log("  ✅ Proper proportional reward calculation for both scenarios");
    console.log("  ✅ Self-staking and multistaking both work correctly");
    
    console.log("\n🚨 IMPORTANT: Update Environment Variables");
    console.log("===========================================");
    console.log("Backend .env:");
    console.log(`EXAM_STAKING_ADDRESS=${contractAddress}`);
    console.log("\nFrontend .env:");
    console.log(`VITE_EXAM_STAKING_ADDRESS=${contractAddress}`);
    
    console.log("\n📝 Contract Verification:");
  console.log(`npx hardhat verify --network flowTestnet ${contractAddress} "${FLOW_TOKEN_ADDRESS}" "${VERIFIER_REGISTRY}" "${STUDENT_REGISTRY}"`);

    console.log("\n🔄 Next Steps:");
    console.log("1. Update backend .env with new contract address");
    console.log("2. Update frontend .env with new contract address");
    console.log("3. Restart both backend and frontend services");
    console.log("4. Test multistaking functionality");

  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
    console.error("Full error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});