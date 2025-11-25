import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ETH_RPC = process.env.ETH_RPC || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

let contracts = null;
let provider = null;
let signer = null;

/**
 * Initialize contract connections
 */
export async function initContracts() {
    try {
        // Read deployment info
        const deploymentPath = path.join(__dirname, '../deployments/deployed.json');

        if (!fs.existsSync(deploymentPath)) {
            throw new Error('Deployment file not found. Please deploy contracts first.');
        }

        const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

        // Create provider
        provider = new ethers.JsonRpcProvider(ETH_RPC);
        console.log('✅ Connected to Ethereum RPC:', ETH_RPC);

        // Create signer if private key is available
        if (PRIVATE_KEY) {
            signer = new ethers.Wallet(PRIVATE_KEY, provider);
            console.log('✅ Backend signer address:', signer.address);
        } else {
            console.log('⚠️  No PRIVATE_KEY configured - running in read-only mode');
        }

        // Load contract ABIs from artifacts
        const identityRegistryArtifact = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json'), 'utf8')
        );
        const policyContractArtifact = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../artifacts/contracts/PolicyContract.sol/PolicyContract.json'), 'utf8')
        );
        const claimContractArtifact = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../artifacts/contracts/ClaimContract.sol/ClaimContract.json'), 'utf8')
        );

        // Create contract instances
        const identityRegistry = new ethers.Contract(
            deploymentInfo.contracts.IdentityRegistry,
            identityRegistryArtifact.abi,
            signer || provider
        );

        const policyContract = new ethers.Contract(
            deploymentInfo.contracts.PolicyContract,
            policyContractArtifact.abi,
            signer || provider
        );

        const claimContract = new ethers.Contract(
            deploymentInfo.contracts.ClaimContract,
            claimContractArtifact.abi,
            signer || provider
        );

        contracts = {
            identityRegistry,
            policyContract,
            claimContract,
            provider,
            signer
        };

        console.log('✅ Contracts initialized:');
        console.log('   IdentityRegistry:', deploymentInfo.contracts.IdentityRegistry);
        console.log('   PolicyContract:', deploymentInfo.contracts.PolicyContract);
        console.log('   ClaimContract:', deploymentInfo.contracts.ClaimContract);

        return contracts;
    } catch (error) {
        console.error('❌ Error initializing contracts:', error.message);
        throw error;
    }
}

/**
 * Get initialized contracts
 */
export function getContracts() {
    if (!contracts) {
        throw new Error('Contracts not initialized. Call initContracts() first.');
    }
    return contracts;
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(txHash) {
    const receipt = await provider.waitForTransaction(txHash);
    return receipt;
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(txHash) {
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt;
}
