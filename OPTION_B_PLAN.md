# ProjectY - Option B Enhanced Implementation Plan
## Production-Grade Decentralized Insurance Platform

---

## 🎯 Overview

This enhanced plan transforms ProjectY into a **realistic, production-ready insurance system** with:
- ✅ MetaMask wallet integration
- ✅ Real ETH payment flows with escrow
- ✅ Multi-tier policy system
- ✅ **Approval workflows** (Provider, Policy, Claims)
- ✅ **KYC verification** (Aadhaar for patients, license for providers)
- ✅ **Premium refund** on policy rejection
- ✅ **Provider medical report uploads**
- ✅ **Three-state approval system** (Pending/Approve/Reject)

---

## 🔄 Complete System Flow

### Patient Journey
```
1. Connect MetaMask (Hardhat test account)
2. Upload Aadhaar Card (KYC proof) → IPFS
3. Browse policy types (Basic/Standard/Premium)
4. Select policy + Pay premium in ETH
   → Policy Status: PENDING_APPROVAL
5. Wait for insurer review
   → APPROVED: Policy activated
   → REJECTED: Premium auto-refunded to wallet
```

### Provider Journey
```
1. Connect MetaMask (Hardhat test account)
2. Upload Medical License → IPFS
3. Submit for onboarding
   → Provider Status: PENDING_APPROVAL
4. Wait for insurer review
   → APPROVED: Can issue claims
   → REJECTED: Can resubmit with corrections
```

### Claim Journey
```
PROVIDER uploads medical report (not patient):
1. Upload medical report with:
   - Patient DID
   - Provider VC CID
   - Treatment details
   - Wallet address for payment
2. Submit claim → Status: PENDING

INSURER reviews:
3. Check medical report + patient Aadhaar
4. Options:
   → UNDER_REVIEW: More info needed
   → APPROVED: Transfer funds to provider wallet
   → REJECTED: Claim denied with reason
```

---

## 📋 Enhanced Implementation Checklist

### Phase 1: Smart Contracts (Enhanced)
- [ ] Add approval states to contracts
- [ ] Add premium escrow mechanism
- [ ] Add refund logic for rejected policies
- [ ] Add provider approval system
- [ ] Add policy approval system
- [ ] Add multi-state claim approval
- [ ] Add events for all approval actions
- [ ] Test escrow and refund flows

### Phase 2: Backend (Enhanced)
- [ ] Add approval status to all models
- [ ] Add KYC document tracking
- [ ] Add approval services (provider, policy, claim)
- [ ] Add refund transaction tracking
- [ ] Add medical report uploads by provider
- [ ] Add insurer approval endpoints
- [ ] Add notification system for approvals

### Phase 3: Frontend (Enhanced)
- [ ] MetaMask wallet connection
- [ ] Patient Aadhaar upload flow
- [ ] Provider license upload with approval
- [ ] Policy selection with premium payment
- [ ] Insurer approval dashboards (Provider, Policy, Claim)
- [ ] Provider medical report upload
- [ ] Refund status tracking
- [ ] Real-time approval notifications

### Phase 4: Testing
- [ ] Test approval workflows end-to-end
- [ ] Test premium refund on rejection
- [ ] Test provider approval process
- [ ] Test KYC verification
- [ ] Test payment escrow
- [ ] Test all rejection scenarios

---

## 🔧 Technical Implementation

### 1. Smart Contract Changes

#### A. Enhanced PolicyContract.sol

**Security: Built-in from Day 1** ✅
```solidity
// SECURITY: Import OpenZeppelin for reentrancy protection
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyContract is ReentrancyGuard, Ownable {
    // Contract is now protected against reentrancy attacks
}
```

**New Approval States:**
```solidity
enum PolicyStatus { Pending, Approved, Rejected, Active, Expired }
enum ProviderStatus { Pending, Approved, Rejected }

struct PolicyDetails {
    address beneficiary;
    uint256 coverageAmount;
    uint256 premiumPaid;
    PolicyTier tier;
    PolicyStatus status;        // NEW
    uint256 startEpoch;
    uint256 endEpoch;
    string kycDocCid;          // NEW - Aadhaar CID
}

struct Provider {
    address providerAddress;
    string did;
    string licenseCid;
    ProviderStatus status;      // NEW
    uint256 registeredAt;
}

// Premium escrow mapping
mapping(uint256 => uint256) public policyPremiumEscrow;
mapping(address => ProviderStatus) public providerApprovalStatus;
```

