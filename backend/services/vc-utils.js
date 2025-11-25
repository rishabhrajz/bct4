import { PrismaClient } from '@prisma/client';
import { verifyVC } from '../veramo-setup.js';

const prisma = new PrismaClient();

/**
 * Verify a Verifiable Credential for a specific policy
 * This is the CRITICAL verification logic for claim submission
 * 
 * @param {object} params
 * @param {number} params.policyId - On-chain policy ID
 * @param {string} params.presentedVcCid - Optional: CID of presented VC
 * @param {string} params.presentedJwt - Optional: JWT of presented VC
 * @param {string} params.providerDid - Provider DID claiming the credential
 * @returns {Promise<{verified: boolean, provider?, policy?, verification?, error?, tried?, storedCid?, details?}>}
 */
export async function verifyVcForPolicy({ policyId, presentedVcCid, presentedJwt, providerDid }) {
    const tried = [];

    try {
        // Step 1: Lookup policy by onchainPolicyId
        tried.push('policy_lookup');

        const policy = await prisma.policy.findUnique({
            where: { onchainPolicyId: parseInt(policyId) },
            include: { provider: true }
        });

        if (!policy) {
            tried.push('policy_not_found');
            return {
                verified: false,
                error: 'policy_not_found',
                tried,
                message: `No policy found with onchainPolicyId: ${policyId}`
            };
        }

        tried.push('policy_found');

        // Instead of using policy's provider, look up the provider by DID
        // This allows any approved provider to submit claims
        let provider = policy.provider;

        if (providerDid) {
            // Look up provider by the presented DID
            const presentedProvider = await prisma.provider.findUnique({
                where: { providerDid: providerDid }
            });

            if (!presentedProvider) {
                tried.push('provider_not_found');
                return {
                    verified: false,
                    error: 'provider_not_found',
                    tried,
                    message: `No provider found with DID: ${providerDid}`
                };
            }

            // Check if provider is approved
            if (presentedProvider.status !== 'APPROVED') {
                tried.push('provider_not_approved');
                return {
                    verified: false,
                    error: 'provider_not_approved',
                    tried,
                    message: `Provider ${providerDid} is not approved (status: ${presentedProvider.status})`
                };
            }

            provider = presentedProvider;
        }

        let cidMatches = false;
        let jwtMatches = false;
        let cryptoVerified = false;

        // Step 2: CID verification
        if (presentedVcCid) {
            tried.push('cid_check');

            if (presentedVcCid === provider.vcCid) {
                cidMatches = true;
                tried.push('cid_match');
            } else {
                tried.push('cid_mismatch');
                return {
                    verified: false,
                    error: 'vcCid_mismatch',
                    storedCid: provider.vcCid,
                    presentedCid: presentedVcCid,
                    tried
                };
            }
        }

        // Step 3: JWT cryptographic verification
        if (presentedJwt) {
            tried.push('jwt_verify');

            try {
                const result = await verifyVC(presentedJwt);

                if (result.verified) {
                    cryptoVerified = true;
                    jwtMatches = true;
                    tried.push('jwt_valid');

                    // Additional check: ensure the credential subject matches the provider
                    const payload = JSON.parse(
                        Buffer.from(presentedJwt.split('.')[1], 'base64').toString()
                    );

                    if (payload.vc?.credentialSubject?.id !== provider.providerDid) {
                        tried.push('jwt_subject_mismatch');
                        return {
                            verified: false,
                            error: 'jwt_subject_mismatch',
                            tried,
                            expectedSubject: provider.providerDid,
                            actualSubject: payload.vc?.credentialSubject?.id
                        };
                    }
                } else {
                    tried.push('jwt_invalid');
                    return {
                        verified: false,
                        error: 'jwt_invalid',
                        details: result.error || 'Cryptographic verification failed',
                        tried
                    };
                }
            } catch (err) {
                tried.push('jwt_verify_error');
                return {
                    verified: false,
                    error: 'jwt_invalid',
                    details: err.message,
                    tried
                };
            }
        }

        // Step 4: Final decision
        if (cidMatches || jwtMatches) {
            tried.push('verification_success');
            return {
                verified: true,
                provider,
                policy,
                verification: {
                    cidMatches,
                    jwtMatches,
                    cryptoVerified
                },
                tried
            };
        }

        // No verification method provided
        tried.push('no_verification_method');
        return {
            verified: false,
            error: 'no_verification_method',
            message: 'Must provide either presentedVcCid or presentedJwt',
            tried
        };

    } catch (error) {
        tried.push('unexpected_error');
        console.error('Error in verifyVcForPolicy:', error);
        return {
            verified: false,
            error: 'unexpected_error',
            details: error.message,
            tried
        };
    }
}

/**
 * Verify multiple VCs (utility for batch verification)
 */
export async function verifyMultipleVcs(verificationRequests) {
    const results = [];

    for (const request of verificationRequests) {
        const result = await verifyVcForPolicy(request);
        results.push({
            request,
            result
        });
    }

    return results;
}

export default {
    verifyVcForPolicy,
    verifyMultipleVcs
};
