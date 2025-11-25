import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import PolicyContractArtifact from '../config/PolicyContract.json';
import ClaimContractArtifact from '../config/ClaimContract.json';
import IdentityRegistryArtifact from '../config/IdentityRegistry.json';

/**
 * Get contract instances with signer from MetaMask
 */
export function getContracts(signer) {
    if (!signer) {
        throw new Error('Signer required. Please connect MetaMask wallet.');
    }

    const policyContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PolicyContract,
        PolicyContractArtifact.abi,
        signer
    );

    const claimContract = new ethers.Contract(
        CONTRACT_ADDRESSES.ClaimContract,
        ClaimContractArtifact.abi,
        signer
    );

    const identityRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.IdentityRegistry,
        IdentityRegistryArtifact.abi,
        signer
    );

    return {
        policyContract,
        claimContract,
        identityRegistry,
    };
}

/**
 * Get provider and signer from MetaMask
 */
export async function getProviderAndSigner() {
    if (!window.ethereum) {
        throw new Error('MetaMask not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return { provider, signer };
}

/**
 * Helper to format ETH amounts
 */
export function formatEth(weiAmount) {
    return ethers.formatEther(weiAmount);
}

/**
 * Helper to parse ETH amounts
 */
export function parseEth(ethAmount) {
    return ethers.parseEther(ethAmount.toString());
}

/**
 * Wait for transaction and return receipt
 */
export async function waitForTransaction(tx) {
    const receipt = await tx.wait();
    return receipt;
}

/**
 * Get gas estimate for a transaction
 */
export async function estimateGas(contractMethod, ...args) {
    try {
        const gasEstimate = await contractMethod.estimateGas(...args);
        return gasEstimate;
    } catch (error) {
        console.error('Gas estimation failed:', error);
        throw error;
    }
}