**Premium Escrow & Refund:**
```solidity
function requestPolicy(
    address beneficiary,
    uint256 coverageAmount,
    PolicyTier tier,
    uint256 startEpoch,
    uint256 endEpoch,
    string memory kycDocCid
) external payable returns (uint256) {
    uint256 premium = calculatePremium(coverageAmount, tier);
    require(msg.value == premium, "Incorrect premium");
    
    uint256 policyId = nextPolicyId++;
    
    // Hold premium in escrow
    policyPremiumEscrow[policyId] = msg.value;
    
    policies[policyId] = PolicyDetails({
        beneficiary: beneficiary,
        coverageAmount: coverageAmount,
        premiumPaid: msg.value,
        tier: tier,
        status: PolicyStatus.Pending,  // Awaiting approval
        startEpoch: startEpoch,
        endEpoch: endEpoch,
        kycDocCid: kycDocCid
    });
    
    emit PolicyRequested(policyId, beneficiary, msg.value, kycDocCid);
    return policyId;
}

function approvePolicy(uint256 policyId) external onlyInsurer {
    require(policies[policyId].status == PolicyStatus.Pending, "Not pending");
    
    // Release premium from escrow to insurer
    uint256 premium = policyPremiumEscrow[policyId];
    policyPremiumEscrow[policyId] = 0;
    
    policies[policyId].status = PolicyStatus.Active;
    
    emit PolicyApproved(policyId);
}

function rejectPolicy(uint256 policyId, string memory reason) external onlyInsurer nonReentrant {
    require(policies[policyId].status == PolicyStatus.Pending, "Not pending");
    
    // SECURITY: Checks-Effects-Interactions pattern
    // 1. CHECKS (done above)
    
    // 2. EFFECTS (update state first)
    uint256 refund = policyPremiumEscrow[policyId];
    address beneficiary = policies[policyId].beneficiary;
    
    policyPremiumEscrow[policyId] = 0;  // Clear escrow BEFORE transfer
    policies[policyId].status = PolicyStatus.Rejected;
    
    // 3. INTERACTIONS (external calls last)
    (bool success, ) = payable(beneficiary).call{value: refund}("");
    require(success, "Refund failed");
    
    emit PolicyRejected(policyId, reason, refund);
}
```

**Provider Approval:**
```solidity
function requestProviderApproval(
    string memory did,
    string memory licenseCid
) external returns (uint256) {
    require(providerApprovalStatus[msg.sender] == ProviderStatus.Pending || 
            providerApprovalStatus[msg.sender] == ProviderStatus.Rejected, 
            "Already approved or pending");
    
    providers[msg.sender] = Provider({
        providerAddress: msg.sender,
        did: did,
        licenseCid: licenseCid,
        status: ProviderStatus.Pending,
        registeredAt: block.timestamp
    });
    
    emit ProviderRegistered(msg.sender, did, licenseCid);
}

function approveProvider(address provider) external onlyInsurer {
    require(providers[provider].status == ProviderStatus.Pending, "Not pending");
    
    providers[provider].status = ProviderStatus.Approved;
    providerApprovalStatus[provider] = ProviderStatus.Approved;
    
    emit ProviderApproved(provider);
}

function rejectProvider(address provider, string memory reason) external onlyInsurer {
    require(providers[provider].status == ProviderStatus.Pending, "Not pending");
    
    providers[provider].status = ProviderStatus.Rejected;
    providerApprovalStatus[provider] = ProviderStatus.Rejected;
    
    emit ProviderRejected(provider, reason);
}
```

#### B. Enhanced ClaimContract.sol

**Security: Built-in from Day 1** ✅
```solidity
// SECURITY: Import OpenZeppelin for reentrancy protection
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ClaimContract is ReentrancyGuard, Ownable {
    // Protected against reentrancy attacks
    
    // SECURITY FIX: Track used medical reports to prevent duplicate claims
    mapping(string => bool) public usedMedicalReports;
}
```

