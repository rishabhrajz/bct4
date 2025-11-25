# MetaMask Setup Guide for ProjectY

## Overview
This guide helps you set up MetaMask to work with the ProjectY demo on the Hardhat local network.

## Prerequisites
- MetaMask browser extension installed
- Hardhat node running on `localhost:8545`

## Step 1: Install MetaMask

If you don't have MetaMask installed:

1. Visit [metamask.io/download](https://metamask.io/download/)
2. Install the MetaMask extension for your browser
3. Complete the setup wizard
4. **Important:** Save your secret recovery phrase securely

## Step 2: Add Hardhat Local Network

### Automatic Method (Recommended)
1. Connect your wallet on any ProjectY page
2. Click "Switch to Hardhat Network" button
3. Approve the network addition in MetaMask

### Manual Method
1. Open MetaMask
2. Click on the network dropdown (top middle)
3. Click "Add Network" → "Add a network manually"
4. Enter the following details:
   - **Network Name:** `Hardhat Local`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
5. Click "Save"

## Step 3: Import Hardhat Test Accounts

Hardhat provides default test accounts with pre-funded ETH. Import these accounts to use in the demo:

### Account #0 (Default Deployer/Insurer)
```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Account #1 (Patient/User)
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### Account #2 (Provider)
```
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

### How to Import
1. Open MetaMask
2. Click account icon (top right) → "Import Account"
3. Paste one of the private keys above
4. Click "Import"
5. Repeat for other accounts as needed

## Step 4: Verify Setup

1. Switch to "Hardhat Local" network in MetaMask
2. Check that your imported accounts show **~10,000 ETH** balance
3. Connect wallet on any ProjectY page
4. You should see:
   - ✅ Wallet Connected
   - Network: Hardhat Local ✓
   - Balance: ~10000 ETH

## Test Flow Recommendations

### For Testing Patient Flow
- Use **Account #1** (0x7099...)
- This represents a patient buying insurance

### For Testing Provider Flow
- Use **Account #2** (0x3C44...)
- This represents a healthcare provider

### For Testing Insurer Actions
- Use **Account #0** (0xf39F...)
- This is the deployer account with insurer privileges

## Important Notes

⚠️ **Network Resets**
- If you restart the Hardhat node, all transactions are lost
- You may need to **reset MetaMask accounts**:
  1. Settings → Advanced → Clear activity tab data
  2. Or manually reset each account via Settings → Advanced → Reset Account

⚠️ **Security**
- **NEVER** use these private keys on mainnet or with real funds
- These are **test accounts only** for local development

⚠️ **Transaction Issues**
- If transactions fail with "nonce too high" error, reset your MetaMask account
- If you see fee warnings, ignore them - gas is free on local network

## Quick Reference

| Role | Account | Address (first 6 chars) |
|------|---------|-------------------------|
| Insurer | #0 | 0xf39F... |
| Patient | #1 | 0x7099... |
| Provider | #2 | 0x3C44... |

## Troubleshooting

### "Cannot connect to localhost:8545"
- Ensure Hardhat node is running: `npm run node` in project root

### "Wrong Network" warning
- Switch MetaMask to "Hardhat Local" network

### Transactions stuck "Pending"
- Hardhat node might have crashed
- Restart node and reset MetaMask accounts

### Balance shows 0 ETH
- Make sure you're on Hardhat Local network
- Confirm you imported the correct private key
- Try resetting the account in MetaMask settings

## Next Steps

After setup is complete:
1. ✅ Deploy contracts: `npm run deploy` (if not already deployed)
2. ✅ Start backend: `cd backend && npm run dev`
3. ✅ Start frontend: `cd frontend && npm run dev`
4. ✅ Begin testing flows according to the Testing Checklist
