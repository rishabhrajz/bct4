# ProjectY API Documentation

Base URL: `http://localhost:4000`

## Authentication

Currently, the API does not require authentication (development mode). In production, implement JWT-based authentication.

## Response Format

All endpoints return JSON responses in the following format:

**Success**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

---

## Provider Endpoints

### POST /provider/onboard

Onboard a new healthcare provider with optional license file.

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| providerDid | string | Yes | Provider's DID |
| providerAddress | string | Yes | Provider's Ethereum address |
| name | string | Yes | Provider's name |
| file | file | No | Provider license image/PDF |

**Example** (curl):
```bash
curl -X POST http://localhost:4000/provider/onboard \
  -F "providerDid=did:ethr:localhost:0x70997970C51812dc3A010C7d01b50e0d17dc79C8" \
  -F "providerAddress=0x70997970C51812dc3A010C7d01b50e0d17dc79C8" \
  -F "name=Dr. Sarah Chen" \
  -F "file=@./license.jpg"
```

**Response** (201 Created):
```json
{
  "success": true,
  "provider": {
    "id": 1,
    "providerDid": "did:ethr:localhost:0x...",
    "providerAddress": "0x...",
    "name": "Dr. Sarah Chen",
    "vcCid": "Qm...",
    "licenseCid": "Qm...",
    "licenseUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
    "issuerDid": "did:ethr:localhost:0x...",
    "issuedAt": "2024-11-23T12:00:00.000Z"
  }
}
```

### GET /provider/list

List all onboarded providers.

