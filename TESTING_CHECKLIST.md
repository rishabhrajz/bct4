# ProjectY - Testing Checklist

## Prerequisites
✅ Hardhat node running on `localhost:8545`
✅ Backend server running on `localhost:4000`
✅ Frontend running on `localhost:5173`
✅ MetaMask installed with Hardhat network configured
✅ Test accounts imported (see SETUP_METAMASK.md)

## Test Accounts
- **Insurer (Account #0):** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Patient (Account #1):** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Provider (Account #2):** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

---

## 🏥 Provider Onboarding Flow

### Step 1: Provider Registration (Account #2)
- [ ] Navigate to "Provider Onboard" page
- [ ] Connect MetaMask with **Provider account (#2)**
- [ ] Create DID for provider
- [ ] Upload medical license file
- [ ] Submit for approval
- [ ] Verify status shows **"PENDING"**
- [ ] Check backend: `GET http://localhost:4000/provider/pending`

### Step 2: Insurer Approval (Account #0)
- [ ] Switch to **Insurer account (#0)** in MetaMask
- [ ] Navigate to "Insurer Provider Approvals" page
- [ ] Verify provider appears in pending list
- [ ] Click "View License" IPFS link (should open)
- [ ] Click "✅ Approve" button
- [ ] Confirm transaction in MetaMask
- [ ] Verify provider disappears from pending list

### Step 3: Verify Provider Approved
- [ ] Switch back to **Provider account (#2)**
- [ ] Navigate to "Provider Onboard" page
- [ ] Verify status shows **"APPROVED"**
- [ ] Provider can now submit claims

---

## 💳 Policy Purchase Flow (with Approval & Payment)

### Step 1: Patient KYC Upload (Account #1)
- [ ] Switch to **Patient account (#1)** in MetaMask
- [ ] Navigate to "Patient Dashboard"
- [ ] Connect wallet
- [ ] Upload Aadhaar card (any image/PDF)
- [ ] Verify KYC status: **"PENDING_VERIFICATION"**

### Step 2: Request Policy with Premium Payment
- [ ] Navigate to "Issue Policy" or "Buy Policy" page
- [ ] Select policy tier (Basic/Standard/Premium)
- [ ] Enter coverage amount (e.g., 1 ETH)
- [ ] Verify premium calculation is correct:
  - Basic: 1% of coverage
  - Standard: 2% of coverage
  - Premium: 3% of coverage
- [ ] Click "Request Policy" button
- [ ] **MetaMask should popup requesting payment**
- [ ] Confirm transaction with premium amount
- [ ] Verify policy status: **"PENDING_APPROVAL"**
- [ ] Note: Premium is now in escrow

### Step 3: Insurer Reviews Policy (Account #0)
- [ ] Switch to **Insurer account (#0)**
- [ ] Navigate to "Insurer Policy Approvals"
- [ ] Verify policy appears with:
  - Patient address
  - Coverage amount
  - Premium (in escrow)
  - Tier
  - KYC document link

#### Test Approval Path
- [ ] Click "View KYC Document" (should open)
- [ ] Click "✅ Approve & Activate"
- [ ] Confirm transaction
- [ ] Verify premium released from escrow
- [ ] Policy status: **"ACTIVE"**

#### Test Rejection Path (Optional)
- [ ] Click "❌ Reject & Refund"
- [ ] Enter rejection reason
- [ ] Confirm rejection
- [ ] **Verify premium auto-refunded to patient**
- [ ] Check patient balance increased
- [ ] Policy status: **"REJECTED"**

---

## 🩺 Claim Submission & Three-State Approval

### Step 1: Provider Submits Claim (Account #2)
- [ ] Switch to **Provider account (#2)**
- [ ] Navigate to "Submit Claim" page
- [ ] Enter patient DID
- [ ] Enter patient address (Account #1)
- [ ] Upload medical report
- [ ] Enter claim amount (≤ policy coverage)
- [ ] Enter provider wallet address (for payment)
- [ ] Submit claim
- [ ] Verify status: **"PENDING"**
- [ ] Check backend: `GET http://localhost:4000/claim/pending`

### Step 2: Insurer Reviews Claim (Account #0)
- [ ] Switch to **Insurer account (#0)**
- [ ] Navigate to "Insurer Dashboard" or "Claim Review"
- [ ] Verify claim appears in **Pending Claims**

#### Three-State Flow

**State 1: Set to Under Review**
- [ ] Click "🔍 Under Review"
- [ ] Confirm transaction
- [ ] Claim moves to **"UNDER_REVIEW"** status
- [ ] Appears in "Under Review Claims" section

**State 2A: Approve & Pay**
- [ ] In "Under Review Claims", find the claim
- [ ] Click "✅ Approve & Pay"
- [ ] Enter payout amount
- [ ] Confirm MetaMask transaction **with payment**
- [ ] Verify ETH sent to provider wallet
- [ ] Claim status: **"PAID"**
- [ ] Check provider balance increased

**State 2B: Reject (Alternative)**
- [ ] Click "❌ Reject"
- [ ] Enter rejection reason
- [ ] Confirm
- [ ] Claim status: **"REJECTED"**
- [ ] No payment sent

### Step 3: Verify Payment Received
- [ ] Switch to **Provider account (#2)**
- [ ] Check wallet balance increased by payout amount
- [ ] Navigate to claims list
- [ ] Verify claim status: **"PAID"**

---

## 🔒 Security Validations to Test

### Duplicate Claim Prevention
- [ ] Try submitting same medical report CID twice
- [ ] Should fail with "Medical report already used"

### Coverage Validation
- [ ] Try submitting claim > policy coverage amount
- [ ] Should fail with "Claim exceeds coverage"

### Policy Expiration
- [ ] Create policy with past endEpoch
- [ ] Try submitting claim
- [ ] Should fail with "Policy expired"

### Reentrancy Protection
- Manual testing not feasible, but contracts use `nonReentrant` on:
- [ ] `rejectPolicy()` (refunds)
- [ ] `approveAndPayClaim()` (payouts)

---

## 📊 Dashboard Verification

### Patient Dashboard
- [ ] Shows wallet connection status
- [ ] Shows KYC upload/status
- [ ] Lists patient's policies with statuses
- [ ] Shows claim history

### Provider Dashboard
- [ ] Shows approval status (Pending/Approved/Rejected)
- [ ] Lists submitted claims
- [ ] Can upload medical reports for claims

### Insurer Dashboard
- [ ] Pending providers list
- [ ] Pending policies list
- [ ] Pending claims list
- [ ] Under review claims list
- [ ] All with approve/reject actions

---

## 🐛 Known Issues & Manual Workarounds

### Issue: Hardhat Node Restarted
**Symptom:** Contracts not found, transactions fail
**Fix:**
1. Redeploy contracts: `npx hardhat run contracts/scripts/deploy.js --network localhost`
2. Update deployed.json with new addresses
3. Restart backend server (to load new addresses)
4. Reset MetaMask accounts (Settings → Advanced → Reset Account)

### Issue: MetaMask Nonce Errors
**Symptom:** "Transaction nonce too high"
**Fix:** Settings → Advanced → Reset Account (for affected account)

### Issue: Frontend Shows Wrong Contract Addresses
**Symptom:** API calls work but frontend transactions fail
**Fix:** Update contract addresses in frontend code (TODO: Document where)

### Issue: File Uploads Failing
**Symptom:** KYC/license upload returns error
**Fix:** Check Pinata JWT is valid in backend .env

---

## ✅ Complete Test Suite Summary

| Test Category | Tests | Status |
|---------------|-------|--------|
| Provider Approval | 3 | ⬜ Not Started |
| Policy Approval | 4 | ⬜ Not Started |
| Policy Rejection & Refund | 3 | ⬜ Not Started |
| Claim Submission | 3 | ⬜ Not Started |
| Claim Three-State Approval | 5 | ⬜ Not Started |
| Security Validations | 4 | ⬜ Not Started |
| Dashboard Functionality | 3 | ⬜ Not Started |

**Total Tests:** 25

---

## 📝 Testing Notes

Use this section to document any issues or observations during testing:

```
Date: ___________
Tester: ___________

Findings:
-
-
-
```
