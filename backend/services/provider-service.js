import { PrismaClient } from '@prisma/client';
import { getOrCreateIssuerDid, createVC } from '../veramo-setup.js';
import { pinFile, pinJSON } from '../ipfs-pinata.js';

const prisma = new PrismaClient();

/**
 * Onboard a new healthcare provider
 * @param {object} params
 * @param {string} params.providerDid - Provider's DID
 * @param {string} params.providerAddress - Provider's Ethereum address
 * @param {string} params.name - Provider's name
 * @param {Buffer} params.licenseFile - Optional license file buffer
 * @param {string} params.licenseFilename - Optional license filename
 * @returns {Promise<Provider>}
 */
export async function onboardProvider({ providerDid, providerAddress, name, licenseFile, licenseFilename }) {
    try {
        console.log(`📋 Onboarding provider: ${name} (${providerDid})`);

        // Check if provider already exists
        const existing = await prisma.provider.findUnique({
            where: { providerDid }
        });

        if (existing) {
            throw new Error(`Provider with DID ${providerDid} already exists`);
        }

        let licenseCid = null;
        let licenseUrl = null;

        // Pin license file to IPFS if provided
        if (licenseFile) {
            console.log('📎 Pinning license file to IPFS...');
            const result = await pinFile(licenseFile, licenseFilename || 'license.jpg');
            licenseCid = result.cid;
            licenseUrl = result.gatewayUrl;
            console.log('✅ License pinned:', licenseCid);
        }

        // Get or create issuer DID
        const issuerDid = await getOrCreateIssuerDid();

        // Create Provider Verifiable Credential
        console.log('🎫 Creating Provider VC...');
        const credentialSubject = {
            id: providerDid,
            name,
            address: providerAddress,
            licenseCid,
            type: 'HealthcareProvider'
        };

        const vc = await createVC(credentialSubject, issuerDid);
        const vcJwt = vc.proof.jwt;

        // Pin VC to IPFS
        console.log('📎 Pinning VC to IPFS...');
        const vcPinResult = await pinJSON({
            jwt: vcJwt,
            credential: vc
        });
        const vcCid = vcPinResult.cid;
        console.log('✅ VC pinned:', vcCid);

        // Store in database
        const provider = await prisma.provider.create({
            data: {
                providerDid,
                providerAddress,
                name,
                licenseCid,
                licenseUrl,
                vcCid,
                jwt: vcJwt,
                issuerDid,
                issuedAt: new Date()
            }
        });

        console.log('✅ Provider onboarded successfully:', provider.id);

        return provider;
    } catch (error) {
        console.error('❌ Error onboarding provider:', error);
        throw error;
    }
}

/**
 * Get provider by DID
 */
export async function getProviderByDid(providerDid) {
    return await prisma.provider.findUnique({
        where: { providerDid }
    });
}

/**
 * Get provider by ID
 */
export async function getProviderById(id) {
    return await prisma.provider.findUnique({
        where: { id }
    });
}

/**
 * List all providers
 */
export async function listProviders() {
    return await prisma.provider.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

export default {
    onboardProvider,
    getProviderByDid,
    getProviderById,
    listProviders
};
