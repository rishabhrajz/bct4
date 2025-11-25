import { PrismaClient } from '@prisma/client';
import { getOrCreateIssuerDid, createVC } from '../veramo-setup.js';
import { pinJSON } from '../ipfs-pinata.js';
import { getContracts } from '../contract-service.js';

const prisma = new PrismaClient();

/**
 * Issue an insurance policy
 * @param {object} params
 * @param {string} params.beneficiaryAddress - Beneficiary's Ethereum address
 * @param {string} params.beneficiaryDid - Beneficiary's DID (optional)
 * @param {string} params.coverageAmount - Coverage amount in wei (string to avoid precision loss)
 * @param {number} params.startEpoch - Policy start timestamp
 * @param {number} params.endEpoch - Policy end timestamp
 * @param {number} params.providerId - Associated provider ID
 * @returns {Promise<{policy, policyId, txHash}>}
 */
export async function issuePolicy({
    beneficiaryAddress,
    beneficiaryDid,
    coverageAmount,
    startEpoch,
    endEpoch,
    providerId
}) {
    try {
        console.log(`📋 Issuing policy for beneficiary: ${beneficiaryAddress}`);

        // Validate inputs
        if (!beneficiaryAddress || !coverageAmount || !startEpoch || !endEpoch || !providerId) {
            throw new Error('Missing required parameters');
        }

        // Verify provider exists
        const provider = await prisma.provider.findUnique({
            where: { id: providerId }
        });

        if (!provider) {
            throw new Error(`Provider with ID ${providerId} not found`);
        }

        // Get contracts
        const { policyContract, signer } = getContracts();

        if (!signer) {
            throw new Error('No signer configured. Cannot issue policy on-chain.');
        }

        // Call on-chain policy issuance
        console.log('⛓️  Issuing policy on-chain...');
        const tx = await policyContract.issuePolicy(
            beneficiaryAddress,
            coverageAmount,
            startEpoch,
            endEpoch
        );

        console.log('⏳ Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt.hash);

        // Extract policyId from event
        const policyIssuedEvent = receipt.logs.find(log => {
            try {
                const parsed = policyContract.interface.parseLog(log);
                return parsed.name === 'PolicyIssued';
            } catch {
                return false;
            }
        });

        if (!policyIssuedEvent) {
            throw new Error('PolicyIssued event not found in transaction receipt');
        }

        const parsedEvent = policyContract.interface.parseLog(policyIssuedEvent);
        const onchainPolicyId = Number(parsedEvent.args.policyId);
        console.log('📄 On-chain policy ID:', onchainPolicyId);

        // Get issuer DID
        const issuerDid = await getOrCreateIssuerDid();

        // Create Policy Verifiable Credential
        console.log('🎫 Creating Policy VC...');
        const credentialSubject = {
            id: beneficiaryDid || beneficiaryAddress,
            policyId: onchainPolicyId,
            beneficiary: beneficiaryAddress,
            coverageAmount: coverageAmount.toString(),
            startEpoch,
            endEpoch,
            provider: provider.providerDid,
            type: 'InsurancePolicy'
        };

        const vc = await createVC(credentialSubject, issuerDid);
        const vcJwt = vc.proof.jwt;

        // Pin Policy VC to IPFS
        console.log('📎 Pinning Policy VC to IPFS...');
        const vcPinResult = await pinJSON({
            jwt: vcJwt,
            credential: vc
        });
        const policyVcCid = vcPinResult.cid;
        console.log('✅ Policy VC pinned:', policyVcCid);

        // Store in database
        const policy = await prisma.policy.create({
            data: {
                onchainPolicyId,
                policyVcCid,
                issuerDid,
                beneficiaryAddress,
                beneficiaryDid,
                coverageAmount: coverageAmount.toString(),
                startEpoch,
                endEpoch,
                providerId
            }
        });

        console.log('✅ Policy issued successfully:', policy.id);

        return {
            policy,
            policyId: onchainPolicyId,
            policyVcCid,
            txHash: receipt.hash
        };
    } catch (error) {
        console.error('❌ Error issuing policy:', error);
        throw error;
    }
}

/**
 * Get policy by on-chain policy ID
 */
export async function getPolicyByOnchainId(onchainPolicyId) {
    return await prisma.policy.findUnique({
        where: { onchainPolicyId: parseInt(onchainPolicyId) },
        include: { provider: true }
    });
}

/**
 * Get policy by database ID
 */
export async function getPolicyById(id) {
    return await prisma.policy.findUnique({
        where: { id },
        include: { provider: true }
    });
}

/**
 * List all policies
 */
export async function listPolicies() {
    return await prisma.policy.findMany({
        include: { provider: true },
        orderBy: { createdAt: 'desc' }
    });
}

export default {
    issuePolicy,
    getPolicyByOnchainId,
    getPolicyById,
    listPolicies
};