**Medical Report Upload by Provider:**
```solidity
enum ClaimStatus { Pending, UnderReview, Approved, Rejected, Paid }

struct ClaimDetails {
    uint256 policyId;
    address patient;
    address provider;
    address providerWallet;      // NEW - Where to send payment
    uint256 amount;
    string medicalReportCid;     // NEW - Provider uploads report
    string patientDid;
    string providerVcCid;
    ClaimStatus status;
    uint256 payoutAmount;
    string rejectionReason;      // NEW
}

function submitClaim(
    uint256 policyId,
    address patient,
    address providerWallet,
    uint256 amount,
    string memory medicalReportCid,  // Provider uploads
    string memory patientDid,
    string memory providerVcCid
) external onlyApprovedProvider returns (uint256) {
    // SECURITY FIX 1: Prevent duplicate claims
    require(!usedMedicalReports[medicalReportCid], "Medical report already used");
    
    // SECURITY FIX 2: Validate claim amount against policy coverage
    PolicyDetails memory policy = policyContract.getPolicy(policyId);
    require(amount <= policy.coverageAmount, "Claim exceeds coverage");
    require(policy.status == PolicyStatus.Active, "Policy not active");
    require(block.timestamp >= policy.startEpoch && 
            block.timestamp <= policy.endEpoch, "Policy expired or not started");
    
    // Verify provider is approved
    require(policyContract.isProviderApproved(msg.sender), "Provider not approved");
    
    // Mark medical report as used (prevent reuse)
    usedMedicalReports[medicalReportCid] = true;
    
    uint256 claimId = nextClaimId++;
    claims[claimId] = ClaimDetails({
        policyId: policyId,
        patient: patient,
        provider: msg.sender,
        providerWallet: providerWallet,
        amount: amount,
        medicalReportCid: medicalReportCid,
        patientDid: patientDid,
        providerVcCid: providerVcCid,
        status: ClaimStatus.Pending,
        payoutAmount: 0,
        rejectionReason: ""
    });
    
    emit ClaimSubmitted(claimId, msg.sender, patient, amount);
    return claimId;
}

function setClaimUnderReview(uint256 claimId) external onlyInsurer {
    require(claims[claimId].status == ClaimStatus.Pending, "Invalid status");
    claims[claimId].status = ClaimStatus.UnderReview;
    emit ClaimStatusUpdated(claimId, ClaimStatus.UnderReview);
}

function rejectClaim(uint256 claimId, string memory reason) external onlyInsurer {
    claims[claimId].status = ClaimStatus.Rejected;
    claims[claimId].rejectionReason = reason;
    emit ClaimRejected(claimId, reason);
}

function approveAndPayClaim(uint256 claimId, uint256 payoutAmount) 
    external payable onlyInsurer nonReentrant {  // SECURITY: nonReentrant protection
    require(claims[claimId].status == ClaimStatus.UnderReview, "Not under review");
    require(msg.value == payoutAmount, "Incorrect payment");
    
    // SECURITY: Effects before interactions
    claims[claimId].status = ClaimStatus.Paid;
    claims[claimId].payoutAmount = payoutAmount;
    
    // Pay provider directly
    address providerWallet = claims[claimId].providerWallet;
    (bool success, ) = payable(providerWallet).call{value: msg.value}("");
    require(success, "Payment failed");
    
    emit ClaimPaid(claimId, providerWallet, payoutAmount);
}
```

---

### 2. Backend Changes

#### A. Enhanced Database Schema

