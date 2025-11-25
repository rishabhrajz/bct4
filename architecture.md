# ProjectY Architecture

## System Overview

ProjectY is a decentralized healthcare insurance system that combines:
- **Decentralized Identifiers (DIDs)** for identity
- **Verifiable Credentials (VCs)** for trustless claims
- **Ethereum smart contracts** for policy and claim lifecycle
- **IPFS** for decentralized document storage

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Provider │ │  Policy  │ │  Upload  │ │  Dashboard   │   │
│  │ Onboard  │ │  Issue   │ │  Docs    │ │  (Insurer)   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        └────────────┴────────────┴───────────────┘
                         HTTP/REST
                             │
┌────────────────────────────┼────────────────────────────────┐
│                   Backend (Node/Express)                     │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │                  Controllers                        │     │
│  │  • ProviderController  • PolicyController          │     │
│  │  • ClaimController     • DebugController           │     │
│  └────┬────────────────────┬────────────┬─────────────┘     │
│       │                    │            │                    │
│  ┌────▼────────┐  ┌────────▼────┐  ┌───▼──────────┐        │
│  │  Provider   │  │   Policy    │  │    Claim     │        │
│  │  Service    │  │   Service   │  │   Service    │        │
│  └────┬────────┘  └────┬────────┘  └───┬──────────┘        │
│       │                │               │                     │
│       │          ┌─────▼───────────────▼─────┐              │
│       │          │      VC Utils              │              │
│       │          │  verifyVcForPolicy()       │              │
│       │          └────────────────────────────┘              │
│       │                                                       │
│  ┌────▼──────────────────────────────────────────────┐      │
│  │              Core Services                         │      │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │      │
│  │  │  Veramo  │ │  Pinata  │ │     Contract     │  │      │
│  │  │  Setup   │ │   IPFS   │ │     Service      │  │      │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────────────┘  │      │
│  │       │            │            │                 │      │
│  └───────┼────────────┼────────────┼─────────────────┘      │
│          │            │            │                         │
│  ┌───────▼────────────▼────────────┼─────────────────┐      │
│  │         Prisma ORM (SQLite)     │                 │      │
│  │  ┌──────────┐ ┌────────┐ ┌───────────┐           │      │
│  │  │ Provider │ │ Policy │ │   Claim   │           │      │
│  │  │  Table   │ │  Table │ │   Table   │           │      │
│  │  └──────────┘ └────────┘ └───────────┘           │      │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────┬─────────────┬───────────────────────────┘
                   │             │
        ┌──────────▼─────┐  ┌────▼───────────────┐
        │  File Storage  │  │  Ethereum Network  │
        │  (Persistent   │  │  (Hardhat Local)   │
        │  Keystore)     │  │                    │
        └────────────────┘  └────┬───────────────┘
                                 │
        ┌────────────────────────┼───────────────────────┐
        │            Smart Contracts                     │
        │  ┌──────────────┐ ┌──────────┐ ┌───────────┐ │
        │  │  Identity    │ │  Policy  │ │   Claim   │ │
        │  │  Registry    │ │ Contract │ │ Contract  │ │
        │  └──────────────┘ └──────────┘ └───────────┘ │
        └────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────▼───────────────────────┐
        │                 Pinata IPFS                    │
        │  • Provider Licenses  • Provider VCs           │
        │  • Policy VCs         • Patient Documents      │
        └─────────────────────────────────────────────────┘
