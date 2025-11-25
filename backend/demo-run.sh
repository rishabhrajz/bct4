#!/bin/bash

# ProjectY Demo Script
# This script demonstrates the complete flow:
# 1. Check Hardhat node is running
# 2. Deploy contracts (if needed)
# 3. Start backend
# 4. Onboard provider
# 5. Create patient DID
# 6. Issue policy
# 7. Upload patient document
# 8. Submit claim

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
API_URL="http://localhost:4000"

# Function to print colored output
print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Sanitize function to remove CR/LF and extra whitespace
sanitize() {
    echo "$1" | tr -d '\r\n' | xargs
}

echo ""
print_step "🚀 ProjectY E2E Demo"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Please install jq first: brew install jq"
    exit 1
fi

# Step 1: Check if Hardhat node is running
print_step "STEP 1: Checking Hardhat Node"
if ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://127.0.0.1:8545 > /dev/null 2>&1; then
    print_error "Hardhat node is not running on http://127.0.0.1:8545"
    print_info "Please start Hardhat node in another terminal: npx hardhat node"
    exit 1
fi
print_success "Hardhat node is running"
echo ""

# Step 2: Deploy contracts if needed
print_step "STEP 2: Deploying Contracts"
if [ ! -f "../deployments/deployed.json" ] || [ "$1" == "--deploy" ]; then
    print_info "Deploying contracts..."
    cd ..
    npx hardhat run contracts/scripts/deploy.js --network localhost
    cd backend
    print_success "Contracts deployed"
else
    print_info "Contracts already deployed (use --deploy flag to redeploy)"
fi
echo ""

# Step 3: Check if backend is running
print_step "STEP 3: Checking Backend"
if ! curl -s ${API_URL}/health > /dev/null 2>&1; then
    print_error "Backend is not running on ${API_URL}"
    print_info "Please start backend in another terminal: cd backend && npm run dev"
    exit 1
fi
print_success "Backend is running"
echo ""

# Step 4: Onboard Provider
print_step "STEP 4: Onboarding Healthcare Provider"

# Generate a provider DID and address (using demo values)
PROVIDER_DID="did:ethr:localhost:0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
PROVIDER_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
PROVIDER_NAME="Dr. Sarah Chen Medical Practice"

print_info "Provider DID: ${PROVIDER_DID}"
print_info "Provider Address: ${PROVIDER_ADDRESS}"

# Check if provider already exists
EXISTING_PROVIDERS=$(curl -s ${API_URL}/provider/list)
PROVIDER_EXISTS=$(echo "$EXISTING_PROVIDERS" | jq -r --arg did "$PROVIDER_DID" '.providers[] | select(.providerDid == $did) | .id')

if [ -n "$PROVIDER_EXISTS" ]; then
    print_info "Provider already exists, using existing provider"
    PROVIDER_ID=$(sanitize "$PROVIDER_EXISTS")
    PROVIDER_VC_CID=$(echo "$EXISTING_PROVIDERS" | jq -r --arg did "$PROVIDER_DID" '.providers[] | select(.providerDid == $did) | .vcCid')
    PROVIDER_LICENSE_CID=$(echo "$EXISTING_PROVIDERS" | jq -r --arg did "$PROVIDER_DID" '.providers[] | select(.providerDid == $did) | .licenseCid')
    
    print_success "Using existing provider"
    echo "   Provider ID: ${PROVIDER_ID}"
    echo "   VC CID: ${PROVIDER_VC_CID}"
    echo "   License CID: ${PROVIDER_LICENSE_CID}"
else
    print_info "Uploading license file: ../demo/provider-license.jpg"
    
    PROVIDER_RESPONSE=$(curl -s -X POST ${API_URL}/provider/onboard \
      -F "providerDid=${PROVIDER_DID}" \
      -F "providerAddress=${PROVIDER_ADDRESS}" \
      -F "name=${PROVIDER_NAME}" \
      -F "file=@../demo/provider-license.jpg")
    
    if ! echo "$PROVIDER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_error "Provider onboarding failed"
        echo "$PROVIDER_RESPONSE" | jq '.'
        exit 1
    fi
    
    PROVIDER_VC_CID=$(sanitize "$(echo "$PROVIDER_RESPONSE" | jq -r '.provider.vcCid')")
    PROVIDER_LICENSE_CID=$(sanitize "$(echo "$PROVIDER_RESPONSE" | jq -r '.provider.licenseCid')")
    PROVIDER_ID=$(sanitize "$(echo "$PROVIDER_RESPONSE" | jq -r '.provider.id')")
    
    print_success "Provider onboarded successfully"
    echo "   Provider ID: ${PROVIDER_ID}"
    echo "   VC CID: ${PROVIDER_VC_CID}"
    echo "   License CID: ${PROVIDER_LICENSE_CID}"
