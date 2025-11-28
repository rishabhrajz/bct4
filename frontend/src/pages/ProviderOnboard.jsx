import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { WalletConnect } from '../components/WalletConnect';
import { useWallet } from '../hooks/useWallet';

const API_BASE = 'http://localhost:4000';

export default function ProviderOnboard() {
    const { account, isConnected } = useWallet();
    const [providerDid, setProviderDid] = useState('');
    const [name, setName] = useState('');
    const [licenseFile, setLicenseFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Fetch provider status
    const { data: providers, refetch } = useQuery({
        queryKey: ['provider-status', account],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/provider/list`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.providers.filter(p =>
                p.providerAddress.toLowerCase() === account?.toLowerCase()
            );
        },
        enabled: !!account,
    });

    const myProvider = providers?.[0];

    const handleCreateDid = async () => {
        try {
            const res = await fetch(`${API_BASE}/did/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias: `provider-${Date.now()}` }),
            });

            if (!res.ok) throw new Error('Failed to create DID');

            const data = await res.json();
            setProviderDid(data.did);
            toast.success('DID created successfully');
        } catch (error) {
            toast.error(`Failed to create DID: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!licenseFile) {
            toast.error('Please upload license file');
            return;
        }

        setSubmitting(true);
        try {
            // Step 1: Upload license to IPFS first to get CID
            toast('Uploading license to IPFS...');
            const uploadFormData = new FormData();
            uploadFormData.append('file', licenseFile);

            const uploadRes = await fetch(`${API_BASE}/file/upload`, {
                method: 'POST',
                body: uploadFormData,
            });

            if (!uploadRes.ok) throw new Error('License upload failed');

            const uploadData = await uploadRes.json();
            const licenseCid = uploadData.fileCid;
            toast.success('✅ License uploaded to IPFS');

            // Step 2: Register provider on-chain using MetaMask
            toast('📝 Registering provider on blockchain...');

            // Import ethers from package
            const { ethers } = await import('ethers');

            if (!window.ethereum) {
                throw new Error('Please install MetaMask');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Import deployed contract address
            const contractsResponse = await fetch('/deployments/deployed.json');
            const deploymentData = await contractsResponse.json();

            const policyContract = new ethers.Contract(
                deploymentData.contracts.PolicyContract,
                [
                    'function requestProviderApproval(string memory did, string memory licenseCid) external'
                ],
                signer
            );

            const tx = await policyContract.requestProviderApproval(providerDid, licenseCid);
            toast('⏳ Waiting for blockchain confirmation...');
            await tx.wait();
            toast.success('✅ Provider registered on blockchain!');

            // Step 3: Submit to backend for database storage
            toast('💾 Saving to database...');
            const formData = new FormData();
            formData.append('file', licenseFile);
            formData.append('providerDid', providerDid);
            formData.append('providerAddress', account);
            formData.append('name', name);

            const res = await fetch(`${API_BASE}/provider/onboard`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Provider onboarding failed');

            const data = await res.json();
            toast.success('✅ Provider submitted for approval!');
            refetch();

            // Reset form
            setProviderDid('');
            setName('');
            setLicenseFile(null);
        } catch (error) {
            toast.error(`Onboarding failed: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-3xl font-bold mb-2">🏥 Provider Onboarding</h1>
                <p className="text-gray-600">Register as a healthcare provider</p>
            </div>

            <WalletConnect />

            {isConnected && (
                <>
                    {/* Show approval status if provider exists */}
                    {myProvider && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold mb-4">Provider Status</h2>

                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium">Name:</span>{' '}
                                    <span className="text-gray-700">{myProvider.name}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Status:</span>{' '}
                                    {myProvider.status === 'PENDING' && (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                            ⏳ Pending Approval
                                        </span>
                                    )}
                                    {myProvider.status === 'APPROVED' && (
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                            ✅ Approved
                                        </span>
                                    )}
                                    {myProvider.status === 'REJECTED' && (
                                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                            ❌ Rejected
                                        </span>
                                    )}
                                </div>

                                {myProvider.status === 'REJECTED' && myProvider.rejectionReason && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
                                        <p className="text-sm text-red-800">
                                            <span className="font-semibold">Rejection Reason:</span> {myProvider.rejectionReason}
                                        </p>
                                    </div>
                                )}

                                {myProvider.status === 'APPROVED' && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                                        <p className="text-green-800 font-semibold">You can now submit claims!</p>
                                        <a
                                            href="/claim"
                                            className="mt-2 inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                                        >
                                            Submit Claim
                                        </a>
                                    </div>
                                )}

                                {myProvider.licenseCid && (
                                    <div className="mt-3">
                                        <a
                                            href={`https://gateway.pinata.cloud/ipfs/${myProvider.licenseCid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            📄 View License Document
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Onboarding form (show if no provider or rejected) */}
                    {(!myProvider || myProvider.status === 'REJECTED') && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {myProvider?.status === 'REJECTED' ? 'Resubmit Application' : 'Submit Application'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* DID */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Provider DID
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={providerDid}
                                            onChange={(e) => setProviderDid(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                                            placeholder="did:ethr:localhost:0x..."
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateDid}
                                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg whitespace-nowrap"
                                        >
                                            Create DID
                                        </button>
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Provider Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        placeholder="Dr. Smith Medical Practice"
                                        required
                                    />
                                </div>

                                {/* License Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Medical License
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setLicenseFile(e.target.files[0])}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Upload your medical license document
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    Your application will be reviewed by the insurer. You'll be notified once approved.
                                </p>
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