```

## On-Chain vs Off-Chain Data

### On-Chain (Ethereum Smart Contracts)

**Stored on blockchain for immutability and transparency:**

1. **Identity Registry**
   - DID → Address mappings
   - Registration events

2. **PolicyContract**
   - Policy ID (auto-increment)
   - Beneficiary address
   - Coverage amount (wei)
   - Start/end timestamps
   - Active/revoked status

3. **ClaimContract**
   - Claim ID (auto-increment)
   - Policy ID reference
   - Patient address
   - Claim amount
   - Document CID reference
   - Status (Submitted, UnderReview, Approved, Rejected, Paid)

**Why on-chain?**
- ✅ Immutable audit trail
- ✅ Transparent policy terms
- ✅ Trustless status transitions
- ✅ Verifiable by all parties

### Off-Chain (IPFS + Database)

**Large data stored on IPFS (Pinata):**

1. **Provider Licenses** (Images/PDFs)
   - Medical licenses, certifications
   - Too large for blockchain

2. **Verifiable Credentials** (JSON)
   - Provider VCs (with cryptographic proofs)
   - Policy VCs
   - JWT-signed credentials

3. **Patient Documents** (Images/PDFs)
   - Medical reports, prescriptions
   - Supporting evidence for claims

**Why IPFS?**
- ✅ Decentralized storage
- ✅ Content-addressed (CID-based)
- ✅ Cost-effective for large files
- ✅ Persistent via Pinata pinning

**Database (SQLite via Prisma):**

Stores **metadata and mappings**:

1. **Provider** table
   - Maps `providerDid` → `vcCid`
   - Links provider to their VC
   - Stores issuer information

2. **Policy** table
   - **Critical mapping**: `onchainPolicyId` → `providerId`
   - Enables fast claim verification
   - Unique constraint on `onchainPolicyId`

3. **Claim** table
   - Links claims to policies (DB foreign key)
   - Stores status for quick queries

**Why Database?**
- ✅ Fast lookups for verification
- ✅ Relational integrity (policy → provider)
- ✅ Query optimization for dashboards
- ✅ Not everything needs blockchain immutability

## Veramo and Persistent Keys

### Design Choice: kms-local with File Storage

**Problem**: How to manage issuer keys for VC issuance?

**Options Considered**:
1. ❌ **Google KMS**: Centralized, requires external service
2. ❌ **In-memory keys**: Lost on restart, not reproducible
3. ✅ **File-based kms-local**: Persistent, decentralized, migratable

### Implementation

```javascript
// veramo-setup.js
const keyStorePath = './veramo_keystore/keys.json';

