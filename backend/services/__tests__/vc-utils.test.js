/**
 * Unit Tests for vc-utils.js
 * 
 * Tests the critical verifyVcForPolicy function with various scenarios:
 * - Policy not found
 * - CID matching
 * - CID mismatch
 * - Provider DID mismatch
 */

import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
    policy: {
        findUnique: jest.fn()
    }
};

// Mock Veramo
const mockVerifyVC = jest.fn();

// Mock the imports
jest.unstable_mockModule('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma)
}));

jest.unstable_mockModule('../veramo-setup.js', () => ({
    verifyVC: mockVerifyVC
}));

// Import the function to test
const { verifyVcForPolicy } = await import('../vc-utils.js');

describe('verifyVcForPolicy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return policy_not_found when policy does not exist', async () => {
        mockPrisma.policy.findUnique.mockResolvedValue(null);

        const result = await verifyVcForPolicy({
            policyId: 999,
            presentedVcCid: 'Qm123',
            providerDid: 'did:ethr:localhost:0x123'
        });

        expect(result.verified).toBe(false);
        expect(result.error).toBe('policy_not_found');
        expect(result.tried).toContain('policy_lookup');
        expect(result.tried).toContain('policy_not_found');
    });

    test('should verify successfully when CID matches', async () => {
        const mockPolicy = {
            id: 1,
            onchainPolicyId: 1,
            providerId: 1,
            provider: {
                id: 1,
                providerDid: 'did:ethr:localhost:0x123',
                vcCid: 'Qm123',
                name: 'Test Provider'
            }
        };

        mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);

        const result = await verifyVcForPolicy({
            policyId: 1,
            presentedVcCid: 'Qm123',
            providerDid: 'did:ethr:localhost:0x123'
        });

        expect(result.verified).toBe(true);
        expect(result.verification.cidMatches).toBe(true);
        expect(result.tried).toContain('policy_found');
        expect(result.tried).toContain('cid_match');
        expect(result.tried).toContain('verification_success');
    });

    test('should return vcCid_mismatch when CIDs do not match', async () => {
        const mockPolicy = {
            id: 1,
            onchainPolicyId: 1,
            provider: {
                id: 1,
                providerDid: 'did:ethr:localhost:0x123',
                vcCid: 'Qm123',
                name: 'Test Provider'
            }
        };

        mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);

        const result = await verifyVcForPolicy({
            policyId: 1,
            presentedVcCid: 'QmDifferent',
            providerDid: 'did:ethr:localhost:0x123'
        });

        expect(result.verified).toBe(false);
        expect(result.error).toBe('vcCid_mismatch');
        expect(result.storedCid).toBe('Qm123');
        expect(result.presentedCid).toBe('QmDifferent');
        expect(result.tried).toContain('cid_check');
        expect(result.tried).toContain('cid_mismatch');
    });

    test('should return provider_did_mismatch when DIDs do not match', async () => {
        const mockPolicy = {
            id: 1,
            onchainPolicyId: 1,
            provider: {
                id: 1,
                providerDid: 'did:ethr:localhost:0x123',
                vcCid: 'Qm123',
                name: 'Test Provider'
            }
        };

        mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);

        const result = await verifyVcForPolicy({
            policyId: 1,
            presentedVcCid: 'Qm123',
            providerDid: 'did:ethr:localhost:0xDifferent'
        });

        expect(result.verified).toBe(false);
        expect(result.error).toBe('provider_did_mismatch');
        expect(result.expectedDid).toBe('did:ethr:localhost:0x123');
        expect(result.presentedDid).toBe('did:ethr:localhost:0xDifferent');
    });

    test('should verify JWT when provided', async () => {
        const mockPolicy = {
            id: 1,
            onchainPolicyId: 1,
            provider: {
                id: 1,
                providerDid: 'did:ethr:localhost:0x123',
                vcCid: 'Qm123',
                name: 'Test Provider'
            }
        };

        mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);

        // Mock successful JWT verification
        mockVerifyVC.mockResolvedValue({
            verified: true
        });

        // Create a fake JWT with matching DID in payload
        const fakeJwt = `header.${Buffer.from(JSON.stringify({
            vc: {
                credentialSubject: {
                    id: 'did:ethr:localhost:0x123'
                }
            }
        })).toString('base64')}.signature`;

        const result = await verifyVcForPolicy({
            policyId: 1,
            presentedJwt: fakeJwt,
            providerDid: 'did:ethr:localhost:0x123'
        });

        expect(result.verified).toBe(true);
        expect(result.verification.jwtMatches).toBe(true);
        expect(result.verification.cryptoVerified).toBe(true);
        expect(result.tried).toContain('jwt_verify');
        expect(result.tried).toContain('jwt_valid');
    });

    test('should return jwt_invalid when JWT verification fails', async () => {
        const mockPolicy = {
            id: 1,
            onchainPolicyId: 1,
            provider: {
                id: 1,
                providerDid: 'did:ethr:localhost:0x123',
                vcCid: 'Qm123',
                name: 'Test Provider'
            }
        };

        mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);

        // Mock failed JWT verification
        mockVerifyVC.mockResolvedValue({
            verified: false,
            error: 'Invalid signature'
        });

        const result = await verifyVcForPolicy({
            policyId: 1,
            presentedJwt: 'invalid.jwt.token',
            providerDid: 'did:ethr:localhost:0x123'
        });

        expect(result.verified).toBe(false);
        expect(result.error).toBe('jwt_invalid');
        expect(result.tried).toContain('jwt_verify');
        expect(result.tried).toContain('jwt_invalid');
    });

    test('should return no_verification_method when neither CID nor JWT provided', async () => {
        const mockPolicy = {
            id: 1,
            onchainPolicyId: 1,
            provider: {
                id: 1,
                providerDid: 'did:ethr:localhost:0x123',
                vcCid: 'Qm123',
                name: 'Test Provider'
            }
        };

        mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);

        const result = await verifyVcForPolicy({
            policyId: 1,
            providerDid: 'did:ethr:localhost:0x123'
            // No presentedVcCid or presentedJwt
        });

        expect(result.verified).toBe(false);
        expect(result.error).toBe('no_verification_method');
        expect(result.tried).toContain('no_verification_method');
    });
});