fi
echo ""

# Step 5: Create Patient DID
print_step "STEP 5: Creating Patient DID"

# Use timestamp + random number for unique alias
TIMESTAMP=$(date +%s)
RANDOM_NUM=$RANDOM
PATIENT_ALIAS="demo-patient-${TIMESTAMP}-${RANDOM_NUM}"

PATIENT_DID_RESPONSE=$(curl -s -X POST ${API_URL}/did/create \
  -H "Content-Type: application/json" \
  -d "{\"alias\":\"${PATIENT_ALIAS}\"}")

if ! echo "$PATIENT_DID_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_error "Patient DID creation failed"
    echo "$PATIENT_DID_RESPONSE" | jq '.'
    exit 1
fi

PATIENT_DID=$(sanitize "$(echo "$PATIENT_DID_RESPONSE" | jq -r '.did')")

# Extract patient address from DID
PATIENT_ADDRESS=$(echo "$PATIENT_DID" | grep -oE '0x[a-fA-F0-9]{40}')

print_success "Patient DID created"
echo "   Patient DID: ${PATIENT_DID}"
echo "   Patient Address: ${PATIENT_ADDRESS}"
echo ""

# Step 6: Issue Policy
print_step "STEP 6: Issuing Insurance Policy"

# Calculate timestamps (start in 60 seconds to avoid timing issues, end in 1 year)
START_EPOCH=$(($(date +%s) + 60))
END_EPOCH=$(($(date +%s) + 31536000))  # +1 year from now
COVERAGE_AMOUNT="1000000000000000000"  # 1 ETH in wei

print_info "Coverage Amount: ${COVERAGE_AMOUNT} wei (1 ETH)"
print_info "Start: $(date -r ${START_EPOCH})"
print_info "End: $(date -r ${END_EPOCH})"

POLICY_RESPONSE=$(curl -s -X POST ${API_URL}/policy/issue \
  -H "Content-Type: application/json" \
  -d "{
    \"beneficiaryAddress\": \"${PATIENT_ADDRESS}\",
    \"beneficiaryDid\": \"${PATIENT_DID}\",
    \"coverageAmount\": \"${COVERAGE_AMOUNT}\",
    \"startEpoch\": ${START_EPOCH},
    \"endEpoch\": ${END_EPOCH},
    \"providerId\": ${PROVIDER_ID}
  }")

if ! echo "$POLICY_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_error "Policy issuance failed"
    echo "$POLICY_RESPONSE" | jq '.'
    exit 1
fi

POLICY_ID=$(sanitize "$(echo "$POLICY_RESPONSE" | jq -r '.policyId')")
POLICY_VC_CID=$(sanitize "$(echo "$POLICY_RESPONSE" | jq -r '.policyVcCid')")
POLICY_TX_HASH=$(sanitize "$(echo "$POLICY_RESPONSE" | jq -r '.txHash')")

print_success "Policy issued successfully"
echo "   Policy ID: ${POLICY_ID}"
echo "   Policy VC CID: ${POLICY_VC_CID}"
echo "   Transaction Hash: ${POLICY_TX_HASH}"
echo ""

# Step 7: Upload Patient Document
print_step "STEP 7: Uploading Patient Document"

print_info "Uploading file: ../demo/patient-report.jpg"

FILE_RESPONSE=$(curl -s -X POST ${API_URL}/file/upload \
  -F "file=@../demo/patient-report.jpg")

if ! echo "$FILE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_error "File upload failed"
    echo "$FILE_RESPONSE" | jq '.'
    exit 1
fi

FILE_CID=$(sanitize "$(echo "$FILE_RESPONSE" | jq -r '.fileCid')")
FILE_GATEWAY_URL=$(sanitize "$(echo "$FILE_RESPONSE" | jq -r '.gatewayUrl')")