class FileKeyStore {
  // Persists keys to disk as JSON
  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

const kms = new KeyManagementSystem({
  store: fileKeyStore,
  secretBox: new SecretBox(KMS_SECRET_KEY)
});
```

**Benefits**:
- Keys survive server restarts
- Same issuer DID across deployments
- Can be backed up and migrated
- No dependency on external KMS
- Easy to upgrade to hardware KMS later

### Issuer DID Management

```javascript
// backend/services/veramo-setup.js
async function getOrCreateIssuerDid() {
  // Check database for existing issuer
  const existing = await prisma.veramoIssuer.findUnique({
    where: { alias: 'projecty-issuer' }
  });
  
  if (existing) return existing.did;
  
  // Create new issuer and persist
  const identifier = await veramoAgent.didManagerCreate({
    provider: 'did:ethr:localhost',
    kms: 'local'
  });
  
  await prisma.veramoIssuer.create({
    data: { alias: 'projecty-issuer', did: identifier.did }
  });
  
  return identifier.did;
}
```

## Critical Verification Flow

### Claim Submission with Provider VC Verification

```
┌─────────┐                                          ┌─────────┐
│ Patient │                                          │ Backend │
└────┬────┘                                          └────┬────┘
     │  POST /claim/submit                                │
     │  {                                                 │
     │    policyId: 1,                                   │
     │    providerVcCid: "Qm...",                        │
     │    amount: "500000000000000000"                   │
     │  }                                                 │
     ├────────────────────────────────────────────────────>
     │                                                    │
     │                           ┌────────────────────────┼──┐
     │                           │ verifyVcForPolicy()    │  │
     │                           │                        │  │
     │                           │ 1. Query DB:           │  │
     │                           │    Policy(onchainId=1) │  │
     │                           │    Include provider    │  │
     │                           │                        │  │
     │                           │ 2. Compare CID:        │  │
     │                           │    presented == stored │  │
     │                           │                        │  │
     │                           │ 3. Return verification │  │
     │                           └────────────────────────┼──┘
     │                                                    │
     │                      If verified ✅:              │
     │                      ┌─────────────────────────────┤
     │                      │ Call claimContract         │
     │                      │   .submitClaim(...)        │
     │                      └─────────────────────────────┤
     │                                                    │
     │  {                                                 │
     │    success: true,                                 │
     │    claimId: 1,                                    │
     │    txHash: "0x...",                               │
     │    verification: { verified: true, ... }          │
     │  }                                                 │
     <────────────────────────────────────────────────────┤
     │                                                    │
```

### Key Verification Steps

1. **Policy Lookup**
   ```javascript
   const policy = await prisma.policy.findUnique({
     where: { onchainPolicyId: policyId },
     include: { provider: true }
   });
   ```

2. **CID Verification**
   ```javascript
   if (presentedVcCid !== policy.provider.vcCid) {
     return { verified: false, error: 'vcCid_mismatch' };
   }
   ```

3. **JWT Verification** (Optional)
   ```javascript
   const result = await veramoAgent.verifyCredential({
     credential: presentedJwt
   });
   ```

4. **On-Chain Submission**
   ```javascript
   const tx = await claimContract.submitClaim(
     policyId,
     patientAddress,
     amount,
     fileCid
   );
   ```

## Data Flow: Provider Onboarding to Claim Submission

### 1. Provider Onboarding

```
Provider → Backend → Pinata IPFS → Veramo → Pinata IPFS → Database
          (upload)   (license)    (issue   (VC)          (provider
                                   VC)                    record)
```

**Output**: `providerVcCid` stored in database, linked to `providerDid`

### 2. Policy Issuance

```
Insurer → Backend → PolicyContract → Veramo → Pinata IPFS → Database
                    (on-chain)       (issue   (policy VC)   (policy
                                     policy                 record with
                                     VC)                    policyId →
                                                            providerId
                                                            mapping)
```

**Critical**: Database stores `onchainPolicyId → providerId` mapping

### 3. Claim Submission

```
Patient → Backend → verifyVcForPolicy() → ClaimContract → Database
                    (DB lookup:           (on-chain)      (claim
                     policyId →                           record)
                     providerId →
                     vcCid match)
```

**Verification happens entirely off-chain using DB**, but claim is recorded on-chain for immutability.

## Security Considerations

### 1. Key Management
- **Current**: File-based local storage
- **Production**: Migrate to HSM or cloud KMS
- **Secret**: `KMS_SECRET_KEY` encrypts keystore

### 2. Access Control
- **Current**: Open API (development)
- **Production**: JWT-based authentication, role-based access

### 3. Data Privacy
- **On-Chain**: Only policy IDs, amounts, statuses (public)
- **Off-Chain**: Patient PHI stored on IPFS with access controls

### 4. VC Verification
- **Multi-layered**: CID matching + optional JWT crypto verification
- **Debugging**: `tried` array for transparent failure analysis

## Scalability Considerations

### Current (Development)
- Single SQLite database
- Local Hardhat node
- Single backend instance

### Production Recommendations
1. **Database**: PostgreSQL with replication
2. **Blockchain**: Mainnet or L2 (Polygon, Arbitrum)
3. **IPFS**: Pinata + Filecoin for redundancy
4. **Backend**: Horizontal scaling with load balancer
5. **Caching**: Redis for frequently accessed VCs
6. **Events**: Blockchain event indexing (The Graph)

## Technology Choices

### Ethers v6
- Modern API
- Better TypeScript support
- Simpler contract interaction
- Compatible with latest Hardhat

### Veramo
- W3C-compliant VCs
- Modular architecture
- Supports multiple DID methods
- Active development

### Prisma
- Type-safe ORM
- Great DX with migrations
- Multi-database support (easy to switch to PostgreSQL)

### Pinata
- Reliable IPFS pinning
- Simple API
- Free tier sufficient for development
- Good uptime

## Future Enhancements

1. **ZK-Proofs**: Privacy-preserving claim verification
2. **Multi-Sig Policies**: Require multiple approvers
3. **Automated Payouts**: Smart contract-based claim settlement
4. **Oracle Integration**: Real-world data validation
5. **Mobile App**: React Native for patient/provider apps
6. **Graph Indexing**: Fast historical query support

---

**Architecture designed for decentralization, verifiability, and scalability**
