import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { WalletConnect } from '../components/WalletConnect';
import { useWallet } from '../hooks/useWallet';

const API_BASE = 'http://localhost:4000';

export default function PatientDashboard() {
    const { account, isConnected } = useWallet();
    const [kycFile, setKycFile] = useState(null);
    const [uploadingKyc, setUploadingKyc] = useState(false);
    const [patientDid, setPatientDid] = useState('');
    const [creatingDid, setCreatingDid] = useState(false);
    const [didRegistered, setDidRegistered] = useState(false);

    // Auto-generate DID from wallet address
    const generatedDid = account ? `did:ethr:localhost:${account}` : '';

    // Fetch KYC documents for connected wallet
    const { data: kycDocs, refetch: refetchKyc } = useQuery({
        queryKey: ['kyc', account],
        queryFn: async () => {
            if (!account) return [];
            const res = await fetch(`${API_BASE}/kyc/${account}`);
            if (!res.ok) throw new Error('Failed to fetch KYC');
            const data = await res.json();
            return data.documents;
        },
        enabled: !!account,
    });

    // Fetch policies for this patient
    const { data: policies } = useQuery({
        queryKey: ['policies', account],
        queryFn: async () => {
            if (!account) return [];
            const res = await fetch(`${API_BASE}/policy/list`);
            if (!res.ok) throw new Error('Failed to fetch policies');
            const data = await res.json();
            return data.policies.filter(p =>
                p.beneficiaryAddress.toLowerCase() === account.toLowerCase()
            );
        },
        enabled: !!account,
    });

    const handleCreateDid = async () => {
        if (!generatedDid) {
            toast.error('Connect wallet first');
            return;
        }

        setCreatingDid(true);
        try {
            const res = await fetch(`${API_BASE}/did/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    walletAddress: account,
                    did: generatedDid 
                }),
            });

            if (!res.ok) throw new Error('Failed to create DID');

            const data = await res.json();
            setPatientDid(data.did);
            setDidRegistered(true);
            toast.success('✅ DID registered successfully!');
            
            // Store in localStorage for later use
            localStorage.setItem('patientDid', data.did);
        } catch (error) {
            toast.error(`DID creation failed: ${error.message}`);
        } finally {
            setCreatingDid(false);
        }
    };

    const handleKycUpload = async () => {
        if (!kycFile) {
            toast.error('Please select a file');
            return;
        }

        setUploadingKyc(true);
        try {
            const formData = new FormData();
            formData.append('file', kycFile);
            formData.append('userAddress', account);
            formData.append('documentType', 'AADHAAR');

            const res = await fetch(`${API_BASE}/kyc/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('KYC upload failed');

            const data = await res.json();
            toast.success('✅ KYC document uploaded successfully!');
            setKycFile(null);
            refetchKyc();
        } catch (error) {
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploadingKyc(false);
        }
    };

    const getKycStatus = () => {
        if (!kycDocs || kycDocs.length === 0) return 'NOT_UPLOADED';
        const latest = kycDocs[0];
        return latest.status;
    };

    const kycStatus = getKycStatus();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-3xl font-bold mb-2">👤 Patient Dashboard</h1>
                <p className="text-gray-600">Manage your insurance policies and KYC verification</p>
            </div>

            {/* Wallet Connection */}
            <WalletConnect />

            {/* DID Section */}
            {isConnected && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">🆔 Your Digital Identity (DID)</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your DID
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={generatedDid}
                                    readOnly
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                />
                                <button
                                    onClick={handleCreateDid}
                                    disabled={creatingDid || didRegistered}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {creatingDid ? 'Registering...' : didRegistered ? '✅ Registered' : 'Register DID'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {didRegistered ? (
                                    <span className="text-green-600">✅ Your DID is registered on-chain</span>
                                ) : (
                                    'Click "Register DID" to register your identity on the blockchain'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* KYC Section */}
            {isConnected && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">📄 KYC Verification</h2>

                    {kycStatus === 'NOT_UPLOADED' && (
                        <div className="space-y-4">
                            <p className="text-gray-600">Upload your Aadhaar card for verification</p>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setKycFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {kycFile && (
                                <button
                                    onClick={handleKycUpload}
                                    disabled={uploadingKyc}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
                                >
                                    {uploadingKyc ? 'Uploading...' : 'Upload KYC Document'}
                                </button>
                            )}
                        </div>
                    )}

                    {kycStatus === 'PENDING' && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                            <p className="text-yellow-800">⏳ KYC verification pending</p>
                            <p className="text-sm text-yellow-600 mt-1">
                                Your document is under review. You'll be notified once verified.
                            </p>
                        </div>
                    )}

                    {kycStatus === 'VERIFIED' && (
                        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                            <p className="text-green-800 font-semibold">✅ KYC Verified</p>
                            <p className="text-sm text-green-600 mt-1">
                                You can now purchase insurance policies
                            </p>
                        </div>
                    )}

                    {kycStatus === 'REJECTED' && kycDocs?.[0] && (
                        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                            <p className="text-red-800 font-semibold">❌ KYC Rejected</p>
                            <p className="text-sm text-red-600 mt-1">
                                Reason: {kycDocs[0].rejectionReason || 'Not specified'}
                            </p>
                            <button
                                onClick={() => setKycFile(null)}
                                className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                            >
                                Upload New Document
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Policies Section */}
            {isConnected && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">📋 My Policies</h2>

                    {(!policies || policies.length === 0) && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-600 mb-4">No policies found</p>
                            {kycStatus === 'VERIFIED' && (
                                <a
                                    href="/policy"
                                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
                                >
                                    Purchase Policy
                                </a>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        {policies?.map((policy) => (
                            <div
                                key={policy.id}
                                className="border border-gray-200 rounded-lg p-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-lg">
                                            Policy #{policy.onchainPolicyId}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Coverage: {(parseInt(policy.coverageAmount) / 1e18).toFixed(2)} ETH
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Tier: {policy.tier}
                                        </p>
                                    </div>
                                    <div>
                                        {policy.status === 'PENDING' && (
                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                                Pending Approval
                                            </span>
                                        )}
                                        {policy.status === 'ACTIVE' && (
                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                                Active
                                            </span>
                                        )}
                                        {policy.status === 'REJECTED' && (
                                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