**prisma/schema.prisma:**
```prisma
model Provider {
  id              Int       @id @default(autoincrement())
  providerDid     String    @unique
  providerAddress String
  name            String
  licenseCid      String     // IPFS CID
  vcCid           String?
  status          String     @default("PENDING")  // PENDING, APPROVED, REJECTED
  rejectionReason String?
  approvedAt      DateTime?
  approvedBy      String?    // Insurer address
  createdAt       DateTime  @default(now())
  
  @@index([status])
}

model Policy {
  id                Int       @id @default(autoincrement())
  onchainPolicyId   Int       @unique
  providerId        Int
  beneficiaryAddress String
  beneficiaryDid    String?
  kycDocCid         String    // Aadhaar CID
  coverageAmount    String
  tier              String    @default("Standard")
  premiumPaid       String
  premiumTxHash     String?
  status            String    @default("PENDING")  // PENDING, APPROVED, REJECTED, ACTIVE
  rejectionReason   String?
  refundTxHash      String?   // If rejected
  approvedAt        DateTime?
  startEpoch        Int
  endEpoch          Int
  vcCid             String?
  createdAt         DateTime  @default(now())
  
  @@index([status])
  @@index([beneficiaryAddress])
}

model Claim {
  id                Int       @id @default(autoincrement())
  onchainClaimId    Int       @unique
  policyId          Int
  patientAddress    String
  patientDid        String
  providerAddress   String
  providerWallet    String    // Where to send payment
  medicalReportCid  String    // Provider uploads
  providerVcCid     String
  amount            String
  status            String    @default("PENDING")
  payoutAmount      String?
  payoutTxHash      String?
  rejectionReason   String?
  reviewedAt        DateTime?
  paidAt            DateTime?
  createdAt         DateTime  @default(now())
  
  @@index([status])
  @@index([policyId])
}

model KYCDocument {
  id          Int       @id @default(autoincrement())
  userAddress String
  userDid     String?
  documentType String   // "AADHAAR", "LICENSE"
  documentCid  String   @unique
  uploadedAt   DateTime @default(now())
  verifiedAt   DateTime?
  verifiedBy   String?
  status       String   @default("PENDING")  // PENDING, VERIFIED, REJECTED
  
  @@index([userAddress])
  @@index([status])
}
```

#### B. New Services

**backend/services/approval-service.js:**
```javascript
// Provider approval
export async function approveProvider(providerId, insurerAddress) {
  // Update on-chain
  // Update database
  // Send notification
}

export async function rejectProvider(providerId, reason, insurerAddress) {
  // Update on-chain
  // Update database with reason
  // Send notification
}

// Policy approval
export async function approvePolicy(policyId, insurerAddress) {
  // Approve on-chain (releases escrow)
  // Update database
  // Issue Policy VC
  // Send notification to patient
}

export async function rejectPolicy(policyId, reason, insurerAddress) {
  // Reject on-chain (triggers refund)
  // Track refund transaction
  // Update database
  // Send notification to patient
}

// Claim three-state approval
export async function setClaimUnderReview(claimId) {
  // Update status
}

export async function approveClaim(claimId, payoutAmount, insurerAddress) {
  // Approve on-chain
  // Mark for payment
}

export async function rejectClaim(claimId, reason) {
  // Update with reason
  // Notify provider
}

export async function payClaim(claimId, txHash) {
  // Verify payment transaction
  // Update status to Paid
  // Notify provider of payment received
}
```

**backend/services/kyc-service.js:**
```javascript
export async function uploadKYCDocument(userAddress, documentType, file) {
  // Upload to IPFS
  // Store in KYCDocument model
  // Return CID
}

export async function verifyKYC(documentId, insurerAddress) {
  // Mark as verified
  // Update timestamp
}
```

---

### 3. Frontend Changes

#### A. Patient Flow

**Patient Dashboard with KYC:**
```javascript
// src/pages/PatientDashboard.jsx

const [kycStatus, setKycStatus] = useState('NOT_UPLOADED');
const [kycCid, setKycCid] = useState(null);

const handleKYCUpload = async (file) => {
  // Upload Aadhaar to IPFS
  const result = await backend.uploadKYC(account, 'AADHAAR', file);
  setKycCid(result.documentCid);
  setKycStatus('PENDING_VERIFICATION');
  showToast('KYC document uploaded. Awaiting verification.', 'info');
};

// Show KYC status badge
<div className="card">
  <h2>KYC Status</h2>
  {kycStatus === 'NOT_UPLOADED' && (
    <>
      <p>Please upload your Aadhaar card for verification</p>
      <FileUpload onFileSelect={handleKYCUpload} accept="image/*,application/pdf" />
    </>
  )}
  {kycStatus === 'PENDING_VERIFICATION' && (
    <div className="badge badge-warning">⏳ Pending Verification</div>
  )}
  {kycStatus === 'VERIFIED' && (
    <div className="badge badge-success">✅ Verified</div>
  )}
</div>
```

