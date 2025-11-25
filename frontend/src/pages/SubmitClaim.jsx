import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '../api/backend';
import ResponseBox from '../components/ResponseBox';
import TxHashDisplay from '../components/TxHashDisplay';
import { useToast } from '../components/Toast';
import {
    validateAddress,
    validateDID,
    validateAmount,
    validateCID,
    validatePolicyId,
    formatError,
    weiToEth
} from '../utils/validation';

export default function SubmitClaim() {
    const [formData, setFormData] = useState({
        policyId: '',
        patientDid: '',
        patientAddress: '',
        fileCid: '',
        amount: '',
        providerDid: '',
        providerVcCid: '',
    });
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [errors, setErrors] = useState({});
    const { showToast, ToastComponent } = useToast();

    const { data: providersData } = useQuery({
        queryKey: ['providers'],
        queryFn: backend.listProviders,
    });

    useEffect(() => {
        const patientDid = localStorage.getItem('patientDid');
        const providerData = localStorage.getItem('providerData');

        if (patientDid) {
            const address = patientDid.match(/0x[a-fA-F0-9]{40}/)?.[0] || '';
            setFormData(prev => ({ ...prev, patientDid, patientAddress: address }));
        }

        // Removed auto-loading of fileCid - user should upload manually

        if (providerData) {
            try {
                const provider = JSON.parse(providerData);
                setFormData(prev => ({
                    ...prev,
                    providerDid: provider.providerDid || '',
                    providerVcCid: provider.vcCid || '',
                }));
            } catch (e) { }
        }
    }, []);

    const handleSelectProvider = (e) => {
        const provider = providersData?.data?.providers?.find(p => p.id === parseInt(e.target.value));
        if (provider) {
            setFormData(prev => ({
                ...prev,
                providerDid: provider.providerDid,
                providerVcCid: provider.vcCid,
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        newErrors.policyId = validatePolicyId(formData.policyId);
        newErrors.patientDid = validateDID(formData.patientDid);
        newErrors.patientAddress = validateAddress(formData.patientAddress);
        newErrors.fileCid = validateCID(formData.fileCid);
        newErrors.amount = validateAmount(formData.amount, 0);
        newErrors.providerDid = validateDID(formData.providerDid);
        newErrors.providerVcCid = validateCID(formData.providerVcCid);

        // Remove null errors
        Object.keys(newErrors).forEach(key => {
            if (!newErrors[key]) delete newErrors[key];
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            showToast('Please fix form errors before submitting', 'error');
            return;
        }

        setLoading(true);
        setResponse(null);
        setErrors({});

        const payload = {
            policyId: parseInt(formData.policyId),
            patientDid: formData.patientDid.trim(),
            patientAddress: formData.patientAddress.trim(),
            fileCid: formData.fileCid.trim(),
            amount: formData.amount.trim(),
            providerDid: formData.providerDid.trim(),
            providerVcCid: formData.providerVcCid.trim(),
        };

        const result = await backend.submitClaim(payload, true);
        setResponse(result);

        if (result.ok) {
            showToast('Claim submitted successfully!', 'success');
        } else {
            showToast(formatError(result.error), 'error');
        }

        setLoading(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {ToastComponent}
            <div className="card">
                <h1 className="text-3xl font-bold mb-2">💊 Submit Insurance Claim</h1>
                <p className="text-gray-600">Submit a claim with provider credential verification</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Select Provider */}
                    {providersData?.ok && (
                        <div>
                            <label className="label">Select Provider (Optional)</label>
                            <select
                                onChange={handleSelectProvider}
                                className="input-field"
                            >
                                <option value="">-- Manual Entry --</option>
                                {providersData.data.providers?.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.providerDid.slice(0, 20)}...)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Policy ID */}
                    <div>
                        <label className="label">Policy ID *</label>
                        <input
                            type="number"
                            value={formData.policyId}
                            onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                            className={`input-field ${errors.policyId ? 'border-red-500' : ''}`}
                            required
                        />
                        {errors.policyId && <p className="text-red-600 text-sm mt-1">{errors.policyId}</p>}
                    </div>

                    {/* Patient DID */}
                    <div>
                        <label className="label">Patient DID *</label>
                        <input
                            type="text"
                            value={formData.patientDid}
                            onChange={(e) => setFormData({ ...formData, patientDid: e.target.value })}
                            className="input-field"
                            placeholder="did:ethr:localhost:0x..."
                            required
                        />
                    </div>

                    {/* Patient Address */}
                    <div>
                        <label className="label">Patient Address *</label>
                        <input
                            type="text"
                            value={formData.patientAddress}
                            onChange={(e) => setFormData({ ...formData, patientAddress: e.target.value })}
                            className="input-field"
                            placeholder="0x..."
                            required
                        />
                    </div>

                    {/* Medical Report Upload */}
                    <div>
                        <label className="label">Medical Report *</label>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                try {
                                    showToast('Uploading medical report to IPFS...', 'info');
                                    const uploadFormData = new FormData();
                                    uploadFormData.append('file', file);

                                    const res = await fetch('http://localhost:4000/file/upload', {
                                        method: 'POST',
                                        body: uploadFormData,
                                    });

                                    if (!res.ok) {
                                        const errorData = await res.json().catch(() => ({}));
                                        throw new Error(errorData.error || 'Upload failed');
                                    }

                                    const data = await res.json();
                                    if (!data.fileCid) {
                                        throw new Error('No CID returned from upload');
                                    }

                                    console.log('✅ File uploaded, CID:', data.fileCid);
                                    setFormData(prev => ({ ...prev, fileCid: data.fileCid }));
                                    showToast('✅ Medical report uploaded successfully!', 'success');
                                } catch (error) {
                                    showToast(`Failed to upload: ${error.message}`, 'error');
                                    console.error('Upload error:', error);
                                }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {formData.fileCid && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-xs text-green-800">
                                    <span className="font-semibold">✅ Uploaded:</span>{' '}
                                    <code className="bg-green-100 px-1 rounded">{formData.fileCid}</code>
                                </p>
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${formData.fileCid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs"
                                >
                                    📄 View on IPFS
                                </a>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Upload medical report (image or PDF) - will be stored on IPFS
                        </p>
                    </div>

                    {/* Claim Amount (wei) */}
                    <div>
                        <label className="label">Claim Amount (wei) *</label>
                        <input
                            type="text"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="input-field"
                            placeholder="500000000000000000 (0.5 ETH)"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Example: 500000000000000000 = 0.5 ETH
                        </p>
                    </div>

                    {/* Provider DID */}
                    <div>
                        <label className="label">Provider DID *</label>
                        <input
                            type="text"
                            value={formData.providerDid}
                            onChange={(e) => setFormData({ ...formData, providerDid: e.target.value })}
                            className="input-field"
                            placeholder="did:ethr:localhost:0x..."
                            required
                        />
                    </div>

                    {/* Provider VC CID */}
                    <div>
                        <label className="label">Provider VC CID *</label>
                        <input
                            type="text"
                            value={formData.providerVcCid}
                            onChange={(e) => setFormData({ ...formData, providerVcCid: e.target.value })}
                            className="input-field"
                            placeholder="bafkre..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                Verifying & Submitting...
                            </span>
                        ) : (
                            '🚀 Submit Claim'
                        )}
                    </button>
                </form>
            </div>

            {response && <ResponseBox response={response} />}

            {response?.ok && response.data && (
                <div className="card bg-green-50 border-green-200">
                    <h3 className="font-bold text-green-900 mb-4">✅ Claim Submitted Successfully!</h3>
                    <div className="space-y-3">
                        <div>
                            <span className="font-semibold">Claim ID:</span>
                            <span className="ml-2 font-mono">{response.data.claimId}</span>
                        </div>
                        <div>
                            <span className="font-semibold">Status:</span>
                            <span className="ml-2 badge badge-info">{response.data.claim?.status}</span>
                        </div>
                        {response.data.txHash && (
                            <TxHashDisplay txHash={response.data.txHash} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
