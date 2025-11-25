import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * KYC Service
 * Handles KYC document uploads and verification
 */

async function uploadKYCDocument(userAddress, documentType, documentCid, userDid = null) {
    try {
        const kycDoc = await prisma.kYCDocument.create({
            data: {
                userAddress,
                userDid,
                documentType,
                documentCid,
                status: 'PENDING'
            }
        });

        console.log(`📄 KYC document uploaded for ${userAddress}: ${documentType} (${documentCid})`);
        return kycDoc;
    } catch (error) {
        console.error('Error uploading KYC document:', error);
        throw error;
    }
}

async function verifyKYC(documentId, verifierAddress) {
    try {
        const kycDoc = await prisma.kYCDocument.update({
            where: { id: documentId },
            data: {
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedBy: verifierAddress
            }
        });

        console.log(`✅ KYC document #${documentId} verified by ${verifierAddress}`);
        return kycDoc;
    } catch (error) {
        console.error('Error verifying KYC:', error);
        throw error;
    }
}

async function rejectKYC(documentId, reason, verifierAddress) {
    try {
        const kycDoc = await prisma.kYCDocument.update({
            where: { id: documentId },
            data: {
                status: 'REJECTED',
                rejectionReason: reason,
                verifiedBy: verifierAddress
            }
        });

        console.log(`❌ KYC document #${documentId} rejected: ${reason}`);
        return kycDoc;
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        throw error;
    }
}

async function getKYCByAddress(userAddress) {
    try {
        return await prisma.kYCDocument.findMany({
            where: { userAddress },
            orderBy: { uploadedAt: 'desc' }
        });
    } catch (error) {
        console.error('Error fetching KYC documents:', error);
        throw error;
    }
}

async function getKYCByCid(cid) {
    try {
        return await prisma.kYCDocument.findUnique({
            where: { documentCid: cid }
        });
    } catch (error) {
        console.error('Error fetching KYC by CID:', error);
        throw error;
    }
}

async function getPendingKYC() {
    try {
        return await prisma.kYCDocument.findMany({
            where: { status: 'PENDING' },
            orderBy: { uploadedAt: 'desc' }
        });
    } catch (error) {
        console.error('Error fetching pending KYC documents:', error);
        throw error;
    }
}

async function isKYCVerified(userAddress) {
    try {
        const verifiedDoc = await prisma.kYCDocument.findFirst({
            where: {
                userAddress,
                status: 'VERIFIED'
            }
        });

        return verifiedDoc !== null;
    } catch (error) {
        console.error('Error checking KYC verification:', error);
        throw error;
    }
}

export {
    uploadKYCDocument,
    verifyKYC,
    rejectKYC,
    getKYCByAddress,
    getKYCByCid,
    getPendingKYC,
    isKYCVerified
};