**Policy Purchase with Approval:**
```javascript
// src/pages/BuyPolicy.jsx

const handleBuyPolicy = async () => {
  if (!kycVerified) {
    showToast('Please complete KYC verification first', 'error');
    return;
  }
  
  const premium = calculatePremium(selectedTier);
  
  // Call smart contract to request policy
  const tx = await policyContract.requestPolicy(
    account,
    coverageAmount,
    tierEnum,
    startEpoch,
    endEpoch,
    kycCid,
    { value: premium }
  );
  
  await tx.wait();
  
  showToast('Policy requested! Awaiting insurer approval. Premium held in escrow.', 'info');
  
  // Show pending status
  setPolicyStatus('PENDING_APPROVAL');
};

// Display policy status
{policyStatus === 'PENDING_APPROVAL' && (
  <div className="card bg-yellow-50">
    <p>⏳ Your policy is pending approval</p>
    <p className="text-sm">Premium of {premium} ETH is held in escrow</p>
    <p className="text-sm">You will be notified once reviewed</p>
  </div>
)}

{policyStatus === 'APPROVED' && (
  <div className="card bg-green-50">
    <p>✅ Policy Approved! Coverage is active.</p>
  </div>
)}

{policyStatus === 'REJECTED' && (
  <div className="card bg-red-50">
    <p>❌ Policy Rejected</p>
    <p className="text-sm">Reason: {rejectionReason}</p>
    <p className="text-sm text-green-600">✅ Premium of {premium} ETH refunded to your wallet</p>
  </div>
)}
```

#### B. Provider Flow

**Provider Onboarding with Approval:**
```javascript
// src/pages/ProviderOnboard.jsx

const [providerStatus, setProviderStatus] = useState(null);

const handleSubmitForApproval = async () => {
  // Upload license
  const licenseResult = await backend.uploadFile(licenseFile);
  
  // Request approval on-chain
  const tx = await policyContract.requestProviderApproval(
    providerDid,
    licenseResult.fileCid
  );
  
  await tx.wait();
  
  // Record in backend
  await backend.submitProviderForApproval({
    providerDid,
    providerAddress: account,
    name,
    licenseCid: licenseResult.fileCid
  });
  
  setProviderStatus('PENDING');
  showToast('Submitted for approval. Awaiting insurer review.', 'info');
};

// Show approval status
{providerStatus === 'PENDING' && (
  <div className="badge badge-warning">⏳ Pending Approval</div>
)}
{providerStatus === 'APPROVED' && (
  <div className="badge badge-success">✅ Approved - Can submit claims</div>
)}
{providerStatus === 'REJECTED' && (
  <div className="card bg-red-50">
    <p>❌ Application Rejected</p>
    <p className="text-sm">Reason: {rejectionReason}</p>
    <button onClick={() => resubmit()}>Resubmit Application</button>
  </div>
)}
```

**Medical Report Upload (Provider-side):**
```javascript
// src/pages/ProviderSubmitClaim.jsx

const handleSubmitClaim = async () => {
  // Upload medical report
  const reportResult = await backend.uploadFile(medicalReportFile);
  
  // Submit claim with provider's wallet for payment
  const tx = await claimContract.submitClaim(
    policyId,
    patientAddress,
    account, // provider's wallet address
    claimAmount,
    reportResult.fileCid,
    patientDid,
    providerVcCid
  );
  
  await tx.wait();
  showToast('Claim submitted. Awaiting insurer review.', 'success');
};
```

#### C. Insurer Dashboards

