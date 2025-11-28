const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Starting deployment...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString(), "\n");

    // Deploy IdentityRegistry
    console.log("📝 Deploying IdentityRegistry...");
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
    const identityRegistryAddress = await identityRegistry.getAddress();
    console.log("✅ IdentityRegistry deployed to:", identityRegistryAddress, "\n");

    // Deploy PolicyContract
    console.log("📝 Deploying PolicyContract...");
    const PolicyContract = await ethers.getContractFactory("PolicyContract");
    const policyContract = await PolicyContract.deploy(identityRegistryAddress);
    await policyContract.waitForDeployment();
    const policyContractAddress = await policyContract.getAddress();
    console.log("✅ PolicyContract deployed to:", policyContractAddress, "\n");

    // Deploy ClaimContract
    console.log("📝 Deploying ClaimContract...");
    const ClaimContract = await ethers.getContractFactory("ClaimContract");
    const claimContract = await ClaimContract.deploy(policyContractAddress);
    await claimContract.waitForDeployment();
    const claimContractAddress = await claimContract.getAddress();
    console.log("✅ ClaimContract deployed to:", claimContractAddress, "\n");

    // Set ClaimContract in PolicyContract
    console.log("🔗 Linking ClaimContract to PolicyContract...");
    const tx = await policyContract.setClaimContract(claimContractAddress);
    await tx.wait();
    console.log("✅ ClaimContract linked successfully\n");

    // Prepare deployment info
    const network = await ethers.provider.getNetwork();
    const deploymentInfo = {
        network: "localhost",
        chainId: Number(network.chainId),
        contracts: {
            IdentityRegistry: identityRegistryAddress,
            PolicyContract: policyContractAddress,
            ClaimContract: claimContractAddress
        },
        deployer: deployer.address,
        deployedAt: new Date().toISOString()
    };

    // Write deployment info to file
    const deploymentsDir = path.join(__dirname, '../../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, 'deployed.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info written to:", deploymentPath, "\n");

    // Also copy to frontend public directory
    const frontendDeploymentsDir = path.join(__dirname, '../../frontend/public/deployments');
    if (!fs.existsSync(frontendDeploymentsDir)) {
        fs.mkdirSync(frontendDeploymentsDir, { recursive: true });
    }
    const frontendDeploymentPath = path.join(frontendDeploymentsDir, 'deployed.json');
    fs.copyFileSync(deploymentPath, frontendDeploymentPath);
    console.log("📄 Deployment info copied to frontend:", frontendDeploymentPath, "\n");

    console.log("🎉 Deployment complete!\n");
    console.log("Contract Addresses:");
    console.log("  IdentityRegistry:", identityRegistryAddress);
    console.log("  PolicyContract:", policyContractAddress);
    console.log("  ClaimContract:", claimContractAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