**Response** (200 OK):
```json
{
  "success": true,
  "providers": [
    {
      "id": 1,
      "providerDid": "did:ethr:localhost:0x...",
      "providerAddress": "0x...",
      "name": "Dr. Sarah Chen",
      "vcCid": "Qm...",
      "licenseCid": "Qm...",
      "createdAt": "2024-11-23T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Policy Endpoints

### POST /policy/issue

Issue a new insurance policy on-chain.

**Request**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| providerId | integer | Yes | Database ID of provider |
| beneficiaryAddress | string | Yes | Beneficiary's Ethereum address |
| beneficiaryDid | string | No | Beneficiary's DID |
| coverageAmount | string | Yes | Coverage amount in wei |
| startEpoch | integer | Yes | Policy start timestamp (Unix) |
| endEpoch | integer | Yes | Policy end timestamp (Unix) |

**Example**:
```bash
curl -X POST http://localhost:4000/policy/issue \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": 1,
    "beneficiaryAddress": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "beneficiaryDid": "did:ethr:localhost:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "coverageAmount": "1000000000000000000",
    "startEpoch": 1700000000,
    "endEpoch": 1731536000
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "policyId": 1,
  "policyVcCid": "Qm...",
  "txHash": "0x...",
  "policy": {
    "id": 1,
    "onchainPolicyId": 1,
    "beneficiaryAddress": "0x...",
    "coverageAmount": "1000000000000000000",
    "startEpoch": 1700000000,
    "endEpoch": 1731536000,
    "providerId": 1
  }
}
```

### GET /policy/list

List all issued policies.

**Response** (200 OK):
```json
{
  "success": true,
  "policies": [
    {
      "id": 1,
      "onchainPolicyId": 1,
      "beneficiaryAddress": "0x...",
      "beneficiaryDid": "did:ethr:localhost:0x...",
      "coverageAmount": "1000000000000000000",
      "startEpoch": 1700000000,
      "endEpoch": 1731536000,
      "providerId": 1,
      "providerName": "Dr. Sarah Chen",
      "policyVcCid": "Qm...",
      "createdAt": "2024-11-23T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /policy/:policyId

Get policy details by on-chain policy ID.

**Parameters**:
- `policyId` (path): On-chain policy ID

**Response** (200 OK):
```json
{
  "success": true,
  "policy": {
    "id": 1,
    "onchainPolicyId": 1,
    "beneficiaryAddress": "0x...",
    "coverageAmount": "1000000000000000000",
    "providerName": "Dr. Sarah Chen",
    ...
  }
}
```

---

## Claim Endpoints

### POST /claim/submit

Submit an insurance claim with provider VC verification.

**Request**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| policyId | integer | Yes | On-chain policy ID |
| patientDid | string | Yes | Patient's DID |
| patientAddress | string | Yes | Patient's Ethereum address |
| fileCid | string | Yes | IPFS CID of supporting document |
| amount | string | Yes | Claim amount in wei |
| providerDid | string | Yes | Provider's DID |
| providerVcCid | string | Yes* | Provider's VC CID (for CID verification) |
| providerVcJwt | string | No* | Provider's VC JWT (for crypto verification) |

*At least one of `providerVcCid` or `providerVcJwt` must be provided.

**Query Parameters**:
- `verbose=true` (dev only): Include detailed verification debug info

**Example**:
```bash
curl -X POST "http://localhost:4000/claim/submit?verbose=true" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": 1,
    "patientDid": "did:ethr:localhost:0x...",
    "patientAddress": "0x...",
    "fileCid": "Qm...",
    "amount": "500000000000000000",
    "providerDid": "did:ethr:localhost:0x...",
    "providerVcCid": "Qm..."
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "claimId": 1,
  "txHash": "0x...",
  "claim": {
    "id": 1,
    "onchainClaimId": 1,
    "policyId": 1,
    "patientAddress": "0x...",
    "fileCid": "Qm...",
    "amount": "500000000000000000",
    "status": "Submitted"
  },
  "verification": {
    "verified": true,
    "method": {
      "cidMatches": true,
      "jwtMatches": false,
      "cryptoVerified": false
    }
  }
}
```

**Error Response** (400 Bad Request - Verification Failed):
```json
{
  "success": false,
  "error": "Claim verification failed",
  "message": "Provider credential verification failed",
  "verification": {
    "verified": false,
    "error": "vcCid_mismatch",
    "message": "..."
  },
  "debug": {
    "tried": ["policy_lookup", "policy_found", "cid_check", "cid_mismatch"],
    "storedCid": "Qm...",
    "presentedCid": "Qm..."
  }
}
```

### POST /claim/update-status

Update claim status (insurer action).

**Request**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| claimId | integer | Yes | Database claim ID |
| status | string | Yes | New status: "Submitted", "UnderReview", "Approved", "Rejected", "Paid" |

**Example**:
```bash
curl -X POST http://localhost:4000/claim/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "claimId": 1,
    "status": "Approved"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "claim": {
    "id": 1,
    "onchainClaimId": 1,
    "status": "Approved"
  }
}
```

### GET /claim/list

List all claims with optional filters.

**Query Parameters**:
- `policyId` (optional): Filter by policy ID
- `status` (optional): Filter by status
- `patientAddress` (optional): Filter by patient address

**Example**:
```bash
curl "http://localhost:4000/claim/list?status=Approved"
```

**Response** (200 OK):
```json
{
  "success": true,
  "claims": [
    {
      "id": 1,
      "onchainClaimId": 1,
      "policyId": 1,
      "onchainPolicyId": 1,
      "patientAddress": "0x...",
      "patientDid": "did:ethr:localhost:0x...",
      "fileCid": "Qm...",
      "amount": "500000000000000000",
      "status": "Approved",
      "txHash": "0x...",
      "providerName": "Dr. Sarah Chen",
      "createdAt": "2024-11-23T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## File Upload Endpoint

### POST /file/upload

Upload a file to IPFS via Pinata.

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | File to upload |

**Example**:
```bash
curl -X POST http://localhost:4000/file/upload \
  -F "file=@./patient-report.pdf"
```

**Response** (200 OK):
```json
{
  "success": true,
  "fileCid": "Qm...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
  "filename": "patient-report.pdf"
}
```

---

## DID Management

### POST /did/create

Create a new DID via Veramo.

**Request**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| alias | string | No | Optional alias for the DID |

**Example**:
```bash
curl -X POST http://localhost:4000/did/create \
  -H "Content-Type: application/json" \
  -d '{"alias":"patient-001"}'
```

**Response** (200 OK):
```json
{
  "success": true,
  "did": "did:ethr:localhost:0x...",
  "alias": "patient-001"
}
```

---

## Debug Endpoints (Development Only)

### GET /debug/providers

List all providers (includes full data for debugging).

**Response** (200 OK):
```json
{
  "success": true,
  "providers": [...],
  "count": 1
}
```

### GET /debug/policies

List all policies with provider ID mapping.

**Response** (200 OK):
```json
{
  "success": true,
  "policies": [...],
  "count": 1,
  "mapping": [
    {
      "onchainPolicyId": 1,
      "providerId": 1
    }
  ]
}
```

### GET /debug/claims

List all claims with full details.

**Response** (200 OK):
```json
{
  "success": true,
  "claims": [...],
  "count": 1
}
```

---

## Error Codes

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Missing or invalid parameters |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

### Common Error Responses

**Missing Fields**:
```json
{
  "error": "Missing required fields",
  "required": ["policyId", "patientDid", ...]
}
```

**Verification Failed**:
```json
{
  "error": "Claim verification failed",
  "verification": {
    "verified": false,
    "error": "vcCid_mismatch",
    "storedCid": "Qm...",
    "presentedCid": "Qm...",
    "tried": [...]
  }
}
```

**Transaction Failed**:
```json
{
  "error": "Failed to submit claim",
  "message": "Transaction reverted: Policy is not active"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production, implement rate limiting per IP/API key.

## CORS

CORS is enabled for all origins in development mode. Configure appropriately for production.

---

## WebSocket Support

Not currently implemented. Consider adding for real-time claim status updates in future versions.

---

**API Version**: 1.0.0  
**Last Updated**: 2024-11-23