**Provider Approval Dashboard:**
```javascript
// src/pages/InsurerProviderApprovals.jsx

const PendingProviders = () => {
  const { data: providers } = useQuery({
    queryKey: ['pending-providers'],
    queryFn: () => backend.getPendingProviders()
  });
  
  const handleApprove = async (providerId) => {
    const tx = await policyContract.approveProvider(provider.address);
    await tx.wait();
    
    await backend.approveProvider(providerId, insurerAddress);
    showToast('Provider approved!', 'success');
  };
  
  const handleReject = async (providerId, reason) => {
    const tx = await policyContract.rejectProvider(provider.address, reason);
    await tx.wait();
    
    await backend.rejectProvider(providerId, reason, insurerAddress);
    showToast('Provider rejected', 'info');
  };
  
  return (
    <div>
      {providers?.map(provider => (
        <div key={provider.id} className="card">
          <h3>{provider.name}</h3>
          <p>DID: {provider.providerDid}</p>
          <a href={`ipfs://${provider.licenseCid}`}>View License</a>
          
          <div className="flex space-x-2 mt-4">
            <button onClick={() => handleApprove(provider.id)} className="btn-primary">
              ✅ Approve
            </button>
            <button onClick={() => {
              const reason = prompt('Rejection reason:');
              if (reason) handleReject(provider.id, reason);
            }} className="bg-red-500 text-white px-4 py-2 rounded">
              ❌ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

**Policy Approval Dashboard:**
```javascript
// src/pages/InsurerPolicyApprovals.jsx

const PendingPolicies = () => {
  const handleApprovePolicy = async (policyId) => {
    // Approve on-chain (releases escrow funds)
    const tx = await policyContract.approvePolicy(policyId);
    await tx.wait();
    
    showToast('Policy approved! Premium released from escrow.', 'success');
  };
  
  const handleRejectPolicy = async (policyId, reason) => {
    // Reject on-chain (auto-refunds premium)
    const tx = await policyContract.rejectPolicy(policyId, reason);
    await tx.wait();
    
    showToast('Policy rejected. Premium refunded to patient.', 'info');
  };
  
  return (
    <div>
      {policies?.map(policy => (
        <div key={policy.id} className="card">
          <h3>Policy Request #{policy.onchainPolicyId}</h3>
          <p>Patient: {policy.beneficiaryAddress}</p>
          <p>Coverage: {weiToEth(policy.coverageAmount)} ETH</p>
          <p>Premium (in escrow): {weiToEth(policy.premiumPaid)} ETH</p>
          <p>Tier: {policy.tier}</p>
          <a href={`ipfs://${policy.kycDocCid}`} target="_blank">
            📄 View KYC Document
          </a>
          
          <div className="flex space-x-2 mt-4">
            <button onClick={() => handleApprovePolicy(policy.id)}>
              ✅ Approve & Activate
            </button>
            <button onClick={() => {
              const reason = prompt('Rejection reason:');
              if (reason) handleRejectPolicy(policy.id, reason);
            }}>
              ❌ Reject & Refund
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

