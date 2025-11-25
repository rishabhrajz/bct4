# ProjectY - Decentralized Healthcare Insurance

A complete decentralized identity and verifiable credentials system with Ethereum integration for healthcare insurance claims processing.

## 🎯 Overview

ProjectY combines DIDs (Decentralized Identifiers), Verifiable Credentials, IPFS storage, and Ethereum smart contracts to create a transparent, verifiable insurance claims system.

### Key Features

- **Decentralized Identity**: Veramo-based DID management with persistent local keys
- **Verifiable Credentials**: W3C-compliant VCs for providers and policies
- **On-Chain Policies & Claims**: Ethereum smart contracts for policy and claim lifecycle
- **IPFS Storage**: Pinata integration for decentralized document storage
- **Full-Stack Application**: React frontend + Node.js/Express backend
- **Comprehensive Testing**: Unit and integration tests included

## 📋 Prerequisites

- **Node.js**: >= 18.0.0 < 25.0.0
- **npm**: >= 8.0.0
- **Pinata Account**: For IPFS pinning (get JWT from https://pinata.cloud)
- **jq**: For demo script (install: `brew install jq` on macOS)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd projecty

# Install root dependencies (Hardhat)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Pinata JWT:

```env
PINATA_JWT=your_actual_pinata_jwt_here
```

> **Important**: Get your Pinata JWT from https://app.pinata.cloud/developers/api-keys

### 3. Start Hardhat Node

In a **new terminal**:

```bash
cd projecty
npx hardhat node
```

Keep this running. You'll see 20 test accounts with private keys.

### 4. Deploy Smart Contracts

In another terminal:

```bash
cd projecty
npx hardhat run contracts/scripts/deploy.js --network localhost
```

You should see contract addresses saved to `deployments/deployed.json`.

### 5. Initialize Database

```bash
cd backend
npx prisma migrate dev --name init
```

### 6. Start Backend

```bash
cd backend
npm run dev
```

Backend should start on http://localhost:4000

### 7. Start Frontend (Optional)

In another terminal:

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:3000

### 8. Run Demo

```bash
cd backend
./demo-run.sh
```

This will execute the complete end-to-end flow:
1. Onboard a provider with license
2. Create patient DID
3. Issue insurance policy
4. Upload patient document
5. Submit and verify claim

## 📁 Project Structure

```
projecty/
├── contracts/              # Solidity smart contracts
│   ├── IdentityRegistry.sol
│   ├── PolicyContract.sol
│   ├── ClaimContract.sol
│   └── scripts/
│       └── deploy.js
├── backend/                # Node.js/Express API
│   ├── server.js           # Main server
│   ├── veramo-setup.js     # Veramo agent (persistent keys)
│   ├── ipfs-pinata.js      # Pinata IPFS integration
│   ├── contract-service.js # Ethereum contract interface
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── services/           # Business logic
│   │   ├── provider-service.js
│   │   ├── policy-service.js
│   │   ├── claim-service.js
│   │   └── vc-utils.js     # VC verification logic
│   ├── controllers/        # Request handlers
│   │   ├── provider-controller.js
│   │   ├── policy-controller.js
│   │   └── claim-controller.js
│   ├── scripts/
│   │   └── migrate-vc-store.js
│   ├── demo/               # Demo assets
│   │   ├── provider-license.jpg
│   │   └── patient-report.jpg
│   └── demo-run.sh         # E2E demo script
├── frontend/               # React + Vite UI
│   └── src/
│       ├── pages/
│       │   ├── ProviderOnboard.jsx
│       │   ├── IssuePolicy.jsx
│       │   ├── UploadPatientDoc.jsx
│       │   ├── SubmitClaim.jsx
│       │   └── InsurerDashboard.jsx
│       └── components/
│           ├── FileUpload.jsx
│           ├── ConnectWallet.jsx
│           ├── ResponseBox.jsx
│           └── TxHashDisplay.jsx
├── deployments/            # Contract deployment info
│   └── deployed.json
├── hardhat.config.js
├── docker-compose.yml
└── README.md
```

## 🔧 Technology Stack

### Smart Contracts
- **Solidity**: ^0.8.20
- **Hardhat**: ^2.19.4
- **Ethers**: ^6.13.0
- **@nomicfoundation/hardhat-toolbox**: ^5.0.0

### Backend
- **Node.js**: >= 18 < 25
- **Express**: ^4.18.2
- **Veramo**: ^4.2.0 (DID & VC management)
- **@veramo/kms-local**: Persistent file-based key storage
- **Prisma**: ^4.16.2 (SQLite ORM)
- **Axios**: ^1.6.2 (Pinata HTTP client)
- **Ethers**: ^6.13.0

### Frontend
- **React**: ^18.2.0
- **Vite**: ^5.0.8
- **React Router**: ^6.20.0
- **Ethers**: ^6.13.0
- **Axios**: ^1.6.2

## 🧪 Testing

### Run Unit Tests

```bash
cd backend
npm test
```

Tests include:
- VC verification logic (`vc-utils.test.js`)
- Policy/provider mapping
- CID matching
- JWT cryptographic verification

### Run Integration Tests

```bash
cd backend
npm run test:integration
```

Integration tests verify the complete flow from provider onboarding through claim submission.

## 🔑 Key Design Decisions

### 1. Persistent Veramo Keys

**Why?** Decentralization and reproducibility.

Veramo uses `kms-local` with file-based storage (`./veramo_keystore/keys.json`) instead of in-memory or Google KMS. This means:
- ✅ Keys survive server restarts
- ✅ Same issuer DID across deployments
- ✅ No external KMS dependencies
- ✅ Can be easily migrated to external KMS later

### 2. Database as Single Source of Truth

All VC metadata (CIDs, JWTs, issuer info) is stored in SQLite via Prisma:
- **Provider** table: Maps provider DIDs to VC CIDs
- **Policy** table: Maps on-chain policy IDs to provider IDs (critical for verification)
- **Claim** table: Links claims to policies

### 3. Robust VC Verification

`verifyVcForPolicy()` in `vc-utils.js` implements a multi-step verification process:

1. **Policy Lookup**: Query DB by `onchainPolicyId`
2. **CID Verification**: Compare presented `vcCid` with stored value
3. **JWT Verification**: Cryptographic validation using Veramo
4. **DID Matching**: Ensure credential subject matches provider

Returns a detailed `tried` array for debugging failures.

### 4. Pinata with Retry Logic

IPFS pinnin uses exponential backoff (3 attempts: 1s, 2s, 4s) to handle transient network errors.

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Set Pinata JWT
export PINATA_JWT=your_jwt_here

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🎬 Demo Flow Explained

The `demo-run.sh` script demonstrates:

### Step 1: Provider Onboarding
- Upload provider license to IPFS → `licenseCid`
- Issue Provider VC (containing `providerDid`, `name`, `licenseCid`)
- Pin VC to IPFS → `providerVcCid`
- Store in database

### Step 2: Patient DID Creation
- Create new DID via Veramo
- Extract Ethereum address from DID

### Step 3: Policy Issuance
- Call on-chain `policyContract.issuePolicy()`
- Extract `policyId` from event
- Issue Policy VC (containing `policyId`, beneficiary, coverage)
- Pin VC to IPFS → `policyVcCid`
- Store in database with **mapping: `onchainPolicyId` → `providerId`**

### Step 4: Document Upload
- Upload patient report to IPFS → `fileCid`

### Step 5: Claim Submission
- Backend verifies provider VC using `verifyVcForPolicy()`:
  - Queries policy by `onchainPolicyId`
  - Loads associated provider
  - Compares `presentedVcCid` with stored `provider.vcCid`
- If verified, submits claim on-chain
- Stores claim in database

## 🐛 Troubleshooting

### "Hardhat node not running"
Ensure `npx hardhat node` is running in a separate terminal on port 8545.

### "Contracts not deployed"
Run: `npx hardhat run contracts/scripts/deploy.js --network localhost`

### "Backend can't find contracts"
Check that `deployments/deployed.json` exists and contains contract addresses.

### "Pinata upload fails"
- Verify your `PINATA_JWT` is correct
- Check Pinata account status
- Ensure you have pinning capacity

### "VC verification fails"
Enable verbose mode: `curl "http://localhost:4000/claim/submit?verbose=true" ...`

Check the `tried` array in the response for detailed debugging.

### "Database errors"
Reset the database:
```bash
cd backend
rm -rf data/
npx prisma migrate reset
```

## 📚 Additional Documentation

- See [architecture.md](./architecture.md) for system design details
- See [API.md](./API.md) for complete API reference
- See [DEMO_OUTPUT.txt](./DEMO_OUTPUT.txt) for example successful demo run

## 🤝 Contributing

This is a demonstration project. For production use:
1. Replace `KMS_SECRET_KEY` with a secure value
2. Use a production-grade database (PostgreSQL)
3. Implement access control and authentication
4. Add comprehensive error tracking
5. Consider migrating to external KMS for key management

## 📄 License

MIT

---

**Built with ❤️ using Veramo, Ethereum, IPFS, and React**