print_success "Patient document uploaded"
echo "   File CID: ${FILE_CID}"
echo "   Gateway URL: ${FILE_GATEWAY_URL}"
echo ""

# Step 8: Submit Claim
print_step "STEP 8: Submitting Insurance Claim"

CLAIM_AMOUNT="500000000000000000"  # 0.5 ETH

print_info "Claim Amount: ${CLAIM_AMOUNT} wei (0.5 ETH)"
print_info "Policy ID: ${POLICY_ID}"
print_info "Provider VC CID: ${PROVIDER_VC_CID}"

# Sanitize all variables for JSON
SANITIZED_POLICY_ID=$(sanitize "${POLICY_ID}")
SANITIZED_PATIENT_DID=$(sanitize "${PATIENT_DID}")
SANITIZED_PATIENT_ADDRESS=$(sanitize "${PATIENT_ADDRESS}")
SANITIZED_FILE_CID=$(sanitize "${FILE_CID}")
SANITIZED_CLAIM_AMOUNT=$(sanitize "${CLAIM_AMOUNT}")
SANITIZED_PROVIDER_DID=$(sanitize "${PROVIDER_DID}")
SANITIZED_PROVIDER_VC_CID=$(sanitize "${PROVIDER_VC_CID}")

# Create JSON payload
read -r -d '' CLAIM_PAYLOAD <<EOF || true
{
  "policyId": ${SANITIZED_POLICY_ID},
  "patientDid": "${SANITIZED_PATIENT_DID}",
  "patientAddress": "${SANITIZED_PATIENT_ADDRESS}",
  "fileCid": "${SANITIZED_FILE_CID}",
  "amount": "${SANITIZED_CLAIM_AMOUNT}",
  "providerDid": "${SANITIZED_PROVIDER_DID}",
  "providerVcCid": "${SANITIZED_PROVIDER_VC_CID}"
}
EOF

CLAIM_RESPONSE=$(curl -s -X POST "${API_URL}/claim/submit?verbose=true" \
  -H "Content-Type: application/json" \
  -d "${CLAIM_PAYLOAD}")

if ! echo "$CLAIM_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_error "Claim submission failed"
    echo ""
    echo "Response:"
    echo "$CLAIM_RESPONSE" | jq '.'
    echo ""
    
    # Print verification details if available
    if echo "$CLAIM_RESPONSE" | jq -e '.verification' > /dev/null 2>&1; then
        echo "Verification Details:"
        echo "$CLAIM_RESPONSE" | jq '.verification'
        
        if echo "$CLAIM_RESPONSE" | jq -e '.debug' > /dev/null 2>&1; then
            echo ""
            echo "Debug Information:"
            echo "$CLAIM_RESPONSE" | jq '.debug'
        fi
    fi
    exit 1
fi

CLAIM_ID=$(sanitize "$(echo "$CLAIM_RESPONSE" | jq -r '.claimId')")
CLAIM_TX_HASH=$(sanitize "$(echo "$CLAIM_RESPONSE" | jq -r '.txHash')")
CLAIM_STATUS=$(sanitize "$(echo "$CLAIM_RESPONSE" | jq -r '.claim.status')")

print_success "Claim submitted successfully"
echo "   Claim ID: ${CLAIM_ID}"
echo "   Status: ${CLAIM_STATUS}"
echo "   Transaction Hash: ${CLAIM_TX_HASH}"
echo ""

# Final Summary
print_step "🎉 DEMO SUCCESS!"
echo ""
echo "Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Provider:"
echo "  - Name: ${PROVIDER_NAME}"
echo "  - DID: ${PROVIDER_DID}"
echo "  - VC CID: ${PROVIDER_VC_CID}"
echo ""
echo "Patient:"
echo "  - DID: ${PATIENT_DID}"
echo "  - Address: ${PATIENT_ADDRESS}"
echo ""
echo "Policy:"
echo "  - Policy ID: ${POLICY_ID}"
echo "  - Coverage: 1 ETH"
echo "  - TX Hash: ${POLICY_TX_HASH}"
echo ""
echo "Claim:"
echo "  - Claim ID: ${CLAIM_ID}"
echo "  - Amount: 0.5 ETH"
echo "  - Status: ${CLAIM_STATUS}"
echo "  - TX Hash: ${CLAIM_TX_HASH}"
echo "  - Document CID: ${FILE_CID}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "All steps completed successfully! 🎊"
echo ""
