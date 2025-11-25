import { PrismaClient } from '@prisma/client';
import { getContracts } from '../contract-service.js';
import { verifyVcForPolicy } from './vc-utils.js';

const prisma = new PrismaClient();

/**
 * Submit an insurance claim
 * @param {object} params
 * @param {number} params.policyId - On-chain policy ID
 * @param {string} params.patientDid - Patient's DID
 * @param {string} params.patientAddress - Patient's Ethereum address
 * @param {string} params.fileCid - IPFS CID of supporting document
 * @param {string} params.amount - Claim amount (string to avoid precision loss)
 * @param {string} params.providerDid - Provider's DID
 * @param {string} params.providerVcCid - Provider's VC CID for verification
 * @param {string} params.providerVcJwt - Optional: Provider's VC JWT for cryptographic verification
 * @returns {Promise<{claim, claimId, txHash, verification}>}
 */
export async function submitClaim({
    policyId,
    patientDid,
    patientAddress,
    fileCid,
    amount,
    providerDid,
    providerVcCid,
    providerVcJwt
}) {
    try {
        console.log(`📋 Submitting claim for policy: ${policyId}`);

        // Validate and parse policyId
        const parsedPolicyId = parseInt(policyId);
        if (isNaN(parsedPolicyId)) {
            throw new Error(`Invalid policyId: ${policyId}. Must be an integer.`);
        }

        // Step 1: Verify Provider VC
        console.log('🔍 Verifying provider credentials...');
        const verification = await verifyVcForPolicy({
            policyId: parsedPolicyId,
            presentedVcCid: providerVcCid,
            presentedJwt: providerVcJwt,
            providerDid
        });

        if (!verification.verified) {
            console.error('❌ Provider VC verification failed:', verification);
            const error = new Error('Provider credential verification failed');
            error.verification = verification;
            throw error;
        }

        console.log('✅ Provider credentials verified');

        // Get policy and provider from verification result
        const policy = verification.policy;
        const provider = verification.provider;

        // Validate patient is the beneficiary
        if (policy.beneficiaryAddress.toLowerCase() !== patientAddress.toLowerCase()) {
            throw new Error(
                `Patient address ${patientAddress} does not match policy beneficiary ${policy.beneficiaryAddress}`
            );
        }

        // Get contracts
        const { claimContract, signer } = getContracts();

        if (!signer) {
            throw new Error('No signer configured. Cannot submit claim on-chain.');
        }

        // Submit claim on-chain
        console.log('⛓️  Submitting claim on-chain...');
        const tx = await claimContract.submitClaim(
            parsedPolicyId,
            patientAddress,
            provider.providerAddress, // Provider wallet address
            amount,
            fileCid,
            patientDid,
            providerVcCid
        );

        console.log('⏳ Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt.hash);

        // Extract claimId from event
        const claimSubmittedEvent = receipt.logs.find(log => {
            try {
                const parsed = claimContract.interface.parseLog(log);
                return parsed.name === 'ClaimSubmitted';
            } catch {
                return false;
            }
        });

        if (!claimSubmittedEvent) {
            throw new Error('ClaimSubmitted event not found in transaction receipt');
        }

        const parsedEvent = claimContract.interface.parseLog(claimSubmittedEvent);
        const onchainClaimId = Number(parsedEvent.args.claimId);
        console.log('📄 On-chain claim ID:', onchainClaimId);

        // Store in database
        const claim = await prisma.claim.create({
            data: {
                onchainClaimId,
                policyId: policy.id, // Database policy ID, not on-chain ID
                patientDid,
                patientAddress,
                fileCid,
                amount: amount.toString(),
                status: 'Submitted',
                txHash: receipt.hash
            }
        });

        console.log('✅ Claim submitted successfully:', claim.id);

        return {
            claim,
            claimId: onchainClaimId,
            txHash: receipt.hash,
            verification: {
                verified: true,
                method: verification.verification
            }
        };
    } catch (error) {
        console.error('❌ Error submitting claim:', error);

        // Preserve verification info in error
        if (error.verification) {
            error.message = `Claim submission failed: ${error.message}`;
        }

        throw error;
    }
}

/**
 * Update claim status (for insurer actions)
 */
export async function updateClaimStatus(claimId, newStatus) {
    try {
        console.log(`📋 Updating claim ${claimId} status to: ${newStatus}`);

        // Get claim
        const claim = await prisma.claim.findUnique({
            where: { id: claimId }
        });

        if (!claim) {
            throw new Error(`Claim with ID ${claimId} not found`);
        }

        // Update on-chain if claim has on-chain ID
        if (claim.onchainClaimId) {
            const { claimContract } = getContracts();

            // Map status string to enum
            const statusMap = {
                'Submitted': 0,
                'UnderReview': 1,
                'Approved': 2,
                'Rejected': 3,
                'Paid': 4
            };

            const statusEnum = statusMap[newStatus];
            if (statusEnum === undefined) {
                throw new Error(`Invalid status: ${newStatus}`);
            }

            console.log('⛓️  Updating claim status on-chain...');
            const tx = await claimContract.updateClaimStatus(claim.onchainClaimId, statusEnum);
            await tx.wait();
            console.log('✅ On-chain status updated');
        }

        // Update in database
        const updatedClaim = await prisma.claim.update({
            where: { id: claimId },
            data: { status: newStatus }
        });

        console.log('✅ Claim status updated successfully');
        return updatedClaim;
    } catch (error) {
        console.error('❌ Error updating claim status:', error);
        throw error;
    }
}

/**
 * Get claim by ID
 */
export async function getClaimById(id) {
    return await prisma.claim.findUnique({
        where: { id },
        include: { policy: { include: { provider: true } } }
    });
}

/**
 * List all claims
 */
export async function listClaims(filters = {}) {
    const where = {};

    if (filters.policyId) {
        where.policyId = filters.policyId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.patientAddress) {
        where.patientAddress = filters.patientAddress;
    }

    return await prisma.claim.findMany({
        where,
        include: { policy: { include: { provider: true } } },
        orderBy: { createdAt: 'desc' }
    });
}

export default {
    submitClaim,
    updateClaimStatus,
    getClaimById,
    listClaims
};
