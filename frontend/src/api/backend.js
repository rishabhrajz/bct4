import axios from 'axios';

const API_BASE = '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to handle responses consistently
const handleResponse = async (promise) => {
    try {
        const response = await promise;
        return {
            ok: true,
            data: response.data,
            status: response.status,
        };
    } catch (error) {
        return {
            ok: false,
            error: error.response?.data || { message: error.message },
            status: error.response?.status || 500,
        };
    }
};

// API Methods
export const backend = {
    // Health check
    health: () => handleResponse(api.get('/health')),

    // DID Management
    createDid: (alias) => handleResponse(
        api.post('/did/create', { alias })
    ),

    // Provider endpoints
    providerOnboard: (formData) => handleResponse(
        api.post('/provider/onboard', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    ),

    listProviders: () => handleResponse(api.get('/provider/list')),

    // Policy endpoints
    issuePolicy: (policyData) => handleResponse(
        api.post('/policy/issue', policyData)
    ),

    listPolicies: () => handleResponse(api.get('/policy/list')),

    getPolicy: (policyId) => handleResponse(
        api.get(`/policy/${policyId}`)
    ),

    // File upload
    uploadFile: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return handleResponse(
            api.post('/file/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
        );
    },

    // Claim endpoints
    submitClaim: (claimData, verbose = false) => handleResponse(
        api.post(`/claim/submit${verbose ? '?verbose=true' : ''}`, claimData)
    ),

    updateClaimStatus: (claimId, status) => handleResponse(
        api.post('/claim/update-status', { claimId, status })
    ),

    listClaims: (params = {}) => handleResponse(
        api.get('/claim/list', { params })
    ),

    // Debug endpoints (development only)
    debugProviders: () => handleResponse(api.get('/debug/providers')),
    debugPolicies: () => handleResponse(api.get('/debug/policies')),
    debugClaims: () => handleResponse(api.get('/debug/claims')),
};

export default backend;
