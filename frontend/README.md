# ProjectY Frontend

Production-ready React + Vite + Tailwind CSS frontend for the ProjectY decentralized healthcare insurance system.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (requires backend running on http://localhost:4000)
npm run dev

# Open browser to http://localhost:5173
```

## 📋 Prerequisites

1. **Backend Running**: Make sure the ProjectY backend is running on `http://localhost:4000`
2. **Hardhat Node**: Local Ethereum node should be running
3. **Contracts Deployed**: Smart contracts should be deployed to the local network

## 🎯 Demo Flow (5-Minute Presentation)

Follow these steps to demonstrate the complete system:

### 1. **Provider Onboarding** (`/provider`)
- Click "🆕 Create DID" to generate provider DID
- Fill in provider address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Fill in name: `Dr. Sarah Chen Medical Practice`
- Upload `../demo/provider-license.jpg`
- Click "Onboard Provider"
- ✅ Note the Provider ID and VC CID

### 2. **Patient Dashboard** (`/patient`)
- Click "🆕 Create Patient DID"
- ✅ Note the patient DID and address
- Upload `../demo/patient-report.jpg`
- ✅ Note the file CID

### 3. **Issue Policy** (`/policy`) ⭐ NEW
- Select the provider you onboarded
- Beneficiary info auto-fills from patient dashboard
- Set coverage amount (default: 1 ETH = 1000000000000000000 wei)
- Set duration (default: 365 days)
- Click "Issue Policy"
- ✅ **Note the Policy ID** (you'll need this for claim submission)

### 4. **Submit Claim** (`/claim`)
- Form auto-fills with patient DID, document CID, and provider info
- Enter **Policy ID** from step 3
- Enter **Claim Amount**: `500000000000000000` (0.5 ETH)
- Click "Submit Claim"
- ✅ Watch VC verification succeed
- ✅ Note claim ID and transaction hash

### 5. **Insurer Dashboard** (`/insurer`)
- View submitted claim
- Click "👀 Review" → Updates to UnderReview
- Click "✅ Approve" → Updates to Approved
- Click "💰 Mark Paid" → Final status
- ✅ See real-time status updates

### 5. **Admin Debug** (`/admin`)
- View all system data
- Export JSON for providers, policies, claims
- Check system health

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── backend.js           # Complete API wrapper
│   ├── components/
│   │   ├── FileUpload.jsx       # Drag-drop file upload
│   │   ├── ResponseBox.jsx      # API response display
│   │   └── TxHashDisplay.jsx    # Transaction hash display
│   ├── pages/
│   │   ├── Home.jsx             # System dashboard
│   │   ├── ProviderOnboard.jsx  # Provider registration
│   │   ├── PatientDashboard.jsx # Patient identity & docs
│   │   ├── SubmitClaim.jsx      # Claim submission
│   │   ├── InsurerDashboard.jsx # Claim management
│   │   └── AdminDebug.jsx       # Debug panel
│   ├── styles/
│   │   └── globals.css          # Tailwind + custom styles
│   ├── App.jsx                  # Router & layout
│   └── main.jsx                 # Entry point
├── package.json
├── vite.config.js
├── tailwind.config.cjs
└── postcss.config.cjs
```

## 🎨 Features

### Core Functionality
- ✅ Complete demo flow coverage (Provider → Patient → Claim → Insurer)
- ✅ DID creation and management
- ✅ File uploads to IPFS via Pinata
- ✅ VC verification visualization
- ✅ Real-time claim status updates
- ✅ Transaction hash display with copy/view functions

### UI/UX
- ✅ Modern Tailwind CSS design with purple gradient theme
- ✅ Responsive layout (mobile & desktop)
- ✅ Loading states and spinners
- ✅ Success/error notifications
- ✅ Drag-and-drop file upload with preview
- ✅ Auto-fill from localStorage for demo convenience

### Developer Features
- ✅ React Query for data fetching and caching
- ✅ Optimistic UI updates
- ✅ Debug panel with JSON export
- ✅ Detailed verification error display
- ✅ Auto-refresh for claim dashboard

## 🔧 Tech Stack

- **React 18**: UI framework
- **Vite 5**: Build tool
- **Tailwind CSS 3**: Styling
- **React Router DOM 6**: Client-side routing
- **TanStack React Query 5**: Data fetching & caching
- **Ethers.js 6**: Ethereum interactions (future wallet integration)
- **Axios**: HTTP client

## 📱 API Integration

All API calls go through `src/api/backend.js`:

```javascript
import backend from './api/backend';

// Health check
const health = await backend.health();

// Create DID
const result = await backend.createDid('alias');

// Submit claim (with verbose debug)
const claim = await backend.submitClaim(claimData, true);
```

All responses follow this structure:
```javascript
{
  ok: true/false,
  data: {...},      // Response data
  error: {...},     // Error details if ok=false
  status: 200       // HTTP status code
}
```

## 🧪 Testing

```bash
# Run tests (Vitest)
npm test

# Run tests with UI
npm run test:ui
```

## 🎯 Common Issues

### Backend not connecting
- **Issue**: "Backend not responding"
- **Fix**: Ensure backend is running on `http://localhost:4000`
- **Check**: Visit http://localhost:4000/health

### CORS errors
- **Issue**: CORS policy blocking requests
- **Fix**: Vite proxy is configured - restart dev server
- **Verify**: Check `vite.config.js` proxy settings

### File upload fails
- **Issue**: "Failed to pin file to Pinata"
- **Fix**: Check backend `.env` has valid `PINATA_JWT`
- **Verify**: Test with `curl` from `demo-run.sh`

### DID creation fails
- **Issue**: "Identifier already exists"
- **Fix**: Each DID creation uses unique timestamp-based alias
- **Note**: This is expected if rapidly clicking "Create DID"

## 🎨 Customization

### Change theme colors
Edit `tailwind.config.cjs`:
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#YOUR_COLOR',
        // ...
      }
    }
  }
}
```

### Add new page
1. Create `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`:
```javascript
<Route path="/new" element={<NewPage />} />
```
3. Add navigation link in `Navigation` component

## 📊 Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Build output will be in `dist/` directory.

## 🔗 Related Documentation

- [Main README](../README.md) - Full project overview
- [Architecture](../architecture.md) - System design
- [API Docs](../API.md) - Backend API reference
- [Backend README](../backend/README.md) - Backend setup

## 🎬 Screenshots

*(Screenshots would go here in a real deployment)*

1. Home - System Status Dashboard
2. Provider Onboarding - DID Creation & File Upload
3. Submit Claim - VC Verification in Progress
4. Insurer Dashboard - Claim Management
5. Admin Debug - System Internals

---

**Status**: ✅ Production-ready for demo  
**Last Updated**: 2025-11-23  
**Demo Time**: ~5-10 minutes

