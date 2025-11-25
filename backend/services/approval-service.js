import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Approval Service
 * Handles approval workflows for providers, policies, and claims
 */

// ==================== PROVIDER APPROVALS ====================

async function approveProvider(providerId, insurerAddress) {
  try {
    const provider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: insurerAddress
      }
    });

    console.log(`✅ Provider ${provider.providerDid} approved in database by ${insurerAddress}`);

    // Also approve provider on-chain so they can submit claims
    try {
      const { policyContract, signer } = getContracts();
      if (signer) {
        console.log(`⛓️  Approving provider ${provider.providerAddress} on-chain...`);
        const tx = await policyContract.approveProvider(provider.providerAddress);
        await tx.wait();
        console.log(`✅ Provider approved on-chain: ${tx.hash}`);
      }
    } catch (onchainError) {
      console.error('⚠️  Failed to approve provider on-chain (but database updated):', onchainError.message);
      // Don't throw - database approval succeeded even if on-chain failed
    }

    return provider;
  } catch (error) {
    console.error('Error approving provider:', error);
    throw error;
  }
}

async function rejectProvider(providerId, reason, insurerAddress) {
  try {
    const provider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvedBy: insurerAddress
      }
    });

    console.log(`❌ Provider ${provider.providerDid} rejected: ${reason}`);
    return provider;
  } catch (error) {
    console.error('Error rejecting provider:', error);
    throw error;
  }
}

async function getPendingProviders() {
  try {
    return await prisma.provider.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching pending providers:', error);
    throw error;
  }
}

// ==================== POLICY APPROVALS ====================

async function approvePolicy(policyId, insurerAddress) {
  try {
    const policy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        status: 'ACTIVE',
        approvedAt: new Date()
      }
    });

    console.log(`✅ Policy #${policy.onchainPolicyId} approved and activated`);
    return policy;
  } catch (error) {
    console.error('Error approving policy:', error);
    throw error;
  }
}

async function rejectPolicy(policyId, reason, insurerAddress, refundTxHash) {
  try {
    const policy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        refundTxHash: refundTxHash
      }
    });

    console.log(`❌ Policy #${policy.onchainPolicyId} rejected: ${reason}`);
    console.log(`💰 Refund transaction: ${refundTxHash}`);
    return policy;
  } catch (error) {
    console.error('Error rejecting policy:', error);
    throw error;
  }
}

async function getPendingPolicies() {
  try {
    return await prisma.policy.findMany({
      where: { status: 'PENDING' },
      include: {
        provider: true
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching pending policies:', error);
    throw error;
  }
}

// ==================== CLAIM APPROVALS ====================

async function setClaimUnderReview(claimId) {
  try {
    const claim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'UNDER_REVIEW',
        reviewedAt: new Date()
      }
    });

    console.log(`🔍 Claim #${claim.onchainClaimId} set to under review`);
    return claim;
  } catch (error) {
    console.error('Error setting claim under review:', error);
    throw error;
  }
}

async function approveClaim(claimId, payoutAmount) {
  try {
    const claim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'APPROVED',
        payoutAmount: payoutAmount.toString(),
        reviewedAt: new Date()
      }
    });

    console.log(`✅ Claim #${claim.onchainClaimId} approved for payout: ${payoutAmount}`);
    return claim;
  } catch (error) {
    console.error('Error approving claim:', error);
    throw error;
  }
}

async function rejectClaim(claimId, reason) {
  try {
    const claim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date()
      }
    });

    console.log(`❌ Claim #${claim.onchainClaimId} rejected: ${reason}`);
    return claim;
  } catch (error) {
    console.error('Error rejecting claim:', error);
    throw error;
  }
}

async function markClaimPaid(claimId, txHash) {
  try {
    const claim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'PAID',
        payoutTxHash: txHash,
        paidAt: new Date()
      }
    });

    console.log(`💰 Claim #${claim.onchainClaimId} payment confirmed: ${txHash}`);
    return claim;
  } catch (error) {
    console.error('Error marking claim as paid:', error);
    throw error;
  }
}

async function getPendingClaims() {
  try {
    return await prisma.claim.findMany({
      where: { status: 'PENDING' },
      include: {
        policy: {
          include: {
            provider: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching pending claims:', error);
    throw error;
  }
}

async function getUnderReviewClaims() {
  try {
    return await prisma.claim.findMany({
      where: { status: 'UNDER_REVIEW' },
      include: {
        policy: {
          include: {
            provider: true
          }
        }
      },
      orderBy: { reviewedAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching under review claims:', error);
    throw error;
  }
}

export {
  // Provider
  approveProvider,
  rejectProvider,
  getPendingProviders,

  // Policy
  approvePolicy,
  rejectPolicy,
  getPendingPolicies,

  // Claim
  setClaimUnderReview,
  approveClaim,
  rejectClaim,
  markClaimPaid,
  getPendingClaims,
  getUnderReviewClaims
};