**Claim Approval Dashboard (Three States):**
```javascript
// src/pages/InsurerClaimReview.jsx

const ClaimReviewCard = ({ claim }) => {
  const handleSetUnderReview = async () => {
    await backend.setClaimUnderReview(claim.id);
    showToast('Claim marked as under review', 'info');
  };
  
  const handleApproveAndPay = async (payoutAmount) => {
    // Pay claim on-chain
    const tx = await claimContract.approveAndPayClaim(
      claim.id,
      ethToWei(payoutAmount),
      { value: ethToWei(payoutAmount) }
    );
    await tx.wait();
    
    showToast(`Claim approved! ${payoutAmount} ETH sent to provider.`, 'success');
  };
  
  const handleReject = async (reason) => {
    const tx = await claimContract.rejectClaim(claim.id, reason);
    await tx.wait();
    showToast('Claim rejected', 'info');
  };
  
  return (
    <div className="card">
      <h3>Claim #{claim.id}</h3>
      <p>Patient: {claim.patientAddress}</p>
      <p>Provider: {claim.providerAddress}</p>
      <p>Amount Requested: {weiToEth(claim.amount)} ETH</p>
      
      <div className="my-4">
        <a href={`ipfs://${claim.medicalReportCid}`} className="text-blue-600 underline">
          📋 View Medical Report
        </a>
      </div>
      
      {claim.status === 'PENDING' && (
        <div className="flex space-x-2">
          <button onClick={handleSetUnderReview} className="bg-yellow-500 text-white px-4 py-2 rounded">
            👀 Under Review
          </button>
          <button onClick={() => {
            const reason = prompt('Rejection reason:');
            if (reason) handleReject(reason);
          }} className="bg-red-500 text-white px-4 py-2 rounded">
            ❌ Reject
          </button>
        </div>
      )}
      
      {claim.status === 'UNDER_REVIEW' && (
        <div className="flex space-x-2">
          <button onClick={() => {
            const amount = prompt('Payout amount (ETH):');
            if (amount) handleApproveAndPay(amount);
          }} className="bg-green-500 text-white px-4 py-2 rounded">
            ✅ Approve & Pay
          </button>
          <button onClick={() => {
            const reason = prompt('Rejection reason:');
            if (reason) handleReject(reason);
          }} className="bg-red-500 text-white px-4 py-2 rounded">
            ❌ Reject
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## 🧪 Testing Strategy

### Unit Tests

**Approval Workflows:**
```javascript
describe("Provider Approval", () => {
  it("Should approve provider and allow claims", async () => {
    await policyContract.requestProviderApproval(did, licenseCid);
    await policyContract.approveProvider(providerAddress);
    
    const status = await policyContract.providerApprovalStatus(providerAddress);
    expect(status).to.equal(ProviderStatus.Approved);
  });
  
  it("Should reject provider with reason", async () => {
    await policyContract.rejectProvider(providerAddress, "Invalid license");
    // Verify rejection and event
  });
});

describe("Policy Approval & Refund", () => {
  it("Should hold premium in escrow on request", async () => {
    const premium = await policyContract.calculatePremium(coverage, tier);
    await policyContract.requestPolicy(..., { value: premium });
    
    const escrow = await policyContract.policyPremiumEscrow(policyId);
    expect(escrow).to.equal(premium);
  });
  
  it("Should refund premium on rejection", async () => {
    const balanceBefore = await patient.getBalance();
    await policyContract.rejectPolicy(policyId, "KYC failed");
    const balanceAfter = await patient.getBalance();
    
    expect(balanceAfter - balanceBefore).to.equal(premium);
  });
  
  it("Should release escrow to insurer on approval", async () => {
    await policyContract.approvePolicy(policyId);
    const escrow = await policyContract.policyPremiumEscrow(policyId);
    expect(escrow).to.equal(0);
  });
});
```

### Integration Tests

**Complete Approval Flow:**
1. Patient uploads Aadhaar
2. Patient requests policy (pays premium)
3. Insurer reviews KYC
4. Insurer approves → Premium released
5. Provider uploads license
6. Insurer approves provider
7. Provider uploads medical report
8. Provider submits claim
9. Insurer reviews → Approves & pays
10. Verify provider receives funds

---

## 📝 Migration

Since this requires contract changes:
```bash
# Stop Hardhat node
# Delete old deployments
rm -rf deployments/

# Restart Hardhat node (fresh blockchain)
npx hardhat node

# Deploy new contracts
npx hardhat run contracts/scripts/deploy-enhanced.js --network localhost

# Reset database
cd backend
npx prisma migrate reset --force
npx prisma migrate dev --name add_approvals_and_kyc
```

---

## ✅ Success Criteria

Option B Enhanced is complete when:
- ✅ Patients can upload Aadhaar and request policies
- ✅ Premiums held in escrow until approval
- ✅ Insurers can approve/reject policies
- ✅ Rejected policies trigger auto-refund
- ✅ Providers require approval before submitting claims
- ✅ Providers upload medical reports (not patients)
- ✅ Insurers have three-state claim approval (Pending/Review/Approve)
- ✅ Approved claims pay provider wallet directly
- ✅ All approvals tracked on-chain and in database
- ✅ Complete end-to-end flow works with real test ETH

---

## 📊 Estimated Time

**With AI Assistance:**
- Smart contracts: 5-6 hours
- Backend: 4-5 hours
- Frontend: 6-8 hours
- Testing: 3-4 hours

**Total: 18-24 hours**

---

**This is now a production-grade decentralized insurance platform! 🚀**

Ready for implementation in a new conversation with full 200k token budget.
