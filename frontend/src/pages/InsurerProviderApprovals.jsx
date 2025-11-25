import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const API_BASE = 'http://localhost:4000';

export function InsurerProviderApprovals() {
    const queryClient = useQueryClient();
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(null);

    // Fetch pending providers
    const { data: pendingProviders, isLoading } = useQuery({
        queryKey: ['pending-providers'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/provider/pending`);
            if (!res.ok) throw new Error('Failed to fetch pending providers');
            const data = await res.json();
            return data.providers;
        },
        refetchInterval: 5000, // Poll every 5 seconds
    });

    // Approve provider mutation
    const approveMutation = useMutation({
        mutationFn: async (providerId) => {
            const res = await fetch(`${API_BASE}/provider/approve/${providerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurerAddress: '0xInsurer', // TODO: Get from wallet
                }),
            });
            if (!res.ok) throw new Error('Failed to approve provider');
            return res.json();
        },
        onSuccess: () => {
            toast.success('✅ Provider approved!');
            queryClient.invalidateQueries({ queryKey: ['pending-providers'] });
        },
        onError: (error) => {
            toast.error(`Failed to approve: ${error.message}`);
        },
    });

    // Reject provider mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ providerId, reason }) => {
            const res = await fetch(`${API_BASE}/provider/reject/${providerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason,
                    insurerAddress: '0xInsurer',
                }),
            });
            if (!res.ok) throw new Error('Failed to reject provider');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Provider rejected');
            setSelectedProvider(null);
            setRejectionReason('');
            queryClient.invalidateQueries({ queryKey: ['pending-providers'] });
        },
        onError: (error) => {
            toast.error(`Failed to reject: ${error.message}`);
        },
    });

    const handleApprove = (providerId) => {
        if (window.confirm('Approve this provider?')) {
            approveMutation.mutate(providerId);
        }
    };

    const handleReject = (provider) => {
        setSelectedProvider(provider);
    };

    const submitRejection = () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        rejectMutation.mutate({
            providerId: selectedProvider.id,
            reason: rejectionReason,
        });
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Provider Approvals</h1>
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">🏥 Provider Approvals</h1>

            {(!pendingProviders || pendingProviders.length === 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">No pending provider approvals</p>
                </div>
            )}

            <div className="grid gap-6">
                {pendingProviders?.map((provider) => (
                    <div
                        key={provider.id}
                        className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    {provider.name}
                                </h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <p>
                                        <span className="font-medium">DID:</span>{' '}
                                        <code className="bg-gray-100 px-2 py-1 rounded">{provider.providerDid}</code>
                                    </p>
                                    <p>
                                        <span className="font-medium">Address:</span>{' '}
                                        <code className="bg-gray-100 px-2 py-1 rounded">{provider.providerAddress}</code>
                                    </p>
                                    {provider.licenseCid && (
                                        <p>
                                            <span className="font-medium">License:</span>{' '}
                                            <a
                                                href={`https://gateway.pinata.cloud/ipfs/${provider.licenseCid}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                View on IPFS
                                            </a>
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        Submitted: {new Date(provider.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                                <button
                                    onClick={() => handleApprove(provider.id)}
                                    disabled={approveMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
                                >
                                    ✅ Approve
                                </button>
                                <button
                                    onClick={() => handleReject(provider)}
                                    disabled={rejectMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rejection Modal */}
            {selectedProvider && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">
                            Reject Provider: {selectedProvider.name}
                        </h3>
                        <textarea
                            className="w-full border border-gray-300 rounded p-3 mb-4"
                            rows="4"
                            placeholder="Enter rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={submitRejection}
                                disabled={rejectMutation.isPending}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium"
                            >
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedProvider(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default InsurerProviderApprovals;
