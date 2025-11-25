import { onboardProvider, listProviders } from '../services/provider-service.js';

/**
 * POST /provider/onboard
 * Onboard a new healthcare provider
 */
export async function handleProviderOnboard(req, res) {
    try {
        const { providerDid, providerAddress, name } = req.body;

        // Validate required fields
        if (!providerDid || !providerAddress || !name) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['providerDid', 'providerAddress', 'name']
            });
        }

        // Get license file if uploaded
        let licenseFile = null;
        let licenseFilename = null;

        if (req.file) {
            licenseFile = req.file.buffer;
            licenseFilename = req.file.originalname;
        }

        // Onboard provider
        const provider = await onboardProvider({
            providerDid,
            providerAddress,
            name,
            licenseFile,
            licenseFilename
        });

        // Return provider info (excluding sensitive JWT in production)
        const response = {
            success: true,
            provider: {
                id: provider.id,
                providerDid: provider.providerDid,
                providerAddress: provider.providerAddress,
                name: provider.name,
                vcCid: provider.vcCid,
                licenseCid: provider.licenseCid,
                licenseUrl: provider.licenseUrl,
                issuerDid: provider.issuerDid,
                issuedAt: provider.issuedAt
            }
        };

        // Include JWT in development mode
        if (process.env.NODE_ENV === 'development') {
            response.provider.jwt = provider.jwt;
        }

        res.status(201).json(response);
    } catch (error) {
        console.error('Provider onboard error:', error);
        res.status(500).json({
            error: 'Failed to onboard provider',
            message: error.message
        });
    }
}

/**
 * GET /provider/list
 * List all providers
 */
export async function handleListProviders(req, res) {
    try {
        const providers = await listProviders();

        // Map to response format (hide JWT)
        const response = providers.map(p => ({
            id: p.id,
            providerDid: p.providerDid,
            providerAddress: p.providerAddress,
            name: p.name,
            vcCid: p.vcCid,
            licenseCid: p.licenseCid,
            status: p.status,
            approvedAt: p.approvedAt,
            approvedBy: p.approvedBy,
            rejectionReason: p.rejectionReason,
            createdAt: p.createdAt
        }));

        res.json({
            success: true,
            providers: response,
            count: response.length
        });
    } catch (error) {
        console.error('List providers error:', error);
        res.status(500).json({
            error: 'Failed to list providers',
            message: error.message
        });
    }
}

export default {
    handleProviderOnboard,
    handleListProviders
};
